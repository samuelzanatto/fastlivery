'use server'

import { auth } from '@/lib/auth/auth'
import { PrismaClient } from '@prisma/client'
import SubscriptionService, { SubscriptionService as NewSubscriptionService } from '@/lib/billing/subscription-service'
import { getStripeCallbackUrls } from '@/lib/utils/urls'
import { headers } from 'next/headers'
import Stripe from 'stripe'

const prisma = new PrismaClient()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

// Mapeamento dos planos para os price IDs do Stripe
const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_STARTER_PRICE_ID!,
  pro: process.env.STRIPE_PRO_PRICE_ID!,
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
}

export interface UsageOverview {
  planId: string
  limits: {
    orders: number
    products: number
    tables: number
    users: number
  }
  usage: {
    orders: number
    products: number
    tables: number
    users: number
  }
  features: {
    hasAdvancedAnalytics: boolean
    hasPrioritySupport: boolean
    hasCustomBranding: boolean
  }
  billing: {
    currentPeriodStart: Date
    currentPeriodEnd: Date
    status: string
  }
}

export interface BillingPlan {
  id: string
  name: string
  price: string
  productId: string
  priceId: string | undefined
  description: string
  metadata: {
    planKey: string
    interval: string
    [key: string]: string | number | boolean
  }
}

/**
 * Obtém dados de uso da assinatura do usuário logado
 */
export async function getUsageOverview(): Promise<{ success: true; data: UsageOverview } | { success: false; error: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session) {
      return { success: false, error: 'Não autenticado' }
    }

    // Buscar negócios do usuário
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        ownedBusinesses: {
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!user || !user.ownedBusinesses[0]) {
      return { success: false, error: 'Negócio não encontrado' }
    }

    const businessId = user.ownedBusinesses[0].id
    const usageOverview = await SubscriptionService.getUsageOverview(businessId)

    return { success: true, data: usageOverview }
  } catch (error) {
    console.error('Erro ao buscar dados de uso:', error)
    return { success: false, error: 'Erro interno do servidor' }
  }
}

/**
 * Obtém planos de assinatura disponíveis
 */
export async function getBillingPlans(companyType?: 'delivery_company' | 'supplier'): Promise<{ success: true; data: { plans: BillingPlan[] } } | { success: false; error: string }> {
  try {
    // Buscar planos atualizados usando o novo sistema de sincronização
    const plans = await NewSubscriptionService.getAvailablePlans(companyType)
    
    // Mapear para o formato esperado pela API antiga (compatibilidade)
    const formattedPlans = plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      price: (plan.price / 100).toFixed(2), // Converter centavos para reais com 2 casas decimais
      productId: `product_${plan.id}`, // ID fictício para compatibilidade
      priceId: plan.stripePriceId,
      description: plan.description,
      metadata: {
        planKey: plan.id,
        interval: plan.interval,
        ...plan.limits
      }
    }))

    return { success: true, data: { plans: formattedPlans } }
  } catch (error) {
    console.error('❌ Erro ao buscar planos:', error)
    
    // Fallback para planos estáticos em caso de erro
    const fallbackPlans = [
      {
        id: 'basic',
        name: 'FastLivery Basic',
        price: '49.90',
        productId: 'product_basic',
        priceId: process.env.STRIPE_STARTER_PRICE_ID,
        description: 'Plano básico para pequenos negócios',
        metadata: { planKey: 'basic', interval: 'month' }
      },
      {
        id: 'pro', 
        name: 'FastLivery Pro',
        price: '99.90',
        productId: 'product_pro',
        priceId: process.env.STRIPE_PRO_PRICE_ID,
        description: 'Plano avançado para negócios em crescimento',
        metadata: { planKey: 'pro', interval: 'month' }
      },
      {
        id: 'enterprise',
        name: 'FastLivery Enterprise', 
        price: '199.90',
        productId: 'product_enterprise',
        priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
        description: 'Plano completo para grandes negócios',
        metadata: { planKey: 'enterprise', interval: 'month' }
      }
    ]
    
    return { success: true, data: { plans: fallbackPlans } }
  }
}

/**
 * Faz upgrade/downgrade do plano de assinatura
 */
export async function upgradeSubscription(
  planId: string
): Promise<{ success: true; data?: { url?: string } } | { success: false; error: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session) {
      return { success: false, error: 'Não autenticado' }
    }

    if (!planId || !STRIPE_PRICE_IDS[planId as keyof typeof STRIPE_PRICE_IDS]) {
      return { success: false, error: 'Plano inválido' }
    }

    // Buscar negócios do usuário
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        ownedBusinesses: {
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!user || !user.ownedBusinesses[0]) {
      return { success: false, error: 'Negócio não encontrado' }
    }

    const businessId = user.ownedBusinesses[0].id
    const subscription = await SubscriptionService.getSubscription(businessId)
    
    if (!subscription) {
      return { success: false, error: 'Assinatura não encontrada' }
    }

    // Se não há assinatura no Stripe, criar nova sessão de checkout
    if (!subscription.stripeSubscriptionId) {
      const checkoutSession = await stripe.checkout.sessions.create({
        customer: subscription.stripeCustomerId || undefined,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: STRIPE_PRICE_IDS[planId as keyof typeof STRIPE_PRICE_IDS],
            quantity: 1,
          },
        ],
        ...getStripeCallbackUrls('subscription'),
        metadata: {
          businessId,
          planId,
          action: 'upgrade',
        },
      })

      return { success: true, data: { url: checkoutSession.url || undefined } }
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
      businessId, 
      planId, 
      STRIPE_PRICE_IDS[planId as keyof typeof STRIPE_PRICE_IDS]
    )

    return { success: true }
  } catch (error) {
    console.error('Erro ao fazer upgrade:', error)
    return { success: false, error: 'Erro interno do servidor' }
  }
}