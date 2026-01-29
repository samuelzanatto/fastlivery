'use server'

import { prisma } from '@/lib/database/prisma'
import { revalidatePath } from 'next/cache'
import { isBusinessOpen } from '@/lib/utils/business-hours'
import {
  ActionResult,
  createSuccessResult,
  handleActionError
} from '@/lib/actions/auth-helpers'
import { sendOrderItemsAddedPushNotification } from '@/actions/push/push-notifications'

export type OrderType = 'DELIVERY' | 'PICKUP' | 'DINE_IN'
export type PaymentMethod = 'MONEY' | 'CREDIT' | 'DEBIT' | 'PIX'

// Statuses que indicam pedido ainda em aberto (não finalizado)
type ActiveOrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY'
const ACTIVE_ORDER_STATUSES: ActiveOrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY']

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
  tableNumber?: string
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

    let tableForOrder: { id: string } | null = null

    if (input.type === 'DINE_IN') {
      if (!input.tableId && !input.tableNumber) {
        return {
          success: false,
          error: 'Número da mesa é obrigatório para pedidos no local',
          code: 'TABLE_REQUIRED'
        }
      }

      const table = await prisma.table.findFirst({
        where: {
          businessId: business.id,
          ...(input.tableId
            ? { id: input.tableId }
            : { number: input.tableNumber })
        },
        select: { id: true, isOccupied: true, isReserved: true }
      })

      if (!table) {
        return {
          success: false,
          error: 'Mesa não encontrada para este estabelecimento',
          code: 'TABLE_NOT_FOUND'
        }
      }

      // Verificar se já existe pedido ativo para esta mesa
      const existingActiveOrder = await prisma.order.findFirst({
        where: {
          tableId: table.id,
          businessId: business.id,
          status: { in: ACTIVE_ORDER_STATUSES }
        },
        select: { id: true, orderNumber: true }
      })

      if (existingActiveOrder) {
        return {
          success: false,
          error: 'Já existe um pedido em andamento para esta mesa. Você pode adicionar itens ao pedido existente.',
          code: 'ACTIVE_ORDER_EXISTS',
          data: {
            existingOrderId: existingActiveOrder.id,
            existingOrderNumber: existingActiveOrder.orderNumber
          }
        } as ActionResult<PublicOrderResult>
      }

      tableForOrder = { id: table.id }
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

    // Tentar obter usuário logado para associar ao pedido
    let userId: string | null = null
    try {
      const { getAuthenticatedUser } = await import('@/lib/actions/auth-helpers')
      const user = await getAuthenticatedUser()
      userId = user.id
    } catch {
      // Ignorar erro de autenticação (guest)
    }

    // Criar pedido
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId,
          type: input.type,
          businessId: business.id,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail || null,
          deliveryAddress: input.deliveryAddress || null,
          tableId: input.type === 'DINE_IN' ? tableForOrder?.id ?? null : null,
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

      if (tableForOrder) {
        await tx.table.update({
          where: { id: tableForOrder.id },
          data: { isOccupied: true }
        })
      }

      return created
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

/**
 * Verifica se já existe um pedido ativo para determinada mesa
 */
export async function getActiveOrderForTable(
  businessSlug: string,
  tableId?: string,
  tableNumber?: string
): Promise<ActionResult<{
  exists: boolean
  order?: {
    id: string
    orderNumber: string
    status: string
    total: number
    items: Array<{
      id: string
      quantity: number
      price: number
      product: { name: string }
    }>
  }
  table?: {
    id: string
    number: string
  }
}>> {
  try {
    if (!tableId && !tableNumber) {
      return createSuccessResult({ exists: false })
    }

    const business = await prisma.business.findFirst({
      where: { slug: businessSlug, isActive: true },
      select: { id: true }
    })

    if (!business) {
      return { success: false, error: 'Estabelecimento não encontrado', code: 'BUSINESS_NOT_FOUND' }
    }

    // Buscar mesa
    const table = await prisma.table.findFirst({
      where: {
        businessId: business.id,
        ...(tableId ? { id: tableId } : { number: tableNumber })
      },
      select: { id: true, number: true }
    })

    if (!table) {
      return createSuccessResult({ exists: false })
    }

    // Buscar pedido ativo para esta mesa
    const activeOrder = await prisma.order.findFirst({
      where: {
        tableId: table.id,
        businessId: business.id,
        status: { in: ACTIVE_ORDER_STATUSES }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            product: { select: { name: true } }
          }
        }
      }
    })

    if (!activeOrder) {
      return createSuccessResult({ exists: false, table: { id: table.id, number: table.number } })
    }

    return createSuccessResult({
      exists: true,
      order: {
        id: activeOrder.id,
        orderNumber: activeOrder.orderNumber,
        status: activeOrder.status,
        total: activeOrder.total,
        items: activeOrder.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          product: item.product
        }))
      },
      table: { id: table.id, number: table.number }
    })
  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Adicionar itens a um pedido existente (para dine-in)
 */
export interface AddItemsToOrderInput {
  orderId: string
  businessSlug: string
  items: Array<{
    productId: string
    quantity: number
    price: number
    notes?: string
    selectedOptions?: Record<string, string[]>
  }>
}

