import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import SubscriptionService from '@/lib/subscription-service'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Verificar sessão do usuário
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Buscar restaurante do usuário
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        ownedRestaurants: {
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!user || !user.ownedRestaurants[0]) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      )
    }

    const restaurantId = user.ownedRestaurants[0].id
    const usageOverview = await SubscriptionService.getUsageOverview(restaurantId)

    return NextResponse.json(usageOverview)
  } catch (error) {
    console.error('Erro ao buscar dados de uso:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
