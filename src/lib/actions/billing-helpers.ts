// Billing helpers para Server Actions
// Não é um arquivo de Server Actions - contém utilities

import { SubscriptionService } from '@/lib/billing/subscription-service'
import { checkLimit, incrementUsageAfterCreate, decrementUsageAfterDelete, LimitError } from '@/lib/security/limit-middleware'
import { ActionResult, createErrorResult } from './auth-helpers'

/**
 * Helper para verificar limites antes de criar recursos
 */
export async function checkResourceLimit(
  businessId: string, 
  type: 'order' | 'product' | 'table' | 'user'
): Promise<boolean> {
  try {
    await checkLimit(businessId, type)
    return true
  } catch (error) {
    if (error instanceof LimitError) {
      return false
    }
    throw error
  }
}

/**
 * Helper para incrementar uso após criação
 */
export async function incrementResourceUsage(
  businessId: string, 
  type: 'order' | 'product' | 'table' | 'user'
): Promise<void> {
  await incrementUsageAfterCreate(businessId, type)
}

/**
 * Helper para decrementar uso após exclusão
 */
export async function decrementResourceUsage(
  businessId: string, 
  type: 'order' | 'product' | 'table' | 'user'
): Promise<void> {
  await decrementUsageAfterDelete(businessId, type)
}

/**
 * Decorator que adiciona verificação de limites a Server Actions
 */
export function withLimitCheck<T extends unknown[], R>(
  type: 'order' | 'product' | 'table' | 'user',
  action: (businessId: string, ...args: T) => Promise<ActionResult<R>>
) {
  return async (businessId: string, ...args: T): Promise<ActionResult<R>> => {
    try {
      // Verificar limite primeiro
      const canCreate = await checkResourceLimit(businessId, type)
      
      if (!canCreate) {
        const messages = {
          order: 'Limite mensal de pedidos atingido',
          product: 'Limite de produtos atingido',
          table: 'Limite de mesas atingido',
          user: 'Limite de usuários atingido',
        }
        
        return createErrorResult(
          `${messages[type]}. Faça upgrade do seu plano para continuar.`,
          'LIMIT_REACHED'
        )
      }

      // Executar ação
      const result = await action(businessId, ...args)
      
      // Se foi bem-sucedida, incrementar uso
      if (result.success) {
        await incrementResourceUsage(businessId, type)
      }
      
      return result
      
    } catch (error) {
      if (error instanceof LimitError) {
        return createErrorResult(error.message, 'LIMIT_REACHED')
      }
      throw error
    }
  }
}

/**
 * Helper para obter dados de uso do negócio
 */
export async function getBusinessUsage(businessId: string) {
  return await SubscriptionService.getUsageOverview(businessId)
}

/**
 * Helper para verificar se o negócio pode usar uma funcionalidade
 */
export async function hasFeatureAccess(
  businessId: string, 
  feature: 'analytics' | 'priority_support' | 'custom_branding'
): Promise<boolean> {
  try {
    const usage = await getBusinessUsage(businessId)
    
    const featureMap = {
      analytics: usage.features.hasAdvancedAnalytics,
      priority_support: usage.features.hasPrioritySupport,
      custom_branding: usage.features.hasCustomBranding,
    }
    
    return featureMap[feature] || false
  } catch {
    return false
  }
}

/**
 * Decorator que verifica acesso a funcionalidades premium
 */
export function withFeatureAccess<T extends unknown[], R>(
  feature: 'analytics' | 'priority_support' | 'custom_branding',
  action: (businessId: string, ...args: T) => Promise<ActionResult<R>>
) {
  return async (businessId: string, ...args: T): Promise<ActionResult<R>> => {
    const hasAccess = await hasFeatureAccess(businessId, feature)
    
    if (!hasAccess) {
      const messages = {
        analytics: 'Analytics avançados disponível apenas nos planos Pro e Enterprise',
        priority_support: 'Suporte prioritário disponível apenas no plano Enterprise',
        custom_branding: 'Marca personalizada disponível apenas no plano Enterprise',
      }
      
      return createErrorResult(
        `${messages[feature]}. Faça upgrade do seu plano.`,
        'FEATURE_UNAVAILABLE'
      )
    }
    
    return await action(businessId, ...args)
  }
}