export async function addItemsToOrder(
  input: AddItemsToOrderInput
): Promise<ActionResult<{
  id: string
  orderNumber: string
  total: number
  newItemsCount: number
  addedTotal: number
}>> {
  try {
    const business = await prisma.business.findFirst({
      where: { slug: input.businessSlug, isActive: true },
      select: { id: true, name: true, slug: true, avatar: true }
    })

    if (!business) {
      return { success: false, error: 'Estabelecimento não encontrado', code: 'BUSINESS_NOT_FOUND' }
    }

    // Verificar se o pedido existe e está em status que permite adição
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: input.orderId,
        businessId: business.id,
        status: { in: ACTIVE_ORDER_STATUSES }
      },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        subtotal: true,
        tableId: true,
        table: { select: { number: true } }
      }
    })

    if (!existingOrder) {
      return {
        success: false,
        error: 'Pedido não encontrado ou já foi finalizado. Não é possível adicionar itens.',
        code: 'ORDER_NOT_FOUND_OR_CLOSED'
      }
    }

    // Validar produtos
    const productIds = input.items.map(item => item.productId)
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        businessId: business.id,
        isAvailable: true
      },
      select: { id: true, name: true, price: true }
    })

    if (products.length !== productIds.length) {
      return {
        success: false,
        error: 'Um ou mais produtos não estão disponíveis',
        code: 'PRODUCTS_UNAVAILABLE'
      }
    }

    // Calcular total dos novos itens
    let addedSubtotal = 0
    const validatedItems = input.items.map(item => {
      const product = products.find(p => p.id === item.productId)
      if (!product) {
        throw new Error(`Produto ${item.productId} não encontrado`)
      }
      const itemTotal = item.price * item.quantity
      addedSubtotal += itemTotal
      return {
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes || null
      }
    })

    // Atualizar pedido com novos itens
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Inserir novos itens
      await tx.orderItem.createMany({
        data: validatedItems.map(item => ({
          orderId: existingOrder.id,
          ...item
        }))
      })

      // Atualizar totais do pedido
      const newSubtotal = existingOrder.subtotal + addedSubtotal
      const updated = await tx.order.update({
        where: { id: existingOrder.id },
        data: {
          subtotal: newSubtotal,
          total: newSubtotal + (existingOrder.total - existingOrder.subtotal) // mantém delivery fee etc
        },
        select: {
          id: true,
          orderNumber: true,
          total: true
        }
      })

      return updated
    })

    // Enviar notificação push para o dashboard
    sendOrderItemsAddedPushNotification({
      businessId: business.id,
      businessName: business.name,
      businessLogo: business.avatar,
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      tableNumber: existingOrder.table?.number,
      itemsAdded: input.items.length,
      addedTotal: addedSubtotal
    }).catch(err => console.error('[Push] Erro ao enviar notificação de itens adicionados:', err))

    console.log(`[LOG] Itens adicionados ao pedido ${existingOrder.orderNumber}: +${input.items.length} itens, +R$${addedSubtotal.toFixed(2)}`)

    revalidatePath(`/${input.businessSlug}`)

    return createSuccessResult({
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      total: updatedOrder.total,
      newItemsCount: input.items.length,
      addedTotal: addedSubtotal
    })
  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Buscar pedido público por ID (para acompanhamento)
 */
export async function getPublicOrder(
  orderId: string,
  businessSlug: string
): Promise<ActionResult<{
  id: string
  businessId: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: number
  subtotal: number
  deliveryFee: number
  type: string
  tableNumber?: string
  customerName: string
  customerPhone: string
  createdAt: Date
  items: Array<{
    id: string
    quantity: number
    price: number
    notes: string | null
    product: { name: string }
  }>
}>> {
  try {
    const business = await prisma.business.findFirst({
      where: { slug: businessSlug, isActive: true },
      select: { id: true }
    })

    if (!business) {
      return { success: false, error: 'Estabelecimento não encontrado', code: 'BUSINESS_NOT_FOUND' }
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        businessId: business.id
      },
      select: {
        id: true,
        businessId: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        total: true,
        subtotal: true,
        deliveryFee: true,
        type: true,
        customerName: true,
        customerPhone: true,
        createdAt: true,
        table: { select: { number: true } },
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            notes: true,
            product: { select: { name: true } }
          }
        }
      }
    })

    if (!order) {
      return { success: false, error: 'Pedido não encontrado', code: 'ORDER_NOT_FOUND' }
    }

    return createSuccessResult({
      ...order,
      tableNumber: order.table?.number
    })
  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Buscar pedido ativo para o usuário autenticado (fallback robusto)
 */
export async function getActiveOrderForUser(businessSlug: string): Promise<ActionResult<{
  id: string
  orderNumber: string
  status: string
}>> {
  try {
    // 1. Verificar se usuário está autenticado
    const { getAuthenticatedUser } = await import('@/lib/actions/auth-helpers')
    let user
    try {
      user = await getAuthenticatedUser()
    } catch {
      return createSuccessResult(null as any) // Não autenticado
    }

    // 2. Buscar business
    const business = await prisma.business.findFirst({
      where: { slug: businessSlug, isActive: true },
      select: { id: true }
    })

    if (!business) {
      return createSuccessResult(null as any)
    }

    // 3. Buscar último pedido ativo deste usuário
    const activeOrder = await prisma.order.findFirst({
      where: {
        userId: user.id,
        businessId: business.id,
        status: { in: ACTIVE_ORDER_STATUSES }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true
      }
    })

    if (!activeOrder) {
      return createSuccessResult(null as any)
    }

    return createSuccessResult(activeOrder)
  } catch (error) {
    // Silencioso, pois é um fallback
    return createSuccessResult(null as any)
  }
}
