import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import { createMercadoPagoService } from '@/lib/payments/mercadopago'
import { normalizeMercadoPagoStatus } from '@/lib/payments/mp-status'
import { verifyMercadoPagoSignature } from '../../../../lib/security/webhook-signature'
import { secureLogger } from '@/lib/security/sanitize'

/*
Variáveis de ambiente suportadas para notification_url automática:

MERCADOPAGO_WEBHOOK_URL=https://seu-dominio.com   (prioridade)
NGROK_URL=https://your-ngrok-id.ngrok.io        (dev)
NEXT_PUBLIC_APP_URL=https://fallback-url.com     (fallback)

O serviço monta: <url>/api/webhooks/mercadopago se a URL for válida (http/https).
*/

// Webhook unificado (payment + fallback merchant_order se vier)
export async function POST(req: NextRequest) {
  try {
    // Ler corpo bruto primeiro para permitir cálculo HMAC
    const rawBody = await req.text()
    const contentType = req.headers.get('content-type') || ''
    let body: Record<string, unknown> = {}
    if (contentType.includes('application/json')) {
      try { body = JSON.parse(rawBody) } catch { body = {} }
    } else {
      body = { raw: rawBody }
    }

    interface RawBody {
      data?: { id?: string | number }
      resource?: string
      id?: string | number
      type?: string
      topic?: string
    }
    const raw = body as RawBody
    const paymentId = raw.data?.id || raw.id || raw.resource?.split('/')?.pop()
    const type = raw.type || raw.topic || 'unknown'

    // ===== Validação de assinatura real (flexível) =====
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || ''
    const signatureHeader = req.headers.get('x-signature') || ''
    const signatureIdHeader = req.headers.get('x-signature-id') || ''
    let signatureMeta: ReturnType<typeof verifyMercadoPagoSignature> | undefined
    if (secret) {
      signatureMeta = verifyMercadoPagoSignature({
        rawBody,
        headerValue: signatureHeader,
        fallbackHeaderValue: signatureIdHeader,
        secret
      })
      if (!signatureMeta.valid) {
        secureLogger.warn('MercadoPago invalid signature', { isValid: signatureMeta.valid })
        return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 })
      }
    }

    secureLogger.info('MercadoPago webhook received', { type, paymentId, signed: !!secret })

    if (!paymentId) {
      return NextResponse.json({ ignored: true, reason: 'Sem paymentId' })
    }

    // ===== Idempotência: registrar/checar evento =====
    let existingEvent = await prisma.webhookEvent.findUnique({
      where: { provider_externalId_eventType: { provider: 'mercadopago', externalId: String(paymentId), eventType: type } }
    })
    if (existingEvent) {
      return NextResponse.json({ success: true, duplicate: true })
    }
    existingEvent = await prisma.webhookEvent.create({
      data: {
        provider: 'mercadopago',
        externalId: String(paymentId),
        eventType: type,
        status: 'RECEIVED',
        signature: signatureMeta?.rawProvided || signatureHeader || signatureIdHeader || null,
        payload: JSON.parse(JSON.stringify(body))
      }
    })

    // Tentar localizar Payment existente primeiro por preferenceId
    const paymentIdStr = String(paymentId)
  const existingPayment = await prisma.payment.findUnique({ where: { preferenceId: paymentIdStr } })

    // Se existe, podemos inferir empresa
    let businessId = existingPayment?.businessId

    // Caso não tenhamos business ainda, tentar localizar order por stripeSessionId
    let order = await prisma.order.findFirst({ where: { stripeSessionId: paymentIdStr } })
    if (order && !businessId) businessId = order.businessId

    // Obter serviço MercadoPago com business (se não temos, tentativa final será após obter external_reference)
  let service: Awaited<ReturnType<typeof createMercadoPagoService>> | null = null
    if (businessId) {
      try { service = await createMercadoPagoService(businessId) } catch { /* ignorar por enquanto */ }
    }

    // Buscar dados do pagamento na API oficial
    if (!service) {
      // fallback: se não há business ainda, precisamos de um business padrão; abortamos se impossível
      if (!businessId) {
        secureLogger.warn('MercadoPago webhook missing businessId', { paymentId })
      }
      // tentativa: se não há service não abortamos ainda, seguiremos com dados locais
    }

    // Se não temos Payment local, não conseguimos external_reference ainda; tentar obter via service
  let mpPaymentRaw: { id: string; external_reference?: string; status?: string } | null = null
    if (service) {
      try {
        const apiPaymentResp = await service.getPaymentById(paymentIdStr) as unknown as { id?: number | string, external_reference?: string, status?: string }
        if (apiPaymentResp) {
          mpPaymentRaw = {
            id: String(apiPaymentResp.id ?? paymentIdStr),
            external_reference: apiPaymentResp.external_reference,
            status: apiPaymentResp.status
          }
        }
      } catch (e) { secureLogger.warn('MercadoPago API payment fetch failed', { error: e instanceof Error ? e.message : String(e) }) }
    }
    // fallback: se não veio via API mas já temos Payment local, usar dados locais
    if (!mpPaymentRaw && existingPayment) {
      mpPaymentRaw = { id: existingPayment.preferenceId, external_reference: existingPayment.externalReference, status: existingPayment.status.toLowerCase() }
    }
    if (!mpPaymentRaw) {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
    }

    // Tipagem parcial do objeto de pagamento
    interface MpPayment {
      id: number | string
      status?: string
      status_detail?: string
      external_reference?: string
    }
    const mpPayment: MpPayment = mpPaymentRaw as MpPayment
    if (!mpPayment) {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
    }

    const externalRef = mpPayment.external_reference
    if (!externalRef) {
      return NextResponse.json({ ignored: true, reason: 'Sem external_reference' })
    }

    if (!order) {
      order = await prisma.order.findUnique({ where: { orderNumber: externalRef } })
    }

    // Vincular Payment ainda não vinculado ao pedido (se existir) depois que descobrimos externalRef e order
    if (order && existingPayment && !existingPayment.orderId) {
      await prisma.payment.update({ where: { id: existingPayment.id }, data: { orderId: order.id, businessId: order.businessId } })
    }

    if (!order) {
      // Persistir/atualizar Payment órfão para reconciliação futura
      if (!existingPayment) {
        await prisma.payment.create({
          data: {
            preferenceId: paymentIdStr,
            externalReference: externalRef,
            status: 'PENDING',
            amount: 0,
            type: 'UNKNOWN',
            businessId: businessId || 'UNKNOWN',
            metadata: { orphan: true, receivedAt: new Date().toISOString() }
          }
        })
      }
      return NextResponse.json({ ignored: true, reason: 'Pedido não encontrado (payment órfão registrado)' })
    }

    if (!businessId) businessId = order.businessId
    if (!service && businessId) {
      try { service = await createMercadoPagoService(businessId) } catch (e) { secureLogger.error('MercadoPago service creation failed', { businessId, error: e instanceof Error ? e.message : String(e) }) }
    }

  const status = mpPayment.status || 'pending'
  const statusDetail = mpPayment.status_detail
  const normalized = normalizeMercadoPagoStatus(status, statusDetail)
  const paymentStatus = normalized.paymentStatus
  const orderStatus = normalized.orderStatus || 'PENDING'

    const updated = await prisma.$transaction(async tx => {
      const updOrder = await tx.order.update({
        where: { id: order!.id },
        data: {
          paymentStatus,
          status: orderStatus === 'CONFIRMED' ? 'CONFIRMED' : order!.status,
          notes: statusDetail ? `${order!.notes || ''}\n[MP] ${status}/${statusDetail}`.trim() : order!.notes
        },
        select: { 
          id: true, 
          orderNumber: true, 
          status: true, 
          paymentStatus: true,
          businessId: true,
          paymentMethod: true
        }
      })

      // Upsert Payment sincronizado
      await tx.payment.upsert({
        where: { preferenceId: paymentIdStr },
        update: {
          status: paymentStatus,
          orderId: updOrder.id,
          businessId: updOrder.businessId,
          externalReference: externalRef,
          metadata: { last_webhook_status: status, last_webhook_status_detail: statusDetail || null, synced_at: new Date().toISOString() }
        },
        create: {
          preferenceId: paymentIdStr,
            externalReference: externalRef,
            status: paymentStatus,
            amount: 0,
            type: 'UNKNOWN',
            businessId: updOrder.businessId,
            orderId: updOrder.id,
            metadata: { created_from: 'webhook_upsert', original_status: status, original_status_detail: statusDetail || null }
        }
      })
      await tx.webhookEvent.update({
        where: { id: existingEvent!.id },
        data: { status: paymentStatus }
      })
      return updOrder
    })

    // Pagamento atualizado - o hook unificado detectará via postgres_changes
    secureLogger.info('MercadoPago payment updated', { 
      paymentId, 
      orderNumber: updated.orderNumber, 
      paymentStatus 
    })

    // Sincronização de payment já realizada dentro da transação

    secureLogger.info('MercadoPago webhook processed', { 
      orderId: updated.id,
      status: updated.status,
      paymentStatus: updated.paymentStatus 
    })

    // Emitir evento WebSocket para atualização em tempo real - REMOVIDO
    // Funcionalidade WebSocket foi removida do projeto

    return NextResponse.json({ success: true })
  } catch (e) {
    secureLogger.error('MercadoPago webhook error', { error: e instanceof Error ? e.message : String(e) })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  return NextResponse.json({ ok: true, echo: Object.fromEntries(searchParams.entries()) })
}
