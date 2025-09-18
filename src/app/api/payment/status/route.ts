import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createMercadoPagoService } from '@/lib/mercadopago'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('paymentId')
    const orderNumber = searchParams.get('orderNumber')

    if (!paymentId && !orderNumber) {
      return NextResponse.json(
        { error: 'paymentId ou orderNumber é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar pedido
    let order
    if (orderNumber) {
      order = await prisma.order.findUnique({
        where: { orderNumber },
        include: { payments: true }
      })
    } else if (paymentId) {
      order = await prisma.order.findFirst({
        where: { stripeSessionId: paymentId },
        include: { payments: true }
      })
    }

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    // Buscar status real no Mercado Pago
    let mpStatus = null
    let mpStatusDetail = null
    
    try {
      const service = await createMercadoPagoService(order.restaurantId)
      const mpPaymentId = paymentId || order.stripeSessionId
      
      if (mpPaymentId) {
        const mpPayment = await service.getPaymentById(mpPaymentId)
        if (mpPayment) {
          mpStatus = mpPayment.status
          mpStatusDetail = mpPayment.status_detail
        }
      }
    } catch (mpError) {
      console.error('Erro ao consultar status no MP:', mpError)
    }

    // Status mapeado interno
    let internalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' = 'PENDING'
    if (mpStatus === 'approved') internalStatus = 'APPROVED'
    else if (mpStatus === 'rejected') internalStatus = 'REJECTED'
    else if (mpStatus === 'cancelled' || mpStatus === 'canceled') internalStatus = 'CANCELLED'

    const response = {
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        createdAt: order.createdAt
      },
      mercadoPago: {
        paymentId: paymentId || order.stripeSessionId,
        status: mpStatus,
        statusDetail: mpStatusDetail,
        internalStatus
      },
      payments: order.payments.map(p => ({
        id: p.id,
        preferenceId: p.preferenceId,
        status: p.status,
        amount: p.amount,
        type: p.type
      }))
    }

    // Se status mudou, atualizar automaticamente
    if (internalStatus !== order.paymentStatus && mpStatus) {
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: internalStatus,
            status: internalStatus === 'APPROVED' ? 'CONFIRMED' : order.status,
            notes: `${order.notes || ''}\n[Auto] Status MP: ${mpStatus}/${mpStatusDetail || ''}`.trim()
          }
        })

        // Atualizar Payment também
        if (order.payments.length > 0) {
          await prisma.payment.updateMany({
            where: { externalReference: order.orderNumber },
            data: { status: internalStatus }
          })
        }

        response.order.paymentStatus = internalStatus
        if (internalStatus === 'APPROVED') {
          response.order.status = 'CONFIRMED'
        }
      } catch (updateError) {
        console.error('Erro ao atualizar status:', updateError)
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Erro na consulta de status:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
