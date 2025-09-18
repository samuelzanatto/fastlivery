import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Simula aprovação de um pagamento PIX em ambiente de desenvolvimento.
 * Uso: POST /api/pix/simulate-paid { orderNumber: string }
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Endpoint disponível apenas em desenvolvimento' }, { status: 403 })
  }

  try {
    const { orderNumber } = await req.json()
    if (!orderNumber) {
      return NextResponse.json({ error: 'orderNumber é obrigatório' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({ where: { orderNumber } })
    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    if (order.paymentMethod !== 'PIX') {
      return NextResponse.json({ error: 'Pedido não é PIX' }, { status: 400 })
    }

    // Atualiza pedido como pago
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'APPROVED',
        status: 'CONFIRMED'
      },
      select: { id: true, orderNumber: true, status: true, paymentStatus: true }
    })

    return NextResponse.json({ success: true, order: updated })
  } catch (e) {
    console.error('Erro simular PIX pago:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
