'use server'

import { prisma } from '@/lib/database/prisma'
import { revalidatePath } from 'next/cache'
import { isBusinessOpen } from '@/lib/utils/business-hours'
import {
  ActionResult,
  createSuccessResult,
  handleActionError,
  withBusiness,
  BusinessContext,
  getAuthenticatedUser
} from '@/lib/actions/auth-helpers'
import { 
  OrderSchema,
  OrderFiltersSchema,
  PaginationSchema,
  validateData,
  validateId 
} from '@/lib/actions/validation-helpers'
import { withLimitCheck } from '@/lib/actions/billing-helpers'

// Enums e types
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
export type OrderType = 'DELIVERY' | 'PICKUP' | 'DINE_IN'
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface OrderItem {
  id: string
  productId: string
  quantity: number
  price: number
  notes: string | null
  product: {
    name: string
  }
}

export interface Order {
  id: string
  orderNumber: string
  type: OrderType
  status: OrderStatus
  paymentStatus: PaymentStatus
  businessId: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  deliveryAddress: string | null
  notes: string | null
  subtotal: number
  deliveryFee: number
  total: number
  tableId: string | null
  createdAt: Date
  updatedAt: Date
  items: OrderItem[]
  table?: {
    number: string
  } | null
}

export interface OrderCreateInput {
  businessId: string
  type: OrderType
  items: Array<{
    productId: string
    quantity: number
    notes?: string
  }>
  customerName: string
  customerPhone: string
  customerEmail?: string
  deliveryAddress?: string
  tableId?: string
  notes?: string
}

export interface OrderFilters {
  status?: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | 'all'
  type?: 'delivery' | 'pickup' | 'dine-in' | 'all'
  search?: string
  dateFrom?: string
  dateTo?: string
}

export interface Pagination {
  page: number
  pageSize: number
}

export interface OrderStats {
  total: number
  pending: number
  preparing: number
  ready: number
}

// Mappers para converter entre DB e UI
function mapOrderStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'pending',
    CONFIRMED: 'preparing',
    PREPARING: 'preparing',
    READY: 'ready',
    OUT_FOR_DELIVERY: 'preparing',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
  }
  return map[status] || 'pending'
}

function mapPaymentStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'pending',
    APPROVED: 'paid',
    REJECTED: 'failed',
    CANCELLED: 'cancelled'
  }
  return map[status] || 'pending'
}

function mapOrderType(type: string): string {
  const map: Record<string, string> = {
    DELIVERY: 'delivery',
    PICKUP: 'pickup',
    DINE_IN: 'dine-in'
  }
  return map[type] || 'delivery'
}

function mapUIToDBStatus(status: string): OrderStatus {
  const map: Record<string, OrderStatus> = {
    pending: 'PENDING',
    preparing: 'PREPARING',
    ready: 'READY',
    delivered: 'DELIVERED',
    cancelled: 'CANCELLED'
  }
  return map[status] || 'PENDING'
}

function mapUIToDBType(type: string): OrderType {
  const map: Record<string, OrderType> = {
    delivery: 'DELIVERY',
    pickup: 'PICKUP',
    'dine-in': 'DINE_IN'
  }
  return map[type] || 'DELIVERY'
}

/**
 * Buscar pedidos com filtros e paginação
 */
