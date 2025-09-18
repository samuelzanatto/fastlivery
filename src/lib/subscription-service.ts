import { PrismaClient } from '@prisma/client'
import { StripeSyncService } from './stripe-sync'

const prisma = new PrismaClient()

export interface PlanLimits {
  maxOrders: number // -1 para ilimitado
  maxProducts: number
  maxTables: number
  maxUsers: number
  hasAdvancedAnalytics: boolean
  hasPrioritySupport: boolean
  hasCustomBranding: boolean
}

export interface PlanInfo {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: string
  limits: PlanLimits
  stripePriceId: string
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  starter: {
    maxOrders: 100,
    maxProducts: 50,
    maxTables: 5,
    maxUsers: 2,
    hasAdvancedAnalytics: false,
    hasPrioritySupport: false,
    hasCustomBranding: false,
  },
  basic: {
    maxOrders: 100,
    maxProducts: 50,
    maxTables: 5,
    maxUsers: 2,
    hasAdvancedAnalytics: false,
    hasPrioritySupport: false,
    hasCustomBranding: false,
  },
  pro: {
    maxOrders: -1, // ilimitado
    maxProducts: 200,
    maxTables: 20,
    maxUsers: 5,
    hasAdvancedAnalytics: true,
    hasPrioritySupport: false,
    hasCustomBranding: false,
  },
  enterprise: {
    maxOrders: -1, // ilimitado
    maxProducts: -1, // ilimitado
    maxTables: -1, // ilimitado
    maxUsers: -1, // ilimitado
    hasAdvancedAnalytics: true,
    hasPrioritySupport: true,
    hasCustomBranding: true,
  },
}

export class SubscriptionService {
  // Buscar planos atualizados do Stripe
  static async getAvailablePlans(): Promise<PlanInfo[]> {
    try {
      await StripeSyncService.fullSync() // Garantir que os dados estejam atualizados
      
      const productsWithPrices = await StripeSyncService.getLocalProductsWithPrices()
      
      const plans: PlanInfo[] = []
      
      for (const product of productsWithPrices) {
        // Buscar o plano correspondente nos limites locais
        const planKey = SubscriptionService.extractPlanKey(product.metadata as Record<string, unknown> || {}, product.name)
        const limits = PLAN_LIMITS[planKey]
        
        if (!limits) continue
        
        // Buscar preço ativo para o produto
        const activePrice = product.prices.find(price => price.active && price.type === 'recurring')
        
        if (!activePrice) continue
        
        const recurringData = activePrice.recurring as { interval: string } | null
        
        plans.push({
          id: planKey,
          name: product.name,
          description: product.description || '',
          price: activePrice.unitAmount || 0,
          currency: activePrice.currency,
          interval: recurringData?.interval || 'month',
          limits,
          stripePriceId: activePrice.id,
        })
      }
      
      return plans.sort((a, b) => a.price - b.price)
    } catch (error) {
      console.error('Erro ao buscar planos:', error)
      // Fallback para planos estáticos se houver erro
      return this.getStaticPlans()
    }
  }
  
  // Extrair chave do plano dos metadados ou nome do produto
  private static extractPlanKey(
    metadata: Record<string, unknown>,
    productName: string
  ): 'basic' | 'pro' | 'enterprise' {
    // Primeiro, tentar do metadata
    if (metadata.plan && typeof metadata.plan === 'string') {
      return metadata.plan as 'basic' | 'pro' | 'enterprise'
    }

    // Se não encontrar no metadata, extrair do nome do produto
    const name = productName.toLowerCase()
    
    if (name.includes('basic') || name.includes('básico')) {
      return 'basic'
    }
    
    if (name.includes('pro')) {
      return 'pro'
    }
    
    if (name.includes('enterprise') || name.includes('empresarial')) {
      return 'enterprise'
    }

    // Fallback para basic em vez de starter
    console.warn(`Não foi possível determinar o tipo de plano para o produto: ${productName}. Usando 'basic' como fallback.`)
    return 'basic'
  }
  
  // Planos estáticos como fallback
  private static getStaticPlans(): PlanInfo[] {
    return [
      {
        id: 'starter',
        name: 'ZapLivery Starter',
        description: 'Plano básico para pequenos restaurantes',
        price: 4990, // R$ 49,90 em centavos
        currency: 'brl',
        interval: 'month',
        limits: PLAN_LIMITS.starter,
        stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || '',
      },
      {
        id: 'pro',
        name: 'ZapLivery Pro',
        description: 'Plano avançado para restaurantes em crescimento',
        price: 9990, // R$ 99,90 em centavos
        currency: 'brl',
        interval: 'month',
        limits: PLAN_LIMITS.pro,
        stripePriceId: process.env.STRIPE_PRO_PRICE_ID || '',
      },
      {
        id: 'enterprise',
        name: 'ZapLivery Enterprise',
        description: 'Plano completo para grandes restaurantes',
        price: 19990, // R$ 199,90 em centavos
        currency: 'brl',
        interval: 'month',
        limits: PLAN_LIMITS.enterprise,
        stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
      },
    ]
  }

