import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import { createMercadoPagoService } from '@/lib/payments/mercadopago'
import { normalizeMercadoPagoStatus } from '@/lib/payments/mp-status'

// Endpoint de reconciliação manual
// Uso: POST /api/payments/mercadopago/reconcile { orderNumber?: string, paymentId?: string }
// Estratégia:
// - Localiza order e/ou payment
// - Reconsulta status via API MP
// - Aplica transação Order + Payment (idempotente)
// - Retorna before/after

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-internal-token')
    const expected = process.env.INTERNAL_ADMIN_TOKEN
    if (!expected || authHeader !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await req.json().catch(() => ({})) as { orderNumber?: string; paymentId?: string }
    const { orderNumber, paymentId } = body

    if (!orderNumber && !paymentId) {
      return NextResponse.json({ error: 'Informe orderNumber ou paymentId' }, { status: 400 })
    }

    // Carregar order se fornecido
    let order = orderNumber ? await prisma.order.findUnique({ where: { orderNumber } }) : null
    let payment = paymentId ? await prisma.payment.findUnique({ where: { preferenceId: paymentId } }) : null

    if (!order && payment && payment.externalReference) {
      order = await prisma.order.findUnique({ where: { orderNumber: payment.externalReference } })
    }
    if (!payment && order) {
      payment = await prisma.payment.findFirst({ where: { OR: [ { orderId: order.id }, { externalReference: order.orderNumber } ] } })
    }

    if (!order && !payment) {
      return NextResponse.json({ error: 'Nenhum registro encontrado' }, { status: 404 })
    }

    if (!order && payment) {
      return NextResponse.json({ warning: 'Payment órfão - sem pedido vinculado', payment })
    }
    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    // Precisamos de businessId para criar service
    const businessId = order.businessId || payment?.businessId
    if (!businessId) {
      return NextResponse.json({ error: 'BusinessId não encontrado para reconciliação' }, { status: 400 })
    }

    let service
    try { service = await createMercadoPagoService(businessId) } catch (e) {
      console.error('[reconcile] Falha criar service', e)
      return NextResponse.json({ error: 'Falha credenciais Mercado Pago' }, { status: 500 })
    }

    const providerId = paymentId || payment?.preferenceId || order.stripeSessionId
    if (!providerId) {
      return NextResponse.json({ error: 'Não há paymentId/providerId associado' }, { status: 400 })
    }

  interface MpPaymentPartial { id?: string | number; status?: string; status_detail?: string; transaction_amount?: number; payment_type_id?: string }
  const mp = await service.getPaymentById(String(providerId)) as MpPaymentPartial
    if (!mp) {
      return NextResponse.json({ error: 'Pagamento não encontrado na API Mercado Pago' }, { status: 404 })
    }

    const normalized = normalizeMercadoPagoStatus(mp.status, mp.status_detail)
    const before = { orderStatus: order.status, paymentStatus: payment?.status }

    const result = await prisma.$transaction(async tx => {
      // Upsert payment
      const upserted = await tx.payment.upsert({
        where: { preferenceId: String(mp.id) },
        update: {
          status: normalized.paymentStatus,
          externalReference: order!.orderNumber,
          orderId: order!.id,
          businessId,
          metadata: {
            reconciled_at: new Date().toISOString(),
            mp_status: mp.status,
            mp_status_detail: mp.status_detail
          }
        },
        create: {
          preferenceId: String(mp.id),
            externalReference: order!.orderNumber,
            status: normalized.paymentStatus,
            amount: mp.transaction_amount || 0,
            type: (mp.payment_type_id || 'UNKNOWN').toUpperCase(),
            businessId,
            orderId: order!.id,
            metadata: {
              reconciled_at: new Date().toISOString(),
              mp_status: mp.status,
              mp_status_detail: mp.status_detail
            }
        }
      })

      const updOrder = await tx.order.update({
        where: { id: order!.id },
        data: {
          paymentStatus: normalized.paymentStatus,
          status: normalized.orderStatus === 'CONFIRMED' ? 'CONFIRMED' : order!.status
        },
        select: { id: true, orderNumber: true, status: true, paymentStatus: true }
      })

      return { upserted, updOrder }
    })

    const after = { orderStatus: result.updOrder.status, paymentStatus: result.upserted.status }
    return NextResponse.json({ success: true, providerId, normalized, before, after })
  } catch (e) {
    console.error('[reconcile] Erro', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
