import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/payments/status?order=<orderNumber>
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orderNumber = searchParams.get('order')
    if (!orderNumber) {
      return NextResponse.json({ error: 'Parâmetro order obrigatório' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        stripeSessionId: true,
        restaurantId: true,
        payments: { select: { id: true, preferenceId: true, status: true, createdAt: true, type: true } }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    // Selecionar último pagamento (por createdAt)
    const lastPayment = [...order.payments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus
      },
      payment: lastPayment ? {
        id: lastPayment.id,
        gatewayId: lastPayment.preferenceId,
        status: lastPayment.status,
        type: lastPayment.type
      } : null
    })
  } catch (e) {
    console.error('Erro GET /api/payments/status:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