  // Buscar informações de um plano específico
  static async getPlanInfo(planId: string): Promise<PlanInfo | null> {
    const plans = await this.getAvailablePlans()
    return plans.find(plan => plan.id === planId) || null
  }
  // Criar nova assinatura
  static async createSubscription(
    restaurantId: string,
    planId: string,
    stripePriceId: string,
    stripeCustomerId?: string,
    stripeSubscriptionId?: string
  ) {
    const limits = PLAN_LIMITS[planId]
    if (!limits) {
      throw new Error('Plano inválido')
    }

    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())

    return await prisma.subscription.create({
      data: {
        referenceId: restaurantId,
        restaurantId,
        planId,
        plan: planId, // Adicionar campo plan obrigatório
        stripePriceId,
        stripeCustomerId,
        stripeSubscriptionId,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth,
        ...limits,
      },
    })
  }

  // Obter assinatura do restaurante
  static async getSubscription(restaurantId: string) {
    return await prisma.subscription.findUnique({
      where: { restaurantId },
      include: {
        usage: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })
  }

  // Obter ou criar estatísticas de uso para o mês atual
  static async getCurrentUsage(subscriptionId: string) {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    const usage = await prisma.usageStats.upsert({
      where: {
        subscriptionId_year_month: {
          subscriptionId,
          year,
          month,
        },
      },
      update: {}, // Não atualiza nada se já existe
      create: {
        subscriptionId,
        year,
        month,
        ordersCount: 0,
        productsCount: 0,
        tablesCount: 0,
        usersCount: 0,
      },
    })

    return usage
  }

  // Verificar se pode criar um novo item (pedido, produto, mesa, usuário)
  static async canCreate(restaurantId: string, type: 'order' | 'product' | 'table' | 'user') {
    const subscription = await this.getSubscription(restaurantId)
    if (!subscription) {
      throw new Error('Assinatura não encontrada')
    }

    const usage = await this.getCurrentUsage(subscription.id)
    
    const limitKey = `max${type.charAt(0).toUpperCase() + type.slice(1)}s` as keyof PlanLimits
    const countKey = `${type}sCount` as keyof typeof usage
    
    const limit = subscription[limitKey] as number
    const currentCount = usage[countKey] as number

    // -1 significa ilimitado
    if (limit === -1) return true

    return currentCount < limit
  }

  // Incrementar contador de uso
  static async incrementUsage(restaurantId: string, type: 'order' | 'product' | 'table' | 'user') {
    const subscription = await this.getSubscription(restaurantId)
    if (!subscription) {
      throw new Error('Assinatura não encontrada')
    }

    const usage = await this.getCurrentUsage(subscription.id)
    const countKey = `${type}sCount` as keyof typeof usage

    return await prisma.usageStats.update({
      where: { id: usage.id },
      data: {
        [countKey]: {
          increment: 1,
        },
      },
    })
  }

  // Decrementar contador de uso (quando algo é deletado)
  static async decrementUsage(restaurantId: string, type: 'order' | 'product' | 'table' | 'user') {
    const subscription = await this.getSubscription(restaurantId)
    if (!subscription) {
      throw new Error('Assinatura não encontrada')
    }

    const usage = await this.getCurrentUsage(subscription.id)
    const countKey = `${type}sCount` as keyof typeof usage

    return await prisma.usageStats.update({
      where: { id: usage.id },
      data: {
        [countKey]: {
          decrement: 1,
        },
      },
    })
  }

  // Atualizar plano da assinatura
  static async upgradePlan(restaurantId: string, newPlanId: string, newStripePriceId: string) {
    const limits = PLAN_LIMITS[newPlanId]
    if (!limits) {
      throw new Error('Plano inválido')
    }

    return await prisma.subscription.update({
      where: { restaurantId },
      data: {
  referenceId: restaurantId,
        planId: newPlanId,
        stripePriceId: newStripePriceId,
        ...limits,
      },
    })
  }

  // Obter limites e uso atual
  static async getUsageOverview(restaurantId: string) {
    const subscription = await this.getSubscription(restaurantId)
    if (!subscription) {
      throw new Error('Assinatura não encontrada')
    }

    const usage = await this.getCurrentUsage(subscription.id)

    return {
      planId: subscription.planId,
      limits: {
        orders: subscription.maxOrders,
        products: subscription.maxProducts,
        tables: subscription.maxTables,
        users: subscription.maxUsers,
      },
      usage: {
        orders: usage.ordersCount,
        products: usage.productsCount,
        tables: usage.tablesCount,
        users: usage.usersCount,
      },
      features: {
        hasAdvancedAnalytics: subscription.hasAdvancedAnalytics,
        hasPrioritySupport: subscription.hasPrioritySupport,
        hasCustomBranding: subscription.hasCustomBranding,
      },
      billing: {
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        status: subscription.status,
      },
    }
  }

  // Resetar contadores mensais (executado via cron job)
  static async resetMonthlyUsage() {
    // Buscar todas as assinaturas ativas
    const subscriptions = await prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
    })

    for (const subscription of subscriptions) {
      // Criar novo registro de uso para o mês atual
      await this.getCurrentUsage(subscription.id)
    }
  }
}

export default SubscriptionService
