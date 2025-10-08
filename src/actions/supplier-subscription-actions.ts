'use server'

import { prisma } from '@/lib/database/prisma'
import { SupplierPlanType, SupplierSubscriptionStatus } from '@prisma/client'
import Stripe from 'stripe'
import { auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

export type SubscriptionPlan = {
  id: string
  planType: SupplierPlanType
  name: string
  description: string | null
  monthlyPrice: number
  maxProducts: number | null
  maxPartnerships: number | null
  commissionRate: number
  prioritySupport: boolean
  advancedAnalytics: boolean
  apiAccess: boolean
  whiteLabel: boolean
  dedicatedManager: boolean
  customReports: boolean
  slaGuarantee: boolean
  stripeProductId: string
  stripePriceId: string
}

export type SupplierSubscriptionData = {
  id: string
  status: SupplierSubscriptionStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  currentProductCount: number
  currentPartnershipCount: number
  plan: SubscriptionPlan
}

/**
 * Get all available subscription plans
 */
export async function getAvailableSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const plans = await prisma.supplierSubscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { monthlyPrice: 'asc' }
  })
  
  return plans
}

/**
 * Get current user's supplier subscription
 */
export async function getCurrentSupplierSubscription(): Promise<SupplierSubscriptionData | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  
  if (!session?.user?.id) {
    return null
  }

  // SECURITY: Verificar se usuário tem role adequada para supplier
  const allowedRoles = ['supplierOwner', 'supplierManager']
  if (!session.user.role || !allowedRoles.includes(session.user.role)) {
    return null
  }

  // Find supplier for current user
  const company = await prisma.company.findFirst({
    where: { ownerId: session.user.id },
    include: {
      supplier: {
        include: {
          subscription: {
            include: {
              plan: true
            }
          }
        }
      }
    }
  })

  if (!company?.supplier?.subscription) {
    return null
  }

  return {
    id: company.supplier.subscription.id,
    status: company.supplier.subscription.status,
    currentPeriodStart: company.supplier.subscription.currentPeriodStart,
    currentPeriodEnd: company.supplier.subscription.currentPeriodEnd,
    cancelAtPeriodEnd: company.supplier.subscription.cancelAtPeriodEnd,
    currentProductCount: company.supplier.subscription.currentProductCount,
    currentPartnershipCount: company.supplier.subscription.currentPartnershipCount,
    plan: company.supplier.subscription.plan
  }
}

/**
 * Create a new subscription for a supplier
 */
export async function createSupplierSubscription(planId: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    
    if (!session?.user?.id) {
      throw new Error('Usuário não autenticado')
    }

    // SECURITY: Verificar se usuário tem role adequada para supplier  
    const allowedRoles = ['supplierOwner', 'supplierManager']
    if (!session.user.role || !allowedRoles.includes(session.user.role)) {
      throw new Error('Role não autorizada para operações de fornecedor')
    }

    // Find supplier and company
    const company = await prisma.company.findFirst({
      where: { ownerId: session.user.id },
      include: {
        supplier: true
      }
    })

    if (!company?.supplier) {
      throw new Error('Fornecedor não encontrado')
    }

    // Check if supplier already has an active subscription
    const existingSubscription = await prisma.supplierSubscription.findUnique({
      where: { supplierId: company.supplier.id }
    })

    if (existingSubscription && existingSubscription.status === 'ACTIVE') {
      throw new Error('Já existe uma assinatura ativa para este fornecedor')
    }

    // Get the plan
    const plan = await prisma.supplierSubscriptionPlan.findUnique({
      where: { id: planId }
    })

    if (!plan) {
      throw new Error('Plano não encontrado')
    }

    // Get user's Stripe customer ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user?.stripeCustomerId) {
      throw new Error('ID do cliente Stripe não encontrado')
    }

    // Create Stripe subscription
    const stripeSubscription = await stripe.subscriptions.create({
      customer: user.stripeCustomerId,
      items: [{ price: plan.stripePriceId }],
      metadata: {
        supplierId: company.supplier.id,
        planId: plan.id,
        userId: session.user.id
      }
    })

    // Create subscription in database
    const now = new Date()
    const nextMonth = new Date(now)
    nextMonth.setMonth(now.getMonth() + 1)
    
    const subscription = await prisma.supplierSubscription.create({
      data: {
        supplierId: company.supplier.id,
        planId: plan.id,
        stripeSubscriptionId: stripeSubscription.id,
        status: stripeSubscription.status === 'active' ? 'ACTIVE' : 'INACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth,
        trialEnd: null
      }
    })

    return { success: true, subscriptionId: subscription.id }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Error creating supplier subscription:', error)
    return { success: false, error: errorMessage }
  }
}

