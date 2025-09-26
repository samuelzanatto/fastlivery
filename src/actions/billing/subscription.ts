'use server'

import { revalidatePath } from 'next/cache'
import { SubscriptionService } from '@/lib/billing/subscription-service'
import {
  ActionResult,
  createSuccessResult,
  handleActionError,
  withBusiness,
  BusinessContext
} from '@/lib/actions/auth-helpers'
import { validateId } from '@/lib/actions/validation-helpers'

export interface UsageData {
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
  billing?: {
    currentPeriodStart: Date
    currentPeriodEnd: Date
    status: string
    stripePriceId: string | null
    stripeCustomerId: string | null
  }
}

export interface PlanInfo {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: string
  limits: {
    maxOrders: number
    maxProducts: number
    maxTables: number
    maxUsers: number
    hasAdvancedAnalytics: boolean
    hasPrioritySupport: boolean
    hasCustomBranding: boolean
  }
  stripePriceId: string
}

/**
 * Obter dados de uso e limites da empresa
 */
async function _getUsageData(
  { business }: BusinessContext
): Promise<ActionResult<UsageData>> {
  try {
    const usageData = await SubscriptionService.getUsageOverview(business.id)
    return createSuccessResult(usageData as UsageData)
  } catch (error) {
    return handleActionError(error)
  }
}

export const getUsageData = withBusiness(_getUsageData)

/**
 * Obter planos disponíveis
 */
