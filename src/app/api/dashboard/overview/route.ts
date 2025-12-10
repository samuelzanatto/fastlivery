import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import { getCachedSession } from '@/lib/security/session-cache'
import { findBusinessForUser } from '@/lib/actions/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação usando cache para melhor performance
    const session = await getCachedSession(request.headers)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Buscar empresa do usuário (dono ou funcionário)
    const businessData = await findBusinessForUser(session.user.id)

    if (!businessData) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      )
    }

    // Buscar dados completos da empresa
    const business = await prisma.business.findUnique({
      where: { id: businessData.business.id },
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

    if (!business) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
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
        businessId: business.id,
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
      where: { businessId: business.id },
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
      business: {
        name: business.name,
        isOpen: business.isOpen,
        plan: business.subscription?.planId || 'free'
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