async function _getOrders(
  { business }: BusinessContext,
  filters?: OrderFilters,
  pagination?: Pagination
): Promise<ActionResult<{
  data: Array<{
    id: string
    displayId: string
    customer: string
    items: string[]
    total: number
    status: string
    paymentStatus: string
    type: string
    tableNumber?: number
    address?: string
    observations?: string
    createdAt: string
  }>
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  stats: OrderStats
}>> {
  try {
    const validatedFilters = filters ? validateData(OrderFiltersSchema, filters) : {}
    const validatedPagination = pagination ? validateData(PaginationSchema, pagination) : { page: 1, pageSize: 10 }
    
    const page = validatedPagination.page
    const pageSize = validatedPagination.pageSize

    // Construir where clause
    const where: {
      businessId: string
      status?: OrderStatus
      type?: OrderType
      OR?: Array<{
        orderNumber?: { contains: string; mode: 'insensitive' }
        customerName?: { contains: string; mode: 'insensitive' }
      }>
      createdAt?: {
        gte?: Date
        lte?: Date
      }
    } = { 
      businessId: business.id 
    }

    const typedFilters = validatedFilters as OrderFilters

    if (typedFilters.status && typedFilters.status !== 'all') {
      where.status = mapUIToDBStatus(typedFilters.status)
    }

    if (typedFilters.type && typedFilters.type !== 'all') {
      where.type = mapUIToDBType(typedFilters.type)
    }

    if (typedFilters.search) {
      where.OR = [
        { orderNumber: { contains: typedFilters.search, mode: 'insensitive' } },
        { customerName: { contains: typedFilters.search, mode: 'insensitive' } }
      ]
    }

    if (typedFilters.dateFrom || typedFilters.dateTo) {
      where.createdAt = {}
      if (typedFilters.dateFrom) {
        where.createdAt.gte = new Date(typedFilters.dateFrom)
      }
      if (typedFilters.dateTo) {
        const dateTo = new Date(typedFilters.dateTo)
        dateTo.setHours(23, 59, 59, 999)
        where.createdAt.lte = dateTo
      }
    }

    const skip = (page - 1) * pageSize

    // Buscar total e pedidos em paralelo
    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: { select: { name: true } }
            }
          },
          table: { select: { number: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      })
    ])

    // Buscar estatísticas
    const [pendingCount, preparingCount, readyCount] = await Promise.all([
      prisma.order.count({ where: { businessId: business.id, status: 'PENDING' } }),
      prisma.order.count({ where: { businessId: business.id, status: 'PREPARING' } }),
      prisma.order.count({ where: { businessId: business.id, status: 'READY' } })
    ])

    // Mapear dados para o formato da UI
    const mappedOrders = orders.map(order => ({
      id: order.id,
      displayId: order.orderNumber,
      customer: order.customerName,
      items: order.items.map((item) => `${item.quantity}x ${item.product.name}`),
      total: order.total,
      status: mapOrderStatus(order.status),
      paymentStatus: mapPaymentStatus(order.paymentStatus),
      type: mapOrderType(order.type),
      tableNumber: order.table?.number ? parseInt(order.table.number, 10) || undefined : undefined,
      address: order.deliveryAddress || undefined,
      observations: order.notes || undefined,
      createdAt: order.createdAt.toISOString()
    }))

    return createSuccessResult({
      data: mappedOrders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      },
      stats: {
        total,
        pending: pendingCount,
        preparing: preparingCount,
        ready: readyCount
      }
    })
  } catch (error) {
    return handleActionError(error)
  }
}

export const getOrders = withBusiness(_getOrders)

/**
 * Buscar pedido por ID
 */
async function _getOrder(
  { business }: BusinessContext,
  orderId: string
): Promise<ActionResult<Order>> {
  try {
    const validatedId = validateId(orderId, 'ID do pedido')

    const order = await prisma.order.findFirst({
      where: {
        id: validatedId,
        businessId: business.id
      },
      include: {
        items: {
          include: {
            product: { select: { name: true } }
          }
        },
        table: { select: { number: true } }
      }
    })

    if (!order) {
      return {
        success: false,
        error: 'Pedido não encontrado',
        code: 'ORDER_NOT_FOUND'
      }
    }

    return createSuccessResult(order as Order)
  } catch (error) {
    return handleActionError(error)
  }
}

export const getOrder = withBusiness(_getOrder)

/**
 * Criar novo pedido
 */