/**
 * Cancel a supplier subscription
 */
export async function cancelSupplierSubscription() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    
    if (!session?.user?.id) {
      throw new Error('Usuário não autenticado')
    }

    // Find current subscription
    const company = await prisma.company.findFirst({
      where: { ownerId: session.user.id },
      include: {
        supplier: {
          include: {
            subscription: true
          }
        }
      }
    })

    if (!company?.supplier?.subscription) {
      throw new Error('Assinatura não encontrada')
    }

    const subscription = company.supplier.subscription

    // Cancel in Stripe
    const _stripeSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: true }
    )

    // Update in database
    await prisma.supplierSubscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true
      }
    })

    return { success: true }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Error canceling supplier subscription:', error)
    return { success: false, error: errorMessage }
  }
}

/**
 * Reactivate a cancelled subscription
 */
export async function reactivateSupplierSubscription() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    
    if (!session?.user?.id) {
      throw new Error('Usuário não autenticado')
    }

    // Find current subscription
    const company = await prisma.company.findFirst({
      where: { ownerId: session.user.id },
      include: {
        supplier: {
          include: {
            subscription: true
          }
        }
      }
    })

    if (!company?.supplier?.subscription) {
      throw new Error('Assinatura não encontrada')
    }

    const subscription = company.supplier.subscription

    // Reactivate in Stripe
    await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: false }
    )

    // Update in database
    await prisma.supplierSubscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: false
      }
    })

    return { success: true }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Error reactivating supplier subscription:', error)
    return { success: false, error: errorMessage }
  }
}

/**
 * Check if supplier can add more products based on their plan
 */
export async function canAddMoreProducts(): Promise<{ canAdd: boolean; currentCount: number; maxAllowed: number | null }> {
  const subscription = await getCurrentSupplierSubscription()
  
  if (!subscription) {
    return { canAdd: false, currentCount: 0, maxAllowed: null }
  }

  const maxProducts = subscription.plan.maxProducts
  const currentCount = subscription.currentProductCount

  return {
    canAdd: maxProducts === null || currentCount < maxProducts,
    currentCount,
    maxAllowed: maxProducts
  }
}

/**
 * Check if supplier can add more partnerships based on their plan
 */
export async function canAddMorePartnerships(): Promise<{ canAdd: boolean; currentCount: number; maxAllowed: number | null }> {
  const subscription = await getCurrentSupplierSubscription()
  
  if (!subscription) {
    return { canAdd: false, currentCount: 0, maxAllowed: null }
  }

  const maxPartnerships = subscription.plan.maxPartnerships
  const currentCount = subscription.currentPartnershipCount

  return {
    canAdd: maxPartnerships === null || currentCount < maxPartnerships,
    currentCount,
    maxAllowed: maxPartnerships
  }
}

/**
 * Get supplier usage statistics for dashboard
 */
