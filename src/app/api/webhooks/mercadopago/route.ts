import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createMercadoPagoService } from '@/lib/mercadopago'

/*
Variáveis de ambiente suportadas para notification_url automática:

MERCADOPAGO_WEBHOOK_URL=https://seu-dominio.com   (prioridade)
NGROK_URL=https://abc123.ngrok.io                (dev)
NEXT_PUBLIC_APP_URL=https://fallback-url.com     (fallback)

O serviço monta: <url>/api/webhooks/mercadopago se a URL for válida (http/https).
*/

// Webhook unificado (payment + fallback merchant_order se vier)
export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown> = {}
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      body = await req.json().catch(() => ({} as Record<string, unknown>))
    } else {
      body = { raw: await req.text() }
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
    const type = raw.type || raw.topic

    console.log('[Webhook MP] Recebido:', { type, paymentId })

    if (!paymentId) {
      return NextResponse.json({ ignored: true, reason: 'Sem paymentId' })
    }

    // Primeiro tentamos descobrir external_reference usando busca de pedido por stripeSessionId (paymentId)
    let order = await prisma.order.findFirst({ where: { stripeSessionId: paymentId.toString() } })

    // Se ainda não temos o pedido, tentaremos depois via external_reference do pagamento
    // Para recuperar pagamento precisamos de uma credencial; usamos credencial genérica (sem restaurante) via createMercadoPagoService(order?.restaurantId)
  const service = await createMercadoPagoService(order?.restaurantId || '')
  const mpPaymentRaw = await service.getPaymentById(String(paymentId))
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
    if (!order) {
      return NextResponse.json({ ignored: true, reason: 'Pedido não encontrado' })
    }

    const status = mpPayment.status || 'pending'
    const statusDetail = mpPayment.status_detail

    let paymentStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' = 'PENDING'
    let orderStatus: 'PENDING' | 'CONFIRMED' | 'CANCELLED' = 'PENDING'
    if (status === 'approved') { paymentStatus = 'APPROVED'; orderStatus = 'CONFIRMED' }
    else if (status === 'rejected' || status === 'cancelled') { paymentStatus = status === 'rejected' ? 'REJECTED' : 'CANCELLED'; orderStatus = 'CANCELLED' }
    else if (status === 'refunded' || status === 'charged_back') { paymentStatus = 'CANCELLED'; orderStatus = 'CANCELLED' }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus,
        status: orderStatus === 'CONFIRMED' ? 'CONFIRMED' : order.status,
        notes: statusDetail ? `${order.notes || ''}\n[MP] ${status}/${statusDetail}`.trim() : order.notes
      },
      select: { id: true, orderNumber: true, status: true, paymentStatus: true }
    })

    // Atualizar também registro Payment (se existir)
    try {
      const paymentIdStr = String(paymentId)
      const paymentRecord = await prisma.payment.findUnique({ where: { preferenceId: paymentIdStr } })
      if (paymentRecord) {
        const existingMeta: Record<string, unknown> = (paymentRecord.metadata as object | null) ? { ...(paymentRecord.metadata as Record<string, unknown>) } : {}
        await prisma.payment.update({
          where: { id: paymentRecord.id },
          data: {
            status: paymentStatus,
            metadata: {
              ...existingMeta,
              last_webhook_status: status,
              last_webhook_status_detail: statusDetail || null,
              updated_at: new Date().toISOString()
            }
          }
        })
      } else {
        // Caso não exista (fallback), criar para manter histórico
        await prisma.payment.create({
          data: {
            preferenceId: paymentIdStr,
            externalReference: externalRef,
            status: paymentStatus,
            amount: order.total || 0,
            type: 'UNKNOWN',
            restaurantId: order.restaurantId,
            metadata: {
              source: 'webhook_fallback_create',
              original_status: status,
              original_status_detail: statusDetail || null
            }
          }
        })
      }
    } catch (paymentSyncErr) {
      console.error('[Webhook MP] Falha ao sincronizar Payment:', paymentSyncErr)
    }

    console.log('[Webhook MP] Atualizado:', updated)

    // TODO: Emitir evento socket se status mudou
    // Emitir evento WebSocket para atualização em tempo real
    try {
      const { emitWebSocketEvent } = await import('@/lib/socket')
      
      if (paymentStatus === 'APPROVED' || paymentStatus === 'REJECTED' || paymentStatus === 'CANCELLED') {
        await emitWebSocketEvent('payment-update', {
          paymentId: String(paymentId),
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: paymentStatus,
          restaurantId: order.restaurantId,
          message: `Pagamento ${paymentStatus === 'APPROVED' ? 'aprovado' : paymentStatus === 'REJECTED' ? 'rejeitado' : 'cancelado'}`,
          timestamp: new Date()
        })
      }
    } catch (socketError) {
      console.error('[Webhook MP] Erro ao emitir WebSocket:', socketError)
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[Webhook MP] Erro:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  return NextResponse.json({ ok: true, echo: Object.fromEntries(searchParams.entries()) })
}