async function _createOrder(
  businessId: string,
  input: OrderCreateInput
): Promise<ActionResult<{ id: string; orderNumber: string; total: number }>> {
  try {
    const validatedData = validateData(OrderSchema, input)

    // Para delivery, verificar se o usuário está logado
    if (validatedData.type === 'DELIVERY') {
      try {
        await getAuthenticatedUser()
      } catch {
        return {
          success: false,
          error: 'Login obrigatório para pedidos delivery',
          code: 'AUTH_REQUIRED'
        }
      }
    }

    // Verificar se o negócio existe e está aberto
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { 
        id: true, 
        name: true, 
        deliveryFee: true, 
        minimumOrder: true,
        acceptsDelivery: true,
        acceptsPickup: true,
        acceptsDineIn: true,
        isOpen: true,
        openingHours: true
      }
    })

    if (!business) {
      return {
        success: false,
        error: 'Negócio não encontrado',
        code: 'BUSINESS_NOT_FOUND'
      }
    }

    // Verificar se o negócio está aberto
    if (!isBusinessOpen(business.isOpen, business.openingHours)) {
      return {
        success: false,
        error: 'Negócio fechado no momento',
        code: 'BUSINESS_CLOSED'
      }
    }

    // Verificar se o negócio aceita o tipo de pedido
    const typeAcceptance = {
      DELIVERY: business.acceptsDelivery,
      PICKUP: business.acceptsPickup,
      DINE_IN: business.acceptsDineIn
    }

    if (!typeAcceptance[validatedData.type]) {
      return {
        success: false,
        error: `Negócio não aceita pedidos do tipo ${validatedData.type.toLowerCase()}`,
        code: 'ORDER_TYPE_NOT_ACCEPTED'
      }
    }

    // Calcular totais
    let subtotal = 0
    const validatedItems = []

    for (const item of validatedData.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { id: true, name: true, price: true, isAvailable: true, businessId: true }
      })

      if (!product || !product.isAvailable || product.businessId !== businessId) {
        return {
          success: false,
          error: `Produto não encontrado ou indisponível: ${item.productId}`,
          code: 'PRODUCT_UNAVAILABLE'
        }
      }

      const itemTotal = product.price * item.quantity
      subtotal += itemTotal

      validatedItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
        notes: item.notes || null
      })
    }

    const deliveryFee = validatedData.type === 'DELIVERY' ? business.deliveryFee : 0
    const total = subtotal + deliveryFee

    // Verificar pedido mínimo para delivery
    if (validatedData.type === 'DELIVERY' && subtotal < business.minimumOrder) {
      return {
        success: false,
        error: `Pedido mínimo para delivery: R$ ${business.minimumOrder.toFixed(2)}`,
        code: 'MINIMUM_ORDER_NOT_REACHED'
      }
    }

    // Gerar número do pedido
    const orderNumber = `PED${Date.now()}`

    // Criar pedido
    const order = await prisma.order.create({
      data: {
        orderNumber,
        type: validatedData.type,
        businessId,
        customerName: validatedData.customerName,
        customerPhone: validatedData.customerPhone,
        customerEmail: validatedData.customerEmail,
        deliveryAddress: validatedData.type === 'DELIVERY' ? validatedData.deliveryAddress : null,
        tableId: validatedData.type === 'DINE_IN' ? validatedData.tableId : null,
        notes: validatedData.notes,
        subtotal,
        deliveryFee,
        total,
        items: {
          create: validatedItems
        }
      }
    })

    // Log para monitoring
    console.log(`[LOG] Novo pedido criado para negócio ${order.businessId}:`, order.orderNumber)

    revalidatePath('/dashboard/orders')
    revalidatePath('/dashboard')
    
    return createSuccessResult({
      id: order.id,
      orderNumber: order.orderNumber,
      total: order.total
    })
  } catch (error) {
    return handleActionError(error)
  }
}

export const createOrder = withLimitCheck('order', _createOrder)

/**
 * Atualizar status do pedido
 */
async function _updateOrderStatus(
  { business }: BusinessContext,
  orderId: string,
  status: OrderStatus
): Promise<ActionResult<Order>> {
  try {
    const validatedId = validateId(orderId, 'ID do pedido')

    const order = await prisma.order.update({
      where: {
        id: validatedId,
        businessId: business.id
      },
      data: { status },
      include: {
        items: {
          include: {
            product: { select: { name: true } }
          }
        },
        table: { select: { number: true } }
      }
    })

    revalidatePath('/dashboard/orders')
    revalidatePath('/dashboard')
    
    return createSuccessResult(order as Order)
  } catch (error) {
    return handleActionError(error)
  }
}

