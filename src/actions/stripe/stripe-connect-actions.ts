'use server'

import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import {
  createStripeConnectAccount,
  createStripeOnboardingLink,
  getStripeAccountStatus,
} from '@/lib/stripe-connect'
import { z } from 'zod'

const StripeOnboardingSchema = z.object({
  supplierId: z.string().min(1, 'ID do fornecedor é obrigatório'),
  returnUrl: z.string().url('URL de retorno inválida'),
  refreshUrl: z.string().url('URL de refresh inválida'),
})

/**
 * Inicia o processo de onboarding do Stripe Connect para um fornecedor
 */
export async function startStripeOnboarding(
  formData: FormData | { supplierId: string; returnUrl: string; refreshUrl: string }
) {
  try {
    const sessionResponse = await auth.api.getSession({
      headers: await import('next/headers').then(h => h.headers()),
    })

    if (!sessionResponse?.user?.id) {
      throw new Error('Usuário não autenticado')
    }

    const session = sessionResponse

    // Parse dos dados
    let parsedData
    if (formData instanceof FormData) {
      parsedData = {
        supplierId: formData.get('supplierId') as string,
        returnUrl: formData.get('returnUrl') as string,
        refreshUrl: formData.get('refreshUrl') as string,
      }
    } else {
      parsedData = formData
    }

    const validatedData = StripeOnboardingSchema.parse(parsedData)

    // Busca o fornecedor e verifica se pertence ao usuário
    const supplier = await prisma.supplier.findFirst({
      where: {
        id: validatedData.supplierId,
        company: {
          ownerId: session.user.id,
        },
      },
      include: {
        company: true,
      },
    })

    if (!supplier || !supplier.company) {
      throw new Error('Fornecedor não encontrado ou sem permissão')
    }

    // Verifica se já tem uma conta Stripe conectada
    if (supplier.company.stripeConnectAccountId) {
      // Se já tem conta, cria apenas um novo link de onboarding (pode ser para completar configuração)
      const accountLink = await createStripeOnboardingLink(
        supplier.company.stripeConnectAccountId,
        validatedData.refreshUrl,
        validatedData.returnUrl
      )

      return {
        success: true,
        onboardingUrl: accountLink.url,
        accountId: supplier.company.stripeConnectAccountId,
      }
    }

    // Cria nova conta Stripe Connect
    const stripeAccount = await createStripeConnectAccount({
      email: supplier.company.email,
      companyName: supplier.company.name,
      country: supplier.company.country || 'BR',
      type: 'express',
    })

    // Atualiza o banco de dados com o ID da conta Stripe
    await prisma.company.update({
      where: {
        id: supplier.companyId,
      },
      data: {
        stripeConnectAccountId: stripeAccount.id,
        stripeConnectStatus: 'PENDING',
      },
    })

    // Atualiza também o campo no supplier
    await prisma.supplier.update({
      where: {
        id: supplier.id,
      },
      data: {
        stripeConnectAccountId: stripeAccount.id,
      },
    })

    // Cria o link de onboarding
    const accountLink = await createStripeOnboardingLink(
      stripeAccount.id,
      validatedData.refreshUrl,
      validatedData.returnUrl
    )

    return {
      success: true,
      onboardingUrl: accountLink.url,
      accountId: stripeAccount.id,
    }
  } catch (error) {
    console.error('Error starting Stripe onboarding:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Dados inválidos fornecidos',
        details: error.issues.map((issue) => issue.message).join(', '),
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
    }
  }
}

/**
 * Verifica o status de uma conta Stripe Connect
 */
