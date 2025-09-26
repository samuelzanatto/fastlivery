import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import { getBusinessStatus } from '@/lib/utils/business-hours'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const business = await prisma.business.findFirst({
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

    if (!business) {
      return NextResponse.json(
        { error: 'Negócio não encontrado' },
        { status: 404 }
      )
    }

    const status = getBusinessStatus(business.isOpen, business.openingHours)
    
    // Determinar se pode aceitar pedidos baseado no status e serviços disponíveis
    const canAcceptOrders = status.isCurrentlyOpen && (
      business.acceptsDelivery || 
      business.acceptsPickup || 
      business.acceptsDineIn
    )

    return NextResponse.json({
      businessId: business.id,
      name: business.name,
      isOpen: status.isCurrentlyOpen,
      canAcceptOrders,
      message: status.message,
      services: {
        delivery: business.acceptsDelivery,
        pickup: business.acceptsPickup,
        dineIn: business.acceptsDineIn
      }
    })

  } catch (error) {
    console.error('Erro ao verificar status da empresa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}