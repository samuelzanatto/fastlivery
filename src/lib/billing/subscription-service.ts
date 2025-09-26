import { PrismaClient } from '@prisma/client'
import { StripeSyncService } from '@/lib/payments/stripe-sync'

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
  growth: {
    maxOrders: -1, // ilimitado
    maxProducts: 200,
    maxTables: 20,
    maxUsers: 5,
    hasAdvancedAnalytics: true,
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
  professional: {
    maxOrders: -1, // ilimitado
    maxProducts: -1, // ilimitado
    maxTables: -1, // ilimitado
    maxUsers: -1, // ilimitado
    hasAdvancedAnalytics: true,
    hasPrioritySupport: true,
    hasCustomBranding: true,
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
  static async getAvailablePlans(companyType?: 'delivery_company' | 'supplier'): Promise<PlanInfo[]> {
    try {
  // REMOVIDO: sincronização automática para evitar loops e reloads em dev.
  // Agora a sincronização deve ser disparada manualmente via script (stripe:sync) ou endpoint administrativo.
      
      const productsWithPrices = await StripeSyncService.getLocalProductsWithPrices()
      
      const plans: PlanInfo[] = []
      
      for (const product of productsWithPrices) {
        const metadata = product.metadata as Record<string, string> || {}
        
        // Filtrar por tipo de empresa se especificado
        if (companyType && metadata.target_audience && metadata.target_audience !== companyType) {
          continue
        }
        
        // Buscar o plano correspondente nos limites locais
        const planKey = SubscriptionService.extractPlanKey(metadata, product.name)
        const limits = PLAN_LIMITS[planKey]
        
        // Filtrar apenas o plano "Enterprise - Fornecedor" da landing page
        if (planKey === 'enterprise' && metadata.target_audience === 'supplier') {
          continue
        }
        
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
      return this.getStaticPlans(companyType)
    }
  }
  
  // Extrair chave do plano dos metadados ou nome do produto
  private static extractPlanKey(
    metadata: Record<string, string>,
    productName: string
  ): string {
    // Primeiro, tentar do metadata
    if (metadata.plan_type && typeof metadata.plan_type === 'string') {
      const planType = metadata.plan_type.toLowerCase()
      if (['basic', 'starter'].includes(planType)) return planType
      if (['pro', 'growth'].includes(planType)) return planType
      if (['enterprise', 'professional'].includes(planType)) return planType
    }

    // Se não encontrar no metadata, extrair do nome do produto
    const name = productName.toLowerCase()
    
    if (name.includes('starter')) return 'starter'
    if (name.includes('basic') || name.includes('básico')) return 'basic'
    if (name.includes('growth')) return 'growth'
    if (name.includes('pro') && !name.includes('professional')) return 'pro'
    if (name.includes('professional')) return 'professional'
    if (name.includes('enterprise') || name.includes('empresarial')) return 'enterprise'

    // Fallback para basic
    console.warn(`Não foi possível determinar o tipo de plano para o produto: ${productName}. Usando 'basic' como fallback.`)
    return 'basic'
  }
  
  // Planos estáticos como fallback
  private static getStaticPlans(companyType?: 'delivery_company' | 'supplier'): PlanInfo[] {
    const deliveryPlans = [
      {
        id: 'basic',
        name: 'FastLivery Basic',
        description: 'Plano básico para pequenas empresas',
        price: 4990, // R$ 49,90 em centavos
        currency: 'brl',
        interval: 'month',
        limits: PLAN_LIMITS.basic,
        stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || '',
        companyType: 'delivery_company' as const,
      },
      {
        id: 'pro',
        name: 'FastLivery Pro',
        description: 'Plano avançado para empresas em crescimento',
        price: 9990, // R$ 99,90 em centavos
        currency: 'brl',
        interval: 'month',
        limits: PLAN_LIMITS.pro,
        stripePriceId: process.env.STRIPE_PRO_PRICE_ID || '',
        companyType: 'delivery_company' as const,
      },
      {
        id: 'enterprise',
        name: 'FastLivery Enterprise',
        description: 'Plano completo para grandes empresas',
        price: 19990, // R$ 199,90 em centavos
        currency: 'brl',
        interval: 'month',
        limits: PLAN_LIMITS.enterprise,
        stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
        companyType: 'delivery_company' as const,
      }
    ]

    const supplierPlans = [
      {
        id: 'starter',
        name: 'Plano Starter - Fornecedor',
        description: 'Plano de entrada para fornecedores pequenos',
        price: 4900, // R$ 49,00 em centavos
        currency: 'brl',
        interval: 'month',
        limits: PLAN_LIMITS.starter,
        stripePriceId: '',
        companyType: 'supplier' as const,
      },
      {
        id: 'growth',
        name: 'Plano Growth - Fornecedor',
        description: 'Plano de crescimento para fornecedores médios',
        price: 14900, // R$ 149,00 em centavos
        currency: 'brl',
        interval: 'month',
        limits: PLAN_LIMITS.growth,
        stripePriceId: '',
        companyType: 'supplier' as const,
      },
      {
        id: 'professional',
        name: 'Plano Professional - Fornecedor',
        description: 'Plano para fornecedores estabelecidos',
        price: 29900, // R$ 299,00 em centavos
        currency: 'brl',
        interval: 'month',
        limits: PLAN_LIMITS.professional,
        stripePriceId: '',
        companyType: 'supplier' as const,
      }
      // Removido apenas: "Plano Enterprise - Fornecedor" (não deve aparecer na landing page)
    ]

    const allPlans = [...deliveryPlans, ...supplierPlans]

    // Filtrar por tipo de empresa se especificado
    if (companyType) {
      return allPlans.filter(plan => plan.companyType === companyType).map(({ companyType: _, ...plan }) => plan)
    }

    return allPlans.map(({ companyType: _, ...plan }) => plan)
  }

  // Buscar informações de um plano específico
  static async getPlanInfo(planId: string): Promise<PlanInfo | null> {
    const plans = await this.getAvailablePlans()
    return plans.find(plan => plan.id === planId) || null
  }
  // Criar nova assinatura
  static async createSubscription(
    businessId: string,
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
        referenceId: businessId,
        businessId,
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

  // Obter assinatura do negócio
  static async getSubscription(businessId: string) {
    return await prisma.subscription.findUnique({
      where: { businessId },
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
  static async canCreate(businessId: string, type: 'order' | 'product' | 'table' | 'user') {
    const subscription = await this.getSubscription(businessId)
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
  static async incrementUsage(businessId: string, type: 'order' | 'product' | 'table' | 'user') {
    const subscription = await this.getSubscription(businessId)
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
  static async decrementUsage(businessId: string, type: 'order' | 'product' | 'table' | 'user') {
    const subscription = await this.getSubscription(businessId)
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
  static async upgradePlan(businessId: string, newPlanId: string, newStripePriceId: string) {
    const limits = PLAN_LIMITS[newPlanId]
    if (!limits) {
      throw new Error('Plano inválido')
    }

    return await prisma.subscription.update({
      where: { businessId },
      data: {
        referenceId: businessId,
        planId: newPlanId,
        stripePriceId: newStripePriceId,
        ...limits,
      },
    })
  }

  // Obter limites e uso atual
  static async getUsageOverview(businessId: string) {
    const subscription = await this.getSubscription(businessId)
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
