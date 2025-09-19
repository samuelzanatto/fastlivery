import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma, OrderStatus as DBOrderStatus, OrderType as DBOrderType } from '@prisma/client'
import { isRestaurantOpen } from '@/lib/restaurant-hours'
// import { getSocketIO } from '@/app/api/socket/route'

// Map helpers (DB enum -> UI)
function mapOrderStatus(status: string) {
  const map: Record<string, string> = {
    PENDING: 'pending',
    CONFIRMED: 'preparing', // opcional: poderia ter um badge separado
    PREPARING: 'preparing',
    READY: 'ready',
    OUT_FOR_DELIVERY: 'preparing', // fase intermediária
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
  }
  return map[status] || 'pending'
}

function mapPaymentStatus(status: string) {
  const map: Record<string, string> = {
    PENDING: 'pending',
    APPROVED: 'paid',
    REJECTED: 'failed',
    CANCELLED: 'cancelled'
  }
  return map[status] || 'pending'
}

function mapOrderType(type: string) {
  const map: Record<string, string> = {
    DELIVERY: 'delivery',
    PICKUP: 'pickup',
    DINE_IN: 'dine-in'
  }
  return map[type] || 'delivery'
}

export async function GET(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Restaurante do usuário (owner)
    const restaurant = await prisma.restaurant.findFirst({
      where: { ownerId: sessionResponse.user.id },
      select: { id: true }
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)))
    const statusFilter = searchParams.get('status') // ex: pending
    const typeFilter = searchParams.get('type') // ex: delivery / pickup / dine-in
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Montar where
  const where: Prisma.OrderWhereInput = { restaurantId: restaurant.id }
    if (statusFilter && statusFilter !== 'all') {
      // UI -> DB enum
      const statusMap: Record<string, DBOrderStatus> = {
        pending: DBOrderStatus.PENDING,
        preparing: DBOrderStatus.PREPARING,
        ready: DBOrderStatus.READY,
        delivered: DBOrderStatus.DELIVERED,
        cancelled: DBOrderStatus.CANCELLED
      }
      if (statusMap[statusFilter]) where.status = statusMap[statusFilter]
    }
    if (typeFilter && typeFilter !== 'all') {
      const typeMap: Record<string, DBOrderType> = {
        delivery: DBOrderType.DELIVERY,
        pickup: DBOrderType.PICKUP,
        'dine-in': DBOrderType.DINE_IN
      }
      if (typeMap[typeFilter]) where.type = typeMap[typeFilter]
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } }
      ]
    }
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) {
        const dt = new Date(dateTo)
        dt.setHours(23, 59, 59, 999)
        where.createdAt.lte = dt
      }
    }

    const skip = (page - 1) * pageSize

    const total = await prisma.order.count({ where })
    const orders = await prisma.order.findMany({
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

    // Stats básicos
    const [pendingCount, preparingCount, readyCount] = await Promise.all([
      prisma.order.count({ where: { restaurantId: restaurant.id, status: 'PENDING' } }),
      prisma.order.count({ where: { restaurantId: restaurant.id, status: 'PREPARING' } }),
      prisma.order.count({ where: { restaurantId: restaurant.id, status: 'READY' } })
    ])

    const data = orders.map(o => ({
      id: o.id,
      displayId: o.orderNumber,
      customer: o.customerName,
      items: o.items.map((i) => `${i.quantity}x ${i.product.name}`),
      total: o.total,
      status: mapOrderStatus(o.status),
      paymentStatus: mapPaymentStatus(o.paymentStatus),
      type: mapOrderType(o.type),
      tableNumber: o.table?.number ? parseInt(o.table.number, 10) || undefined : undefined,
      address: o.deliveryAddress || undefined,
      observations: o.notes || undefined,
      createdAt: o.createdAt.toISOString()
    }))

    return NextResponse.json({
      data,
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
    console.error('Erro ao buscar pedidos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { 
      restaurantId, 
      type, 
      items, 
      customerName, 
      customerPhone, 
      customerEmail,
      deliveryAddress,
      notes 
    } = data

    // Validar dados obrigatórios
    if (!restaurantId || !type || !items || !customerName || !customerPhone) {
      return NextResponse.json(
        { error: 'Dados obrigatórios: restaurantId, type, items, customerName, customerPhone' },
        { status: 400 }
      )
    }

    // Para delivery, verificar se o usuário está logado
    if (type === 'DELIVERY') {
      const sessionResponse = await auth.api.getSession({
        headers: request.headers
      })
      
      if (!sessionResponse?.user) {
        return NextResponse.json(
          { error: 'Login obrigatório para pedidos delivery' },
          { status: 401 }
        )
      }
    }

    // Verificar se restaurante existe e está aberto
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
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

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o restaurante está aberto
    if (!isRestaurantOpen(restaurant.isOpen, restaurant.openingHours)) {
      return NextResponse.json(
        { error: 'Restaurante fechado no momento' },
        { status: 400 }
      )
    }

    // Calcular totais
    let subtotal = 0
    const validatedItems = []

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { id: true, name: true, price: true, isAvailable: true }
      })

      if (!product || !product.isAvailable) {
        return NextResponse.json(
          { error: `Produto não encontrado ou indisponível: ${item.productId}` },
          { status: 400 }
        )
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

    const deliveryFee = type === 'DELIVERY' ? restaurant.deliveryFee : 0
    const total = subtotal + deliveryFee

    // Gerar número do pedido
    const orderNumber = `PED${Date.now()}`

    // Criar pedido
    const order = await prisma.order.create({
      data: {
        orderNumber,
        type,
        restaurantId,
        customerName,
        customerPhone,
        customerEmail,
        deliveryAddress: type === 'DELIVERY' ? deliveryAddress : null,
        notes,
        subtotal,
        deliveryFee,
        total,
        items: {
          create: validatedItems
        }
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                price: true
              }
            }
          }
        }
      }
    })

    // Emitir evento WebSocket para notificação em tempo real
    try {
      const { emitWebSocketEvent } = await import('@/lib/socket')
      
      const orderEvent = {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          total: order.total,
          type: order.type,
          status: order.status,
          items: order.items.map(item => ({
            id: item.productId,
            name: item.product.name,
            quantity: item.quantity,
            price: item.price
          }))
        },
        restaurantId: order.restaurantId,
        timestamp: new Date()
      }

      await emitWebSocketEvent('new-order', orderEvent)
      console.log(`[WebSocket] Novo pedido emitido para restaurante ${order.restaurantId}:`, orderEvent.order.orderNumber)
    } catch (socketError) {
      console.error('[WebSocket] Erro ao emitir evento de novo pedido:', socketError)
      // Não falhar a criação do pedido por conta do socket
    }

    return NextResponse.json({
      message: 'Pedido criado com sucesso',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        type: order.type,
        status: order.status,
        total: order.total
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar pedido:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