export const updateOrderStatus = withBusiness(_updateOrderStatus)

/**
 * Cancelar pedido
 */
export async function cancelOrder(orderId: string): Promise<ActionResult<Order>> {
  return updateOrderStatus(orderId, 'CANCELLED')
}

/**
 * Cancelar pedido com reembolso automático
 */
async function _cancelOrderWithRefund(
  { business }: BusinessContext,
  orderId: string,
  reason?: string
): Promise<ActionResult<{
  order: {
    id: string
    orderNumber: string
    status: string
    paymentStatus: string
  }
  refund?: {
    id: string
    status: string
    amount: number
    message: string
  } | null
}>> {
  try {
    const validatedId = validateId(orderId, 'ID do pedido')

    // Buscar pedido com dados de pagamento
    const order = await prisma.order.findUnique({
      where: { id: validatedId },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            mercadoPagoAccessToken: true,
            mercadoPagoConfigured: true
          }
        },
        payments: true
      }
    })

    if (!order) {
      return {
        success: false,
        error: 'Pedido não encontrado',
        code: 'ORDER_NOT_FOUND'
      }
    }

    // Verificar se o pedido pertence ao negócio do usuário
    if (order.businessId !== business.id) {
      return {
        success: false,
        error: 'Sem permissão para cancelar este pedido',
        code: 'UNAUTHORIZED'
      }
    }

    // Verificar se o pedido pode ser cancelado
    if (order.status === 'CANCELLED') {
      return {
        success: false,
        error: 'Pedido já está cancelado',
        code: 'ORDER_ALREADY_CANCELLED'
      }
    }

    if (order.status === 'DELIVERED') {
      return {
        success: false,
        error: 'Não é possível cancelar pedido já entregue',
        code: 'ORDER_ALREADY_DELIVERED'
      }
    }

    // Processar reembolso se pagamento foi aprovado
    let refundResult = null
    if (order.paymentStatus === 'APPROVED' && order.paymentMethod !== 'MONEY') {
      try {
        if (order.paymentMethod === 'PIX' || order.stripeSessionId?.startsWith('pref_')) {
          // MercadoPago - buscar payment ID
          const { createMercadoPagoService } = await import('@/lib/payments/mercadopago')
          const mercadoPagoService = await createMercadoPagoService(order.businessId)
          
          // Buscar payment pelo external_reference ou stripeSessionId
          let paymentId = order.stripeSessionId
          
          // Se começar com "pref_", é uma preferência do Checkout Pro
          if (paymentId?.startsWith('pref_')) {
            // Buscar pagamento associado à preferência
            const payment = order.payments.find(p => p.status === 'APPROVED')
            if (payment?.preferenceId) {
              // Buscar o pagamento no MercadoPago
              const mpPayment = await mercadoPagoService.getPaymentById(payment.preferenceId)
              if (mpPayment) {
                paymentId = String(mpPayment.id)
              }
            }
          }

          if (paymentId) {
            console.log('Processando reembolso MercadoPago:', { paymentId, orderNumber: order.orderNumber })
            refundResult = await mercadoPagoService.createRefund(paymentId, order.total)
            
            // Atualizar registro de Payment
            await prisma.payment.updateMany({
              where: { orderId: order.id },
              data: {
                status: 'CANCELLED',
                metadata: {
                  refund_id: refundResult.id,
                  refund_status: refundResult.status,
                  refund_amount: refundResult.amount,
                  cancelled_at: new Date().toISOString(),
                  cancel_reason: reason || 'Cancelado pelo negócio'
                }
              }
            })
          }
        } else if (order.stripeSessionId) {
          // Stripe - processar reembolso
          const { default: Stripe } = await import('stripe')
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: '2025-08-27.basil'
          })
          
          console.log('Processando reembolso Stripe:', { sessionId: order.stripeSessionId, orderNumber: order.orderNumber })
          
          // Buscar session e payment intent
          const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId)
          if (session.payment_intent && typeof session.payment_intent === 'string') {
            refundResult = await stripe.refunds.create({
              payment_intent: session.payment_intent,
              amount: Math.round(order.total * 100), // Stripe usa centavos
              reason: 'requested_by_customer',
              metadata: {
                order_id: order.id,
                order_number: order.orderNumber,
                cancel_reason: reason || 'Cancelado pelo negócio'
              }
            })
          }
        }
      } catch (refundError) {
        console.error('Erro ao processar reembolso:', refundError)
        // Continue com o cancelamento mesmo se o reembolso falhar
      }
    }

    // Cancelar o pedido
    const updatedOrder = await prisma.order.update({
      where: { id: validatedId },
      data: {
        status: 'CANCELLED',
        paymentStatus: order.paymentStatus === 'APPROVED' ? 'CANCELLED' : order.paymentStatus,
        notes: reason ? 
          `${order.notes || ''}\n[CANCELADO] ${reason}`.trim() : 
          `${order.notes || ''}\n[CANCELADO] Cancelado pelo negócio`.trim()
      }
    })

    // Revalidar páginas relacionadas
    revalidatePath('/dashboard/orders')
    revalidatePath('/dashboard')

    return createSuccessResult({
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status as string,
        paymentStatus: updatedOrder.paymentStatus as string
      },
      refund: refundResult ? {
        id: String(refundResult.id || 'unknown'),
        status: refundResult.status || 'unknown',
        amount: refundResult.amount || 0,
        message: 'Reembolso processado automaticamente'
      } : order.paymentMethod === 'MONEY' ? {
        id: 'manual',
        status: 'not_required',
        amount: 0,
        message: 'Pagamento em dinheiro - sem necessidade de reembolso automático'
      } : null
    })
  } catch (error) {
    return handleActionError(error)
  }
}

