import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import SubscriptionService from '@/lib/subscription-service'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

const prisma = new PrismaClient()

// Mapeamento dos planos para os price IDs do Stripe
const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_STARTER_PRICE_ID!,
  pro: process.env.STRIPE_PRO_PRICE_ID!,
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
}

export async function POST(request: NextRequest) {
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

    const { planId } = await request.json()

    if (!planId || !STRIPE_PRICE_IDS[planId as keyof typeof STRIPE_PRICE_IDS]) {
      return NextResponse.json(
        { error: 'Plano inválido' },
        { status: 400 }
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
    const subscription = await SubscriptionService.getSubscription(restaurantId)
    
    if (!subscription) {
      return NextResponse.json(
        { error: 'Assinatura não encontrada' },
        { status: 404 }
      )
    }

    // Se não há assinatura no Stripe, criar nova sessão de checkout
    if (!subscription.stripeSubscriptionId) {
      const session = await stripe.checkout.sessions.create({
        customer: subscription.stripeCustomerId || undefined,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: STRIPE_PRICE_IDS[planId as keyof typeof STRIPE_PRICE_IDS],
            quantity: 1,
          },
        ],
  success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?upgrade=success`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?upgrade=cancelled`,
        metadata: {
          restaurantId,
          planId,
          action: 'upgrade',
        },
      })

      return NextResponse.json({ url: session.url })
    }

    // Atualizar assinatura existente no Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId)
    
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [
        {
          id: stripeSubscription.items.data[0].id,
          price: STRIPE_PRICE_IDS[planId as keyof typeof STRIPE_PRICE_IDS],
        },
      ],
      proration_behavior: 'create_prorations',
    })

    // Atualizar no banco de dados
    await SubscriptionService.upgradePlan(
      restaurantId, 
      planId, 
      STRIPE_PRICE_IDS[planId as keyof typeof STRIPE_PRICE_IDS]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao fazer upgrade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