export async function getAvailablePlans(): Promise<ActionResult<PlanInfo[]>> {
  try {
    const plans = await SubscriptionService.getAvailablePlans()
    return createSuccessResult(plans)
  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Fazer upgrade do plano
 */
async function _upgradePlan(
  { business }: BusinessContext,
  planId: string,
  stripePriceId?: string
): Promise<ActionResult<{ success: boolean; message: string }>> {
  try {
    const validatedPlanId = validateId(planId, 'ID do plano')

    // Se não foi fornecido stripePriceId, buscar dos planos disponíveis
    let finalStripePriceId = stripePriceId
    
    if (!finalStripePriceId) {
      const plansResult = await getAvailablePlans()
      
      if (!plansResult.success) {
        return {
          success: false,
          error: 'Erro ao buscar planos disponíveis',
          code: 'PLANS_FETCH_ERROR'
        }
      }
      
      const plan = plansResult.data.find(p => p.id === validatedPlanId)
      
      if (!plan) {
        return {
          success: false,
          error: 'Plano não encontrado',
          code: 'PLAN_NOT_FOUND'
        }
      }
      
      finalStripePriceId = plan.stripePriceId
    }

    if (!finalStripePriceId) {
      return {
        success: false,
        error: 'ID do preço do Stripe não encontrado para este plano',
        code: 'STRIPE_PRICE_ID_MISSING'
      }
    }

    await SubscriptionService.upgradePlan(business.id, validatedPlanId, finalStripePriceId)

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/billing')
    
    return createSuccessResult({
      success: true,
      message: 'Plano atualizado com sucesso'
    })
  } catch (error) {
    return handleActionError(error)
  }
}

export const upgradePlan = withBusiness(_upgradePlan)

/**
 * Verificar se pode criar um recurso
 */
async function _canCreateResource(
  { business }: BusinessContext,
  type: 'order' | 'product' | 'table' | 'user'
): Promise<ActionResult<{ canCreate: boolean; message?: string }>> {
  try {
    const canCreate = await SubscriptionService.canCreate(business.id, type)

    if (!canCreate) {
      const messages = {
        order: 'Limite mensal de pedidos atingido',
        product: 'Limite de produtos atingido',
        table: 'Limite de mesas atingido',
        user: 'Limite de usuários atingido',
      }
      
      return createSuccessResult({
        canCreate: false,
        message: `${messages[type]}. Faça upgrade do seu plano para continuar.`
      })
    }
    
    return createSuccessResult({
      canCreate: true
    })
  } catch (error) {
    return handleActionError(error)
  }
}

export const canCreateResource = withBusiness(_canCreateResource)

/**
 * Incrementar uso de um recurso (usado internamente após criação)
 */
async function _incrementResourceUsage(
  { business }: BusinessContext,
  type: 'order' | 'product' | 'table' | 'user'
): Promise<ActionResult<{ success: boolean }>> {
  try {
    await SubscriptionService.incrementUsage(business.id, type)
    return createSuccessResult({ success: true })
  } catch (error) {
    return handleActionError(error)
  }
}

export const incrementResourceUsage = withBusiness(_incrementResourceUsage)

/**
 * Decrementar uso de um recurso (usado internamente após exclusão)
 */
async function _decrementResourceUsage(
  { business }: BusinessContext,
  type: 'order' | 'product' | 'table' | 'user'
): Promise<ActionResult<{ success: boolean }>> {
  try {
    await SubscriptionService.decrementUsage(business.id, type)
    return createSuccessResult({ success: true })
  } catch (error) {
    return handleActionError(error)
  }
}

export const decrementResourceUsage = withBusiness(_decrementResourceUsage)

/**
 * Obter porcentagem de uso de um recurso
 */
async function _getUsagePercentage(
  { business }: BusinessContext,
  type: 'order' | 'product' | 'table' | 'user'
): Promise<ActionResult<{ percentage: number; isNearLimit: boolean; hasReachedLimit: boolean }>> {
  try {
    const usageData = await SubscriptionService.getUsageOverview(business.id)

    const limit = usageData.limits[`${type}s` as keyof typeof usageData.limits]
    const current = usageData.usage[`${type}s` as keyof typeof usageData.usage]
    
    let percentage = 0
    
    if (limit === -1) {
      // Ilimitado
      percentage = 0
    } else {
      percentage = Math.min((current / limit) * 100, 100)
    }
    
    const isNearLimit = percentage >= 80
    const hasReachedLimit = percentage >= 100
    
    return createSuccessResult({
      percentage,
      isNearLimit,
      hasReachedLimit
    })
  } catch (error) {
    return handleActionError(error)
  }
}

export const getUsagePercentage = withBusiness(_getUsagePercentage)

/**
 * Verificar se tem acesso a uma funcionalidade premium
 */
async function _hasFeatureAccess(
  { business }: BusinessContext,
  feature: 'analytics' | 'priority_support' | 'custom_branding'
): Promise<ActionResult<{ hasAccess: boolean; message?: string }>> {
  try {
    const usageData = await SubscriptionService.getUsageOverview(business.id)

    const featureMap = {
      analytics: usageData.features.hasAdvancedAnalytics,
      priority_support: usageData.features.hasPrioritySupport,
      custom_branding: usageData.features.hasCustomBranding,
    }
    
    const hasAccess = featureMap[feature] || false
    
    if (!hasAccess) {
      const messages = {
        analytics: 'Analytics avançados disponível apenas nos planos Pro e Enterprise',
        priority_support: 'Suporte prioritário disponível apenas no plano Enterprise',
        custom_branding: 'Marca personalizada disponível apenas no plano Enterprise',
      }
      
      return createSuccessResult({
        hasAccess: false,
        message: `${messages[feature]}. Faça upgrade do seu plano.`
      })
    }
    
    return createSuccessResult({
      hasAccess: true
    })
  } catch (error) {
    return handleActionError(error)
  }
}

export const hasFeatureAccess = withBusiness(_hasFeatureAccess)

/**
 * Resetar contadores mensais (usado pelo cron job)
 * Esta função não precisa de autenticação pois é chamada pelo sistema
 */
export async function resetMonthlyUsage(): Promise<ActionResult<{ resetCount: number }>> {
  try {
    await SubscriptionService.resetMonthlyUsage()
    
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/billing')
    
    return createSuccessResult({ resetCount: 1 })
  } catch (error) {
    return handleActionError(error)
  }
}