import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import SubscriptionService from '@/lib/subscription-service'

export async function GET(request: NextRequest) {
  try {
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
          include: {
            subscription: true
          },
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

    const restaurant = user.ownedRestaurants[0]
    
    // Se não tem assinatura, criar uma básica
    if (!restaurant.subscription) {
      const newSubscription = await SubscriptionService.createSubscription(
        restaurant.id,
        'basic',
        'price_basic', // substituir pelo ID real do Stripe
        undefined,
        undefined
      )
      
      return NextResponse.json({
        planId: newSubscription.planId,
        status: newSubscription.status,
        hasSubscription: true,
        isNew: true
      })
    }

    return NextResponse.json({
      planId: restaurant.subscription.planId,
      status: restaurant.subscription.status,
      hasSubscription: true,
      isNew: false
    })
    
  } catch (error) {
    console.error('Erro ao buscar assinatura:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
