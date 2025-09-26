import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import { headers } from 'next/headers'

/**
 * Middleware para verificar se o fornecedor pode executar uma ação
 * baseado nos limites do seu plano de assinatura
 */
export async function enforceSubscriptionLimits() {
  const session = await auth.api.getSession({ headers: await headers() })
  
  if (!session?.user?.id) {
    return { canProceed: false, error: 'Usuário não autenticado' }
  }

  // Buscar fornecedor e assinatura
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
    return { canProceed: false, error: 'Fornecedor não encontrado' }
  }

  // Se não tem assinatura ativa, bloquear
  if (!company.supplier.subscription || company.supplier.subscription.status !== 'ACTIVE') {
    return { 
      canProceed: false, 
      error: 'Assinatura inativa. Renove sua assinatura para continuar.',
      needsSubscription: true
    }
  }

  return { 
    canProceed: true, 
    subscription: company.supplier.subscription,
    supplier: company.supplier
  }
}

/**
 * Verificar se pode adicionar mais produtos
 */
export async function canAddProduct() {
  const limitCheck = await enforceSubscriptionLimits()
  
  if (!limitCheck.canProceed || !limitCheck.subscription || !limitCheck.supplier) {
    return limitCheck
  }

  const { subscription, supplier } = limitCheck
  const plan = subscription.plan

  // Se é ilimitado, pode adicionar
  if (plan.maxProducts === null || plan.maxProducts === -1) {
    return { canProceed: true }
  }

  // Contar produtos atuais
  const currentProductCount = await prisma.supplierService.count({
    where: { 
      supplierId: supplier.id,
      isActive: true 
    }
  })

  if (currentProductCount >= plan.maxProducts) {
    return {
      canProceed: false,
      error: `Limite de ${plan.maxProducts} produtos atingido. Faça upgrade do seu plano para adicionar mais produtos.`,
      needsUpgrade: true,
      currentCount: currentProductCount,
      maxAllowed: plan.maxProducts
    }
  }

  return { 
    canProceed: true,
    currentCount: currentProductCount,
    maxAllowed: plan.maxProducts
  }
}

/**
 * Verificar se pode adicionar mais parcerias
 */
export async function canAddPartnership() {
  const limitCheck = await enforceSubscriptionLimits()
  
  if (!limitCheck.canProceed || !limitCheck.subscription || !limitCheck.supplier) {
    return limitCheck
  }

  const { subscription, supplier } = limitCheck
  const plan = subscription.plan

  // Se é ilimitado, pode adicionar
  if (plan.maxPartnerships === null || plan.maxPartnerships === -1) {
    return { canProceed: true }
  }

  // Contar parcerias atuais
  const currentPartnershipCount = await prisma.partnership.count({
    where: { 
      supplierId: supplier.id,
      status: 'ACTIVE'
    }
  })

  if (currentPartnershipCount >= plan.maxPartnerships) {
    return {
      canProceed: false,
      error: `Limite de ${plan.maxPartnerships} parcerias atingido. Faça upgrade do seu plano para criar mais parcerias.`,
      needsUpgrade: true,
      currentCount: currentPartnershipCount,
      maxAllowed: plan.maxPartnerships
    }
  }

  return { 
    canProceed: true,
    currentCount: currentPartnershipCount,
    maxAllowed: plan.maxPartnerships
  }
}

/**
 * Verificar status de proximidade aos limites (para notificações)
 */
export async function checkLimitProximity() {
  const limitCheck = await enforceSubscriptionLimits()
  
  if (!limitCheck.canProceed || !limitCheck.subscription || !limitCheck.supplier) {
    return { hasWarnings: false, warnings: [] }
  }

  const { subscription, supplier } = limitCheck
  const plan = subscription.plan
  const warnings = []

  // Verificar produtos se não for ilimitado
  if (plan.maxProducts !== null && plan.maxProducts !== -1) {
    const currentProductCount = await prisma.supplierService.count({
      where: { 
        supplierId: supplier.id,
        isActive: true 
      }
    })

    const productPercentage = (currentProductCount / plan.maxProducts) * 100

    if (productPercentage >= 95) {
      warnings.push({
        type: 'critical',
        resource: 'products',
        message: `Você está no limite de produtos (${currentProductCount}/${plan.maxProducts}). Faça upgrade para continuar adicionando.`,
        percentage: productPercentage
      })
    } else if (productPercentage >= 80) {
      warnings.push({
        type: 'warning',
        resource: 'products',
        message: `Você está próximo do limite de produtos (${currentProductCount}/${plan.maxProducts}). Considere fazer upgrade.`,
        percentage: productPercentage
      })
    }
  }

  // Verificar parcerias se não for ilimitado
  if (plan.maxPartnerships !== null && plan.maxPartnerships !== -1) {
    const currentPartnershipCount = await prisma.partnership.count({
      where: { 
        supplierId: supplier.id,
        status: 'ACTIVE'
      }
    })

    const partnershipPercentage = (currentPartnershipCount / plan.maxPartnerships) * 100

    if (partnershipPercentage >= 95) {
      warnings.push({
        type: 'critical',
        resource: 'partnerships',
        message: `Você está no limite de parcerias (${currentPartnershipCount}/${plan.maxPartnerships}). Faça upgrade para continuar criando.`,
        percentage: partnershipPercentage
      })
    } else if (partnershipPercentage >= 80) {
      warnings.push({
        type: 'warning',
        resource: 'partnerships',
        message: `Você está próximo do limite de parcerias (${currentPartnershipCount}/${plan.maxPartnerships}). Considere fazer upgrade.`,
        percentage: partnershipPercentage
      })
    }
  }

  return {
    hasWarnings: warnings.length > 0,
    warnings,
    subscription,
    plan
  }
}