export async function checkStripeAccountStatus(accountId: string) {
  try {
    const sessionResponse = await auth.api.getSession({
      headers: await import('next/headers').then(h => h.headers()),
    })

    if (!sessionResponse?.user?.id) {
      throw new Error('Usuário não autenticado')
    }

    const session = sessionResponse

    // Verifica se o usuário tem permissão para ver esta conta
    const supplier = await prisma.supplier.findFirst({
      where: {
        stripeConnectAccountId: accountId,
        company: {
          ownerId: session.user.id,
        },
      },
      include: {
        company: true,
      },
    })

    if (!supplier) {
      throw new Error('Conta não encontrada ou sem permissão')
    }

    // Busca o status no Stripe
    const accountStatus = await getStripeAccountStatus(accountId)

    // Determina o status para salvar no banco
    let dbStatus: 'NOT_CONNECTED' | 'PENDING' | 'CONNECTED' | 'RESTRICTED' | 'REJECTED' = 'PENDING'

    if (accountStatus.chargesEnabled && accountStatus.payoutsEnabled) {
      dbStatus = 'CONNECTED'
    } else if (accountStatus.disabled) {
      dbStatus = 'RESTRICTED'
    }

    // Atualiza o status no banco de dados
    await prisma.company.update({
      where: {
        id: supplier.companyId,
      },
      data: {
        stripeConnectStatus: dbStatus,
        stripeConnectChargesEnabled: accountStatus.chargesEnabled,
        stripeConnectPayoutsEnabled: accountStatus.payoutsEnabled,
        stripeConnectOnboardedAt: accountStatus.detailsSubmitted ? new Date() : null,
      },
    })

    return {
      success: true,
      status: accountStatus,
      dbStatus,
    }
  } catch (error) {
    console.error('Error checking Stripe account status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
    }
  }
}

/**
 * Completa o onboarding após retorno do Stripe
 */
export async function completeStripeOnboarding(accountId: string) {
  try {
    const sessionResponse = await auth.api.getSession({
      headers: await import('next/headers').then(h => h.headers()),
    })

    if (!sessionResponse?.user?.id) {
      throw new Error('Usuário não autenticado')
    }

    const session = sessionResponse

    // Verifica se o usuário tem permissão
    const supplier = await prisma.supplier.findFirst({
      where: {
        stripeConnectAccountId: accountId,
        company: {
          ownerId: session.user.id,
        },
      },
    })

    if (!supplier) {
      throw new Error('Conta não encontrada ou sem permissão')
    }

    // Verifica o status atual da conta
    const statusResult = await checkStripeAccountStatus(accountId)

    if (!statusResult.success) {
      throw new Error('Erro ao verificar status da conta')
    }

    return {
      success: true,
      status: statusResult.dbStatus,
      chargesEnabled: statusResult.status?.chargesEnabled,
      payoutsEnabled: statusResult.status?.payoutsEnabled,
    }
  } catch (error) {
    console.error('Error completing Stripe onboarding:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
    }
  }
}

/**
 * Lista fornecedores do usuário e seus status do Stripe Connect
 */
export async function getUserSuppliersStripeStatus() {
  try {
    const sessionResponse = await auth.api.getSession({
      headers: await import('next/headers').then(h => h.headers()),
    })

    if (!sessionResponse?.user?.id) {
      throw new Error('Usuário não autenticado')
    }

    const session = sessionResponse

    const suppliers = await prisma.supplier.findMany({
      where: {
        company: {
          ownerId: session.user.id,
        },
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true,
            stripeConnectAccountId: true,
            stripeConnectStatus: true,
            stripeConnectChargesEnabled: true,
            stripeConnectPayoutsEnabled: true,
            stripeConnectOnboardedAt: true,
            platformCommissionRate: true,
          },
        },
      },
    })

    return {
      success: true,
      suppliers: suppliers.map((supplier) => ({
        id: supplier.id,
        category: supplier.category,
        companyName: supplier.company?.name,
        companyEmail: supplier.company?.email,
        stripeAccountId: supplier.company?.stripeConnectAccountId,
        stripeStatus: supplier.company?.stripeConnectStatus,
        chargesEnabled: supplier.company?.stripeConnectChargesEnabled,
        payoutsEnabled: supplier.company?.stripeConnectPayoutsEnabled,
        onboardedAt: supplier.company?.stripeConnectOnboardedAt,
        commissionRate: supplier.company?.platformCommissionRate,
      })),
    }
  } catch (error) {
    console.error('Error getting user suppliers Stripe status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
    }
  }
}