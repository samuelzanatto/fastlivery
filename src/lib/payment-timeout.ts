import { prisma } from '@/lib/prisma'

const PAYMENT_TIMEOUT_MINUTES = 30

export async function checkExpiredPayments() {
  const timeoutDate = new Date(Date.now() - PAYMENT_TIMEOUT_MINUTES * 60 * 1000)
  
  try {
    // Buscar pedidos pendentes há mais de 30 minutos
    const expiredOrders = await prisma.order.findMany({
      where: {
        paymentStatus: 'PENDING',
        createdAt: {
          lt: timeoutDate
        },
        status: {
          not: 'CANCELLED'
        }
      },
      include: {
        payments: true
      }
    })

    console.log(`Encontrados ${expiredOrders.length} pedidos expirados`)

    for (const order of expiredOrders) {
      // Marcar como cancelado por timeout
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'CANCELLED',
          notes: `${order.notes || ''}\n[AUTO] Cancelado por timeout (${PAYMENT_TIMEOUT_MINUTES}min)`.trim()
        }
      })

      // Atualizar Payment registros relacionados
      await prisma.payment.updateMany({
        where: { 
          externalReference: order.orderNumber 
        },
        data: { 
          status: 'CANCELLED'
        }
      })

      console.log(`Pedido ${order.orderNumber} cancelado por timeout`)
    }

    return expiredOrders.length
  } catch (error) {
    console.error('Erro ao verificar pedidos expirados:', error)
    return 0
  }
}

export async function startPaymentTimeoutChecker() {
  // Executar a cada 10 minutos
  setInterval(async () => {
    await checkExpiredPayments()
  }, 10 * 60 * 1000)
  
  // Executar uma vez no início
  await checkExpiredPayments()
}
