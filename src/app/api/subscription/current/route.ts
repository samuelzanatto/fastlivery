import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import SubscriptionService from '@/lib/billing/subscription-service'

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

    // Buscar empresa do usuário
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        ownedBusinesses: {
          include: {
            subscription: true
          },
          take: 1,
        },
      },
    })

    if (!user || !user.ownedBusinesses[0]) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      )
    }

    const business = user.ownedBusinesses[0]
    
    // Se não tem assinatura, criar uma básica
    if (!business.subscription) {
      const newSubscription = await SubscriptionService.createSubscription(
        business.id,
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
      planId: business.subscription.planId,
      status: business.subscription.status,
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