export const cancelOrderWithRefund = withBusiness(_cancelOrderWithRefund)

/**
 * Marcar pedido como pronto
 */
export async function markOrderReady(orderId: string): Promise<ActionResult<Order>> {
  return updateOrderStatus(orderId, 'READY')
}

/**
 * Marcar pedido como entregue
 */
export async function markOrderDelivered(orderId: string): Promise<ActionResult<Order>> {
  return updateOrderStatus(orderId, 'DELIVERED')
}

/**
 * Buscar pedido por número (para checkout e clientes)
 */
async function _getOrderByNumber(orderNumber: string): Promise<ActionResult<{
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  paymentMethod: string | null
  type: string
  subtotal: number
  deliveryFee: number
  total: number
  customerName: string
  customerPhone: string
  customerEmail: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  items: Array<{
    id: string
    quantity: number
    price: number
    notes: string | null
    product: {
      id: string
      name: string
      description: string | null
      image: string | null
    } | null
  }>
  business: {
    id: string
    name: string
    phone: string | null
    email: string | null
  }
}>> {
  try {
    const validatedOrderNumber = validateId(orderNumber, 'Número do pedido')

    const order = await prisma.order.findFirst({
      where: {
        orderNumber: validatedOrderNumber
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                image: true
              }
            }
          }
        },
        business: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        }
      }
    })

    if (!order) {
      return {
        success: false,
        error: 'Pedido não encontrado',
        code: 'ORDER_NOT_FOUND'
      }
    }

    // Formatar resposta
    const formattedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      type: order.type,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      total: order.total,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes,
        product: item.product ? {
          id: item.product.id,
          name: item.product.name,
          description: item.product.description,
          image: item.product.image
        } : null
      })),
      business: {
        id: order.business.id,
        name: order.business.name,
        phone: order.business.phone,
        email: order.business.email
      }
    }

    return createSuccessResult(formattedOrder)
  } catch (error) {
    return handleActionError(error)
  }
}

export const getOrderByNumber = _getOrderByNumber