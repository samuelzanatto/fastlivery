'use server'

import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import { createPaymentWithSplit, createTransferToSupplier } from '@/lib/stripe-connect'
import { z } from 'zod'

const CreatePaymentSchema = z.object({
  supplierId: z.string().min(1, 'ID do fornecedor é obrigatório'),
  amount: z.number().min(1, 'Valor deve ser maior que 0'),
  currency: z.string().default('brl'),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
})

const TransferSchema = z.object({
  supplierId: z.string().min(1, 'ID do fornecedor é obrigatório'),
  amount: z.number().min(1, 'Valor deve ser maior que 0'),
  currency: z.string().default('brl'),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
})

/**
 * Cria um pagamento com split automático entre fornecedor e plataforma
 */
export async function createMarketplacePayment(
  formData: FormData | {
    supplierId: string
    amount: number
    currency?: string
    description?: string
    metadata?: Record<string, string>
  }
) {
  try {
    const sessionResponse = await auth.api.getSession({
      headers: await import('next/headers').then(h => h.headers()),
    })

    if (!sessionResponse?.user?.id) {
      throw new Error('Usuário não autenticado')
    }

    // Parse dos dados
    let parsedData
    if (formData instanceof FormData) {
      parsedData = {
        supplierId: formData.get('supplierId') as string,
        amount: Number(formData.get('amount')),
        currency: formData.get('currency') as string || 'brl',
        description: formData.get('description') as string,
        metadata: formData.get('metadata') ? JSON.parse(formData.get('metadata') as string) : {},
      }
    } else {
      parsedData = formData
    }

    const validatedData = CreatePaymentSchema.parse(parsedData)

    // Busca o fornecedor e verifica se está ativo no Stripe Connect
    const supplier = await prisma.supplier.findFirst({
      where: {
        id: validatedData.supplierId,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            stripeConnectAccountId: true,
            stripeConnectStatus: true,
            stripeConnectChargesEnabled: true,
            stripeConnectPayoutsEnabled: true,
            platformCommissionRate: true,
          },
        },
      },
    })

    if (!supplier || !supplier.company) {
      throw new Error('Fornecedor não encontrado')
    }

    if (!supplier.company.stripeConnectAccountId) {
      throw new Error('Fornecedor não possui conta Stripe Connect configurada')
    }

    if (supplier.company.stripeConnectStatus !== 'CONNECTED') {
      throw new Error('Conta Stripe Connect do fornecedor não está ativa')
    }

    if (!supplier.company.stripeConnectChargesEnabled) {
      throw new Error('Fornecedor não pode receber pagamentos')
    }

    // Cria o pagamento com split no Stripe
    const paymentIntent = await createPaymentWithSplit({
      amount: validatedData.amount,
      currency: validatedData.currency,
      connectedAccountId: supplier.company.stripeConnectAccountId,
      platformCommissionRate: supplier.company.platformCommissionRate || 5.0,
      description: validatedData.description || `Pagamento para ${supplier.company.name}`,
      metadata: {
        ...validatedData.metadata,
        supplier_id: supplier.id,
        company_id: supplier.company.id,
        buyer_id: sessionResponse.user.id,
      },
    })

    // Salva a transação no banco de dados
    const transaction = await prisma.stripeConnectTransaction.create({
      data: {
        stripeTransactionId: paymentIntent.id,
        connectedAccountId: supplier.company.stripeConnectAccountId,
        type: 'PAYMENT',
        status: 'PENDING',
        amount: validatedData.amount,
        currency: validatedData.currency,
        platformCommission: Math.round(validatedData.amount * ((supplier.company.platformCommissionRate || 5.0) / 100)),
        supplierAmount: validatedData.amount - Math.round(validatedData.amount * ((supplier.company.platformCommissionRate || 5.0) / 100)),
        description: validatedData.description,
        metadata: {
          ...validatedData.metadata,
          supplier_id: supplier.id,
          company_id: supplier.company.id,
          buyer_id: sessionResponse.user.id,
        },
        stripeCreatedAt: new Date(paymentIntent.created * 1000),
      },
    })

    return {
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        platformCommission: transaction.platformCommission,
        supplierAmount: transaction.supplierAmount,
      },
    }
  } catch (error) {
    console.error('Error creating marketplace payment:', error)

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
 * Cria uma transferência direta para um fornecedor
 */
export async function createDirectTransfer(
  formData: FormData | {
    supplierId: string
    amount: number
    currency?: string
    description?: string
    metadata?: Record<string, string>
  }
) {
  try {
    const sessionResponse = await auth.api.getSession({
      headers: await import('next/headers').then(h => h.headers()),
    })

    if (!sessionResponse?.user?.id) {
      throw new Error('Usuário não autenticado')
    }

    // Parse dos dados
    let parsedData
    if (formData instanceof FormData) {
      parsedData = {
        supplierId: formData.get('supplierId') as string,
        amount: Number(formData.get('amount')),
        currency: formData.get('currency') as string || 'brl',
        description: formData.get('description') as string,
        metadata: formData.get('metadata') ? JSON.parse(formData.get('metadata') as string) : {},
      }
    } else {
      parsedData = formData
    }

    const validatedData = TransferSchema.parse(parsedData)

    // Busca o fornecedor
    const supplier = await prisma.supplier.findFirst({
      where: {
        id: validatedData.supplierId,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            stripeConnectAccountId: true,
            stripeConnectStatus: true,
            stripeConnectPayoutsEnabled: true,
          },
        },
      },
    })

    if (!supplier || !supplier.company) {
      throw new Error('Fornecedor não encontrado')
    }

    if (!supplier.company.stripeConnectAccountId) {
      throw new Error('Fornecedor não possui conta Stripe Connect configurada')
    }

    if (supplier.company.stripeConnectStatus !== 'CONNECTED') {
      throw new Error('Conta Stripe Connect do fornecedor não está ativa')
    }

    if (!supplier.company.stripeConnectPayoutsEnabled) {
      throw new Error('Fornecedor não pode receber transferências')
    }

    // Cria a transferência no Stripe
    const transfer = await createTransferToSupplier({
      amount: validatedData.amount,
      currency: validatedData.currency,
      destination: supplier.company.stripeConnectAccountId,
      description: validatedData.description || `Transferência para ${supplier.company.name}`,
      metadata: {
        ...validatedData.metadata,
        supplier_id: supplier.id,
        company_id: supplier.company.id,
        sender_id: sessionResponse.user.id,
      },
    })

    // Salva a transferência no banco de dados
    const savedTransfer = await prisma.stripeConnectTransfer.create({
      data: {
        stripeTransferId: transfer.id,
        connectedAccountId: supplier.company.stripeConnectAccountId,
        amount: validatedData.amount,
        currency: validatedData.currency,
        status: 'PENDING',
        description: validatedData.description,
        stripeCreatedAt: new Date(transfer.created * 1000),
        transactionId: '', // Será atualizado quando uma transação for associada
      },
    })

    return {
      success: true,
      transfer: {
        id: transfer.id,
        amount: transfer.amount,
        currency: transfer.currency,
        destination: transfer.destination,
      },
      savedTransfer: {
        id: savedTransfer.id,
        amount: savedTransfer.amount,
        status: savedTransfer.status,
      },
    }
  } catch (error) {
    console.error('Error creating direct transfer:', error)

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
 * Atualiza o status de uma transação Stripe Connect
 */
export async function updateTransactionStatus(
  transactionId: string,
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED'
) {
  try {
    const sessionResponse = await auth.api.getSession({
      headers: await import('next/headers').then(h => h.headers()),
    })

    if (!sessionResponse?.user?.id) {
      throw new Error('Usuário não autenticado')
    }

    // Busca a transação
    const transaction = await prisma.stripeConnectTransaction.findUnique({
      where: {
        id: transactionId,
      },
      include: {
        supplier: {
          include: {
            company: {
              select: {
                ownerId: true,
              },
            },
          },
        },
      },
    })

    if (!transaction) {
      throw new Error('Transação não encontrada')
    }

    // Verifica se o usuário tem permissão (é o dono do fornecedor)
    if (transaction.supplier.company?.ownerId !== sessionResponse.user.id) {
      throw new Error('Sem permissão para atualizar esta transação')
    }

    // Atualiza o status
    const updatedTransaction = await prisma.stripeConnectTransaction.update({
      where: {
        id: transactionId,
      },
      data: {
        status,
        updatedAt: new Date(),
      },
    })

    return {
      success: true,
      transaction: updatedTransaction,
    }
  } catch (error) {
    console.error('Error updating transaction status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
    }
  }
}

/**
 * Lista transações de um fornecedor
 */
export async function getSupplierTransactions(supplierId: string, limit = 50, offset = 0) {
  try {
    const sessionResponse = await auth.api.getSession({
      headers: await import('next/headers').then(h => h.headers()),
    })

    if (!sessionResponse?.user?.id) {
      throw new Error('Usuário não autenticado')
    }

    // Verifica se o usuário tem permissão
    const supplier = await prisma.supplier.findFirst({
      where: {
        id: supplierId,
        company: {
          ownerId: sessionResponse.user.id,
        },
      },
    })

    if (!supplier) {
      throw new Error('Fornecedor não encontrado ou sem permissão')
    }

    // Busca as transações
    const transactions = await prisma.stripeConnectTransaction.findMany({
      where: {
        connectedAccountId: supplier.stripeConnectAccountId!,
      },
      include: {
        transfers: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    })

    // Conta total de transações
    const totalCount = await prisma.stripeConnectTransaction.count({
      where: {
        connectedAccountId: supplier.stripeConnectAccountId!,
      },
    })

    return {
      success: true,
      transactions,
      totalCount,
      hasMore: totalCount > offset + limit,
    }
  } catch (error) {
    console.error('Error getting supplier transactions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
    }
  }
}