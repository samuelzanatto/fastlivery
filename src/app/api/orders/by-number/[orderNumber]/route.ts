import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params

    if (!orderNumber) {
      return NextResponse.json(
        { error: 'Número do pedido é obrigatório' },
        { status: 400 }
      )
    }

    const order = await prisma.order.findFirst({
      where: {
        orderNumber: orderNumber
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                image: true
              }
            }
          }
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    // Formatar resposta
    const formattedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      type: order.type,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      total: order.total,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes,
        product: item.product ? {
          id: item.product.id,
          name: item.product.name,
          description: item.product.description,
          image: item.product.image
        } : null
      })),
      restaurant: {
        id: order.restaurant.id,
        name: order.restaurant.name,
        phone: order.restaurant.phone,
        email: order.restaurant.email
      }
    }

    return NextResponse.json(formattedOrder)

  } catch (error) {
    console.error('Erro ao buscar pedido por número:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
