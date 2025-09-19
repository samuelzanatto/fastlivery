import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRestaurantStatus } from '@/lib/restaurant-hours'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const restaurant = await prisma.restaurant.findFirst({
      where: { slug },
      select: {
        id: true,
        name: true,
        isOpen: true,
        openingHours: true,
        acceptsDelivery: true,
        acceptsPickup: true,
        acceptsDineIn: true
      }
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      )
    }

    const status = getRestaurantStatus(restaurant.isOpen, restaurant.openingHours)
    
    // Determinar se pode aceitar pedidos baseado no status e serviços disponíveis
    const canAcceptOrders = status.isCurrentlyOpen && (
      restaurant.acceptsDelivery || 
      restaurant.acceptsPickup || 
      restaurant.acceptsDineIn
    )

    return NextResponse.json({
      restaurantId: restaurant.id,
      name: restaurant.name,
      isOpen: status.isCurrentlyOpen,
      canAcceptOrders,
      message: status.message,
      services: {
        delivery: restaurant.acceptsDelivery,
        pickup: restaurant.acceptsPickup,
        dineIn: restaurant.acceptsDineIn
      }
    })

  } catch (error) {
    console.error('Erro ao verificar status do restaurante:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}