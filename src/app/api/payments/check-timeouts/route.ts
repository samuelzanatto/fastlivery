import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createMercadoPagoService } from '@/lib/mercadopago'
import { getSocketIO } from '@/app/api/socket/route'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil'
})

// Configuração de timeout (em minutos)
const PAYMENT_TIMEOUT_MINUTES = parseInt(process.env.PAYMENT_TIMEOUT_MINUTES || '30', 10)
const PIX_TIMEOUT_MINUTES = parseInt(process.env.PIX_TIMEOUT_MINUTES || '30', 10)

interface PaymentTimeoutConfig {
  PIX: number
  CREDIT_CARD: number  
  DEBIT_CARD: number
  STRIPE: number
}

const PAYMENT_TIMEOUTS: PaymentTimeoutConfig = {
  PIX: PIX_TIMEOUT_MINUTES,
  CREDIT_CARD: PAYMENT_TIMEOUT_MINUTES,
  DEBIT_CARD: PAYMENT_TIMEOUT_MINUTES,
  STRIPE: PAYMENT_TIMEOUT_MINUTES
}

/**
 * Endpoint para verificar e cancelar pedidos com pagamento expirado
 * Deve ser chamado periodicamente por um job/cron
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar se a requisição tem uma chave API válida (para segurança)
    const apiKey = request.headers.get('x-api-key')
    const expectedApiKey = process.env.INTERNAL_API_KEY
    
    if (!expectedApiKey || apiKey !== expectedApiKey) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    console.log('[PAYMENT TIMEOUT] Iniciando verificação de pagamentos expirados...')

    const now = new Date()
    const results = {
      checked: 0,
      expired: 0,
      cancelled: 0,
      errors: 0
    }

    // Buscar pedidos pendentes que podem ter expirado
    const pendingOrders = await prisma.order.findMany({
      where: {
        paymentStatus: 'PENDING',
        status: {
          in: ['PENDING', 'CONFIRMED']
        },
        paymentMethod: {
          in: ['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'STRIPE']
        }
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            mercadoPagoAccessToken: true,
            mercadoPagoConfigured: true
          }
        },
        payments: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    console.log(`[PAYMENT TIMEOUT] Encontrados ${pendingOrders.length} pedidos pendentes para verificar`)
    results.checked = pendingOrders.length

    for (const order of pendingOrders) {
      try {
        const paymentMethod = order.paymentMethod!
        const timeoutMinutes = PAYMENT_TIMEOUTS[paymentMethod as keyof PaymentTimeoutConfig]
        const createdAt = new Date(order.createdAt)
        const timeoutAt = new Date(createdAt.getTime() + (timeoutMinutes * 60 * 1000))

        // Verificar se o pagamento expirou
        if (now >= timeoutAt) {
          console.log(`[PAYMENT TIMEOUT] Pedido ${order.orderNumber} expirou (${timeoutMinutes}min)`)
          results.expired++

          // Verificar se o pagamento foi aprovado no meio tempo
          let paymentApproved = false

          try {
            if (paymentMethod === 'PIX' || order.stripeSessionId?.startsWith('pref_')) {
              // Verificar no MercadoPago
              if (order.restaurant.mercadoPagoConfigured && order.restaurant.mercadoPagoAccessToken) {
                const mercadoPagoService = await createMercadoPagoService(order.restaurant.id)
                
                let paymentId = order.stripeSessionId
                if (paymentId?.startsWith('pref_')) {
                  // Buscar pagamento por external_reference
                  const payment = await mercadoPagoService.getPaymentById(order.orderNumber)
                  if (payment) {
                    paymentId = String(payment.id)
                  }
                }

                if (paymentId) {
                  const mpPayment = await mercadoPagoService.getPaymentById(paymentId)
                  if (mpPayment && mpPayment.status === 'approved') {
                    paymentApproved = true
                  }
                }
              }
            } else if (paymentMethod === 'STRIPE' && order.stripeSessionId) {
              // Verificar no Stripe
              const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId)
              if (session.payment_status === 'paid') {
                paymentApproved = true
              }
            }
          } catch (verifyError) {
            console.error(`[PAYMENT TIMEOUT] Erro ao verificar pagamento para ${order.orderNumber}:`, verifyError)
          }

          if (paymentApproved) {
            // Pagamento foi aprovado, atualizar status
            await prisma.order.update({
              where: { id: order.id },
              data: {
                paymentStatus: 'APPROVED',
                status: 'CONFIRMED',
                notes: `${order.notes || ''}\n[AUTO] Pagamento confirmado durante verificação de timeout`.trim()
              }
            })

            console.log(`[PAYMENT TIMEOUT] Pagamento de ${order.orderNumber} foi aprovado, status atualizado`)
          } else {
            // Pagamento realmente expirou, cancelar pedido
            const updatedOrder = await prisma.order.update({
              where: { id: order.id },
              data: {
                status: 'CANCELLED',
                paymentStatus: 'CANCELLED',
                notes: `${order.notes || ''}\n[AUTO] Cancelado por timeout de pagamento (${timeoutMinutes}min)`.trim()
              }
            })

            // Cancelar sessões/preferências se existirem
            try {
              if (paymentMethod === 'STRIPE' && order.stripeSessionId) {
                // Stripe - tentar cancelar session se ainda estiver aberta
                const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId)
                if (session.status === 'open') {
                  await stripe.checkout.sessions.expire(order.stripeSessionId)
                }
              }
            } catch (cancelError) {
              console.error(`[PAYMENT TIMEOUT] Erro ao cancelar sessão de pagamento para ${order.orderNumber}:`, cancelError)
            }

            // Atualizar registros de pagamento
            await prisma.payment.updateMany({
              where: { orderId: order.id },
              data: {
                status: 'CANCELLED',
                metadata: {
                  cancelled_by: 'auto_timeout',
                  timeout_minutes: timeoutMinutes,
                  cancelled_at: now.toISOString(),
                  original_created_at: order.createdAt.toISOString()
                }
              }
            })

            // Emitir evento Socket.IO
            try {
              const io = getSocketIO()
              if (io) {
                const orderEvent = {
                  order: {
                    id: updatedOrder.id,
                    orderNumber: updatedOrder.orderNumber,
                    customerName: updatedOrder.customerName,
                    total: updatedOrder.total,
                    status: updatedOrder.status,
                    paymentStatus: updatedOrder.paymentStatus
                  },
                  restaurantId: updatedOrder.restaurantId,
                  timestamp: now,
                  reason: `Timeout de pagamento (${timeoutMinutes} minutos)`
                }

                io.to(`restaurant-${updatedOrder.restaurantId}`).emit('order-timeout-cancelled', orderEvent)
              }
            } catch (socketError) {
              console.error(`[PAYMENT TIMEOUT] Erro ao emitir evento para ${order.orderNumber}:`, socketError)
            }

            results.cancelled++
            console.log(`[PAYMENT TIMEOUT] Pedido ${order.orderNumber} cancelado por timeout`)
          }
        }
      } catch (orderError) {
        console.error(`[PAYMENT TIMEOUT] Erro ao processar pedido ${order.orderNumber}:`, orderError)
        results.errors++
      }
    }

    console.log(`[PAYMENT TIMEOUT] Verificação concluída:`, results)

    return NextResponse.json({
      success: true,
      message: 'Verificação de timeout de pagamentos concluída',
      results,
      timestamp: now.toISOString()
    })

  } catch (error) {
    console.error('[PAYMENT TIMEOUT] Erro geral:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * Endpoint GET para verificar configurações de timeout
 */
export async function GET() {
  return NextResponse.json({
    timeouts: PAYMENT_TIMEOUTS,
    message: 'Configurações de timeout de pagamento'
  })
}