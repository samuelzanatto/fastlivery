import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createMercadoPagoService } from '@/lib/mercadopago'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil'
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { reason } = await request.json()
    const orderId = id

    // Buscar pedido com dados de pagamento
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            mercadoPagoAccessToken: true,
            mercadoPagoConfigured: true
          }
        },
        payments: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    // Verificar se o usuário tem permissão para cancelar este pedido
    if (order.restaurant.ownerId !== sessionResponse.user.id) {
      return NextResponse.json({ error: 'Sem permissão para cancelar este pedido' }, { status: 403 })
    }

    // Verificar se o pedido pode ser cancelado
    if (order.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Pedido já está cancelado' }, { status: 400 })
    }

    if (order.status === 'DELIVERED') {
      return NextResponse.json({ error: 'Não é possível cancelar pedido já entregue' }, { status: 400 })
    }

    // Processar reembolso se pagamento foi aprovado
    let refundResult = null
    if (order.paymentStatus === 'APPROVED' && order.paymentMethod !== 'MONEY') {
      try {
        if (order.paymentMethod === 'PIX' || order.stripeSessionId?.startsWith('pref_')) {
          // MercadoPago - buscar payment ID
          const mercadoPagoService = await createMercadoPagoService(order.restaurant.id)
          
          // Buscar payment pelo external_reference ou stripeSessionId
          let paymentId = order.stripeSessionId
          
          // Se começar com "pref_", é uma preferência do Checkout Pro
          if (paymentId?.startsWith('pref_')) {
            // Buscar pagamento associado à preferência
            const payment = order.payments.find(p => p.status === 'APPROVED')
            if (payment?.preferenceId) {
              // Buscar o pagamento no MercadoPago
              const mpPayment = await mercadoPagoService.getPaymentById(payment.preferenceId)
              if (mpPayment) {
                paymentId = String(mpPayment.id)
              }
            }
          }

          if (paymentId) {
            console.log('Processando reembolso MercadoPago:', { paymentId, orderNumber: order.orderNumber })
            refundResult = await mercadoPagoService.createRefund(paymentId, order.total)
            
            // Atualizar registro de Payment
            await prisma.payment.updateMany({
              where: { orderId: order.id },
              data: {
                status: 'CANCELLED',
                metadata: {
                  refund_id: refundResult.id,
                  refund_status: refundResult.status,
                  refund_amount: refundResult.amount,
                  cancelled_at: new Date().toISOString(),
                  cancel_reason: reason || 'Cancelado pelo restaurante'
                }
              }
            })
          }
        } else if (order.stripeSessionId) {
          // Stripe - processar reembolso
          console.log('Processando reembolso Stripe:', { sessionId: order.stripeSessionId, orderNumber: order.orderNumber })
          
          // Buscar session e payment intent
          const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId)
          if (session.payment_intent && typeof session.payment_intent === 'string') {
            refundResult = await stripe.refunds.create({
              payment_intent: session.payment_intent,
              amount: Math.round(order.total * 100), // Stripe usa centavos
              reason: 'requested_by_customer',
              metadata: {
                order_id: order.id,
                order_number: order.orderNumber,
                cancel_reason: reason || 'Cancelado pelo restaurante'
              }
            })
          }
        }
      } catch (refundError) {
        console.error('Erro ao processar reembolso:', refundError)
        // Continue com o cancelamento mesmo se o reembolso falhar
        // O reembolso pode ser processado manualmente depois
      }
    }

    // Cancelar o pedido
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        paymentStatus: order.paymentStatus === 'APPROVED' ? 'CANCELLED' : order.paymentStatus,
        notes: reason ? 
          `${order.notes || ''}\n[CANCELADO] ${reason}`.trim() : 
          `${order.notes || ''}\n[CANCELADO] Cancelado pelo restaurante`.trim()
      },
      include: {
        items: {
          include: {
            product: { select: { name: true } }
          }
        }
      }
    })

    // TODO: Emitir evento Socket.IO
    // Emitir evento WebSocket para cancelamento removido - funcionalidade WebSocket foi removida do projeto

    return NextResponse.json({
      message: 'Pedido cancelado com sucesso',
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus
      },
      refund: refundResult ? {
        id: refundResult.id,
        status: refundResult.status,
        amount: refundResult.amount,
        message: 'Reembolso processado automaticamente'
      } : order.paymentMethod === 'MONEY' ? {
        message: 'Pagamento em dinheiro - sem necessidade de reembolso automático'
      } : null
    })

  } catch (error) {
    console.error('Erro ao cancelar pedido:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}