export async function getSupplierUsageStats() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    
    if (!session?.user?.id) {
      throw new Error('Usuário não autenticado')
    }

    // SECURITY: Verificar se usuário tem role adequada para supplier
    const allowedRoles = ['supplierOwner', 'supplierManager']
    if (!session.user.role || !allowedRoles.includes(session.user.role)) {
      throw new Error('Role não autorizada para operações de fornecedor')
    }

    const company = await prisma.company.findFirst({
      where: { ownerId: session.user.id },
      include: {
        supplier: {
          include: {
            subscription: {
              include: {
                plan: true
              }
            }
          }
        }
      }
    })

    if (!company?.supplier) {
      throw new Error('Fornecedor não encontrado')
    }

    // If no subscription, return default values
    if (!company.supplier.subscription) {
      // Count current products and partnerships even without subscription
      const productCount = await prisma.supplierService.count({
        where: { 
          supplierId: company.supplier.id,
          isActive: true 
        }
      })

      const partnershipCount = await prisma.partnership.count({
        where: { 
          supplierId: company.supplier.id,
          status: 'ACTIVE'
        }
      })

      return {
        currentProductCount: productCount,
        currentPartnershipCount: partnershipCount,
        planName: 'Sem Plano',
        planLimits: {
          maxProducts: 0,
          maxPartnerships: 0
        },
        status: 'INACTIVE',
        currentPeriodEnd: new Date().toISOString()
      }
    }

    const subscription = company.supplier.subscription

    return {
      currentProductCount: subscription.currentProductCount,
      currentPartnershipCount: subscription.currentPartnershipCount,
      planName: subscription.plan.name,
      planLimits: {
        maxProducts: subscription.plan.maxProducts || -1, // -1 represents unlimited
        maxPartnerships: subscription.plan.maxPartnerships || -1
      },
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString()
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Error getting supplier usage stats:', error)
    throw new Error(errorMessage)
  }
}

/**
 * Change supplier subscription plan (upgrade/downgrade)
 */
export async function changeSupplierSubscriptionPlan(newPlanId: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    
    if (!session?.user?.id) {
      throw new Error('Usuário não autenticado')
    }

    // Find current subscription
    const company = await prisma.company.findFirst({
      where: { ownerId: session.user.id },
      include: {
        supplier: {
          include: {
            subscription: {
              include: {
                plan: true
              }
            }
          }
        }
      }
    })

    if (!company?.supplier?.subscription) {
      throw new Error('Assinatura atual não encontrada')
    }

    // Get new plan
    const newPlan = await prisma.supplierSubscriptionPlan.findUnique({
      where: { id: newPlanId }
    })

    if (!newPlan) {
      throw new Error('Novo plano não encontrado')
    }

    const currentSubscription = company.supplier.subscription

    // Update subscription in Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      currentSubscription.stripeSubscriptionId
    )

    await stripe.subscriptions.update(currentSubscription.stripeSubscriptionId, {
      items: [{
        id: stripeSubscription.items.data[0].id,
        price: newPlan.stripePriceId,
      }],
      proration_behavior: 'create_prorations',
    })

    // Update subscription in database
    await prisma.supplierSubscription.update({
      where: { id: currentSubscription.id },
      data: {
        planId: newPlan.id
      }
    })

    return { success: true }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Error changing supplier subscription plan:', error)
    return { success: false, error: errorMessage }
  }
}

/**
 * Update usage counts for a supplier
 */
export async function updateSupplierUsageCounts(supplierId: string) {
  try {
    // Count current products
    const productCount = await prisma.supplierService.count({
      where: { 
        supplierId: supplierId,
        isActive: true 
      }
    })

    // Count current partnerships
    const partnershipCount = await prisma.partnership.count({
      where: { 
        supplierId: supplierId,
        status: 'ACTIVE'
      }
    })

    // Update subscription counts
    await prisma.supplierSubscription.updateMany({
      where: { supplierId: supplierId },
      data: {
        currentProductCount: productCount,
        currentPartnershipCount: partnershipCount
      }
    })

    return { success: true, productCount, partnershipCount }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Error updating usage counts:', error)
    return { success: false, error: errorMessage }
  }
}