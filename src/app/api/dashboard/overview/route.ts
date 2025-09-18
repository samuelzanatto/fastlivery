import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação usando Better Auth
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Buscar restaurante do usuário
    const restaurant = await prisma.restaurant.findFirst({
      where: { ownerId: session.user.id },
      select: {
        id: true,
        name: true,
        isOpen: true,
        isActive: true,
        subscription: {
          select: {
            planId: true,
            status: true
          }
        }
      }
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      )
    }

    // Buscar estatísticas do dia
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Pedidos de hoje
    const todayOrders = await prisma.order.findMany({
      where: {
        restaurantId: restaurant.id,
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      select: {
        id: true,
        total: true,
        status: true,
        customerName: true,
        type: true,
        createdAt: true
      }
    })

    // Estatísticas
    const todaySales = todayOrders.reduce((sum, order) => sum + order.total, 0)
    const uniqueCustomers = new Set(todayOrders.map(order => order.customerName)).size
    const pendingOrders = todayOrders.filter(order => order.status === 'PENDING' || order.status === 'CONFIRMED').length

    // Pedidos recentes (últimos 10)
    const recentOrders = await prisma.order.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        items: {
          include: {
            product: {
              select: { name: true }
            }
          }
        }
      }
    })

    // Formatar pedidos recentes
    const formattedOrders = recentOrders.map(order => ({
      id: order.orderNumber,
      customer: order.customerName,
      items: order.items.map(item => `${item.quantity}x ${item.product.name}`).join(', '),
      total: order.total,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      type: order.type
    }))

    return NextResponse.json({
      stats: {
        todaySales,
        todayOrders: todayOrders.length,
        uniqueCustomers,
        avgDeliveryTime: 25, // Placeholder - calcular baseado em dados reais
        pendingOrders
      },
      recentOrders: formattedOrders,
      restaurant: {
        name: restaurant.name,
        isOpen: restaurant.isOpen,
        plan: restaurant.subscription?.planId || 'free'
      }
    })

  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
