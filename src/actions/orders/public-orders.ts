'use server'

import { prisma } from '@/lib/database/prisma'
import { revalidatePath } from 'next/cache'
import { isBusinessOpen } from '@/lib/utils/business-hours'
import {
  ActionResult,
  createSuccessResult,
  handleActionError
} from '@/lib/actions/auth-helpers'

export type OrderType = 'DELIVERY' | 'PICKUP' | 'DINE_IN'
export type PaymentMethod = 'MONEY' | 'CREDIT' | 'DEBIT' | 'PIX'

export interface PublicOrderCreateInput {
  businessSlug: string
  type: OrderType
  paymentMethod: PaymentMethod
  items: Array<{
    productId: string
    quantity: number
    price: number
    notes?: string
    selectedOptions?: Record<string, string[]>
  }>
  customerName: string
  customerPhone: string
  customerEmail?: string
  deliveryAddress?: string
  tableId?: string
  notes?: string
  deliveryFee?: number
}

export interface PublicOrderResult {
  id: string
  orderNumber: string
  total: number
}

/**
 * Criar pedido público (sem autenticação - para clientes)
 */
export async function createPublicOrder(
  input: PublicOrderCreateInput
): Promise<ActionResult<PublicOrderResult>> {
  try {
    // Buscar business pelo slug
    const business = await prisma.business.findFirst({
      where: { 
        slug: input.businessSlug,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        isOpen: true,
        openingHours: true,
        deliveryFee: true,
        minimumOrder: true,
        acceptsDelivery: true,
        acceptsPickup: true,
        acceptsDineIn: true
      }
    })

    if (!business) {
      return {
        success: false,
        error: 'Estabelecimento não encontrado',
        code: 'BUSINESS_NOT_FOUND'
      }
    }

    // Verificar se está aberto
    const isOpen = isBusinessOpen(business.isOpen, business.openingHours)
    if (!isOpen) {
      return {
        success: false,
        error: 'Estabelecimento fechado no momento',
        code: 'BUSINESS_CLOSED'
      }
    }

    // Verificar tipo de pedido aceito
    if (input.type === 'DELIVERY' && !business.acceptsDelivery) {
      return {
        success: false,
        error: 'Este estabelecimento não aceita pedidos para entrega',
        code: 'DELIVERY_NOT_ACCEPTED'
      }
    }

    if (input.type === 'PICKUP' && !business.acceptsPickup) {
      return {
        success: false,
        error: 'Este estabelecimento não aceita pedidos para retirada',
        code: 'PICKUP_NOT_ACCEPTED'
      }
    }

    if (input.type === 'DINE_IN' && !business.acceptsDineIn) {
      return {
        success: false,
        error: 'Este estabelecimento não aceita pedidos para comer no local',
        code: 'DINE_IN_NOT_ACCEPTED'
      }
    }

    // Verificar endereço para delivery
    if (input.type === 'DELIVERY' && !input.deliveryAddress) {
      return {
        success: false,
        error: 'Endereço de entrega é obrigatório',
        code: 'ADDRESS_REQUIRED'
      }
    }

    // Buscar produtos e calcular total
    const productIds = input.items.map(item => item.productId)
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        businessId: business.id,
        isAvailable: true
      },
      select: {
        id: true,
        name: true,
        price: true
      }
    })

    if (products.length !== productIds.length) {
      return {
        success: false,
        error: 'Um ou mais produtos não estão disponíveis',
        code: 'PRODUCTS_UNAVAILABLE'
      }
    }

    // Calcular subtotal usando os preços dos itens (que incluem opções)
    let subtotal = 0
    const validatedItems = input.items.map(item => {
      const product = products.find(p => p.id === item.productId)
      if (!product) {
        throw new Error(`Produto ${item.productId} não encontrado`)
      }
      
      const itemTotal = item.price * item.quantity
      subtotal += itemTotal
      
      return {
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes || null
      }
    })

    // Verificar pedido mínimo
    if (input.type === 'DELIVERY' && subtotal < business.minimumOrder) {
      return {
        success: false,
        error: `Pedido mínimo para delivery: R$ ${business.minimumOrder.toFixed(2)}`,
        code: 'MINIMUM_ORDER_NOT_REACHED'
      }
    }

    const deliveryFee = input.type === 'DELIVERY' ? (input.deliveryFee ?? business.deliveryFee) : 0
    const total = subtotal + deliveryFee

    // Gerar número do pedido
    const orderNumber = `PED${Date.now()}`

    // Criar pedido
    const order = await prisma.order.create({
      data: {
        orderNumber,
        type: input.type,
        businessId: business.id,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail || null,
        deliveryAddress: input.deliveryAddress || null,
        tableId: input.type === 'DINE_IN' ? input.tableId : null,
        notes: input.notes || null,
        subtotal,
        deliveryFee,
        total,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        items: {
          create: validatedItems
        }
      }
    })

    console.log(`[LOG] Novo pedido público criado para ${business.name}:`, order.orderNumber)

    revalidatePath(`/${input.businessSlug}`)
    
    return createSuccessResult({
      id: order.id,
      orderNumber: order.orderNumber,
      total: order.total
    })
  } catch (error) {
    return handleActionError(error)
  }
}
