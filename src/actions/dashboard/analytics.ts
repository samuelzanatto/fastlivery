'use server'

import { prisma } from '@/lib/database/prisma'
import {
  ActionResult,
  createSuccessResult,
  handleActionError,
  withBusiness,
  BusinessContext
} from '@/lib/actions/auth-helpers'

export interface DashboardStats {
  todayOrders: number
  todayRevenue: number
  monthlyOrders: number
  monthlyRevenue: number
  pendingOrders: number
  totalProducts: number
  totalTables: number
  totalEmployees: number
}

export interface RevenueData {
  date: string
  revenue: number
  orders: number
}

export interface TopProduct {
  id: string
  name: string
  totalSold: number
  revenue: number
}

export interface OrdersByStatus {
  status: string
  count: number
  percentage: number
}

export interface OrdersByType {
  type: string
  count: number
  percentage: number
}

/**
 * Obter estatísticas gerais do dashboard
 */
async function _getDashboardStats(
  { business }: BusinessContext
): Promise<ActionResult<DashboardStats>> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    // Buscar todas as estatísticas em paralelo
    const [
      todayOrdersData,
      monthlyOrdersData,
      pendingOrders,
      totalProducts,
      totalTables,
      totalEmployees
    ] = await Promise.all([
      // Pedidos e receita de hoje
      prisma.order.aggregate({
        where: {
          businessId: business.id,
          createdAt: {
            gte: today,
            lt: tomorrow
          },
          status: { not: 'CANCELLED' }
        },
        _count: { id: true },
        _sum: { total: true }
      }),
      
      // Pedidos e receita do mês
      prisma.order.aggregate({
        where: {
          businessId: business.id,
          createdAt: {
            gte: startOfMonth
          },
          status: { not: 'CANCELLED' }
        },
        _count: { id: true },
        _sum: { total: true }
      }),
      
      // Pedidos pendentes
      prisma.order.count({
        where: {
          businessId: business.id,
          status: { in: ['PENDING', 'PREPARING', 'READY'] }
        }
      }),
      
      // Total de produtos
      prisma.product.count({
        where: { businessId: business.id }
      }),
      
      // Total de mesas
      prisma.table.count({
        where: { businessId: business.id }
      }),
      
      // Total de funcionários
      prisma.employeeProfile.count({
        where: { businessId: business.id }
      })
    ])

    const stats: DashboardStats = {
      todayOrders: todayOrdersData._count.id,
      todayRevenue: todayOrdersData._sum.total || 0,
      monthlyOrders: monthlyOrdersData._count.id,
      monthlyRevenue: monthlyOrdersData._sum.total || 0,
      pendingOrders,
      totalProducts,
      totalTables,
      totalEmployees
    }

    return createSuccessResult(stats)
  } catch (error) {
    return handleActionError(error)
  }
}

export const getDashboardStats = withBusiness(_getDashboardStats)

/**
 * Obter dados de receita dos últimos dias
 */
async function _getRevenueData(
  { business }: BusinessContext,
  days: number = 7
): Promise<ActionResult<RevenueData[]>> {
  try {
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // Buscar pedidos agrupados por data
    const orders = await prisma.order.findMany({
      where: {
        businessId: business.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: { not: 'CANCELLED' }
      },
      select: {
        createdAt: true,
        total: true
      }
    })

    // Agrupar por data
    const revenueByDate: Record<string, { revenue: number; orders: number }> = {}
    
    // Inicializar todas as datas com zero
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      revenueByDate[dateStr] = { revenue: 0, orders: 0 }
    }

    // Somar receita e contar pedidos por data
    orders.forEach(order => {
      const dateStr = order.createdAt.toISOString().split('T')[0]
      if (revenueByDate[dateStr]) {
        revenueByDate[dateStr].revenue += order.total
        revenueByDate[dateStr].orders += 1
      }
    })

    // Converter para array ordenado
    const revenueData: RevenueData[] = Object.entries(revenueByDate)
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orders: data.orders
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return createSuccessResult(revenueData)
  } catch (error) {
    return handleActionError(error)
  }
}

export const getRevenueData = withBusiness(_getRevenueData)

/**
 * Obter produtos mais vendidos
 */
async function _getTopProducts(
  { business }: BusinessContext,
  limit: number = 5
): Promise<ActionResult<TopProduct[]>> {
  try {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          businessId: business.id,
          createdAt: { gte: startOfMonth },
          status: { not: 'CANCELLED' }
        }
      },
      _sum: {
        quantity: true,
        price: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: limit
    })

    // Buscar informações dos produtos
    const productIds = topProducts.map(item => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true }
    })

    const productMap = new Map(products.map(p => [p.id, p.name]))

    const result: TopProduct[] = topProducts.map(item => ({
      id: item.productId,
      name: productMap.get(item.productId) || 'Produto removido',
      totalSold: item._sum.quantity || 0,
      revenue: item._sum.price || 0
    }))

    return createSuccessResult(result)
  } catch (error) {
    return handleActionError(error)
  }
}

export const getTopProducts = withBusiness(_getTopProducts)

/**
 * Obter distribuição de pedidos por status
 */
async function _getOrdersByStatus(
  { business }: BusinessContext
): Promise<ActionResult<OrdersByStatus[]>> {
  try {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const statusCount = await prisma.order.groupBy({
      by: ['status'],
      where: {
        businessId: business.id,
        createdAt: { gte: startOfMonth }
      },
      _count: { id: true }
    })

    const total = statusCount.reduce((sum, item) => sum + item._count.id, 0)

    const statusLabels: Record<string, string> = {
      PENDING: 'Pendentes',
      CONFIRMED: 'Confirmados',
      PREPARING: 'Preparando',
      READY: 'Prontos',
      OUT_FOR_DELIVERY: 'Saiu para entrega',
      DELIVERED: 'Entregues',
      CANCELLED: 'Cancelados'
    }

    const result: OrdersByStatus[] = statusCount.map(item => ({
      status: statusLabels[item.status] || item.status,
      count: item._count.id,
      percentage: total > 0 ? Math.round((item._count.id / total) * 100) : 0
    }))

    return createSuccessResult(result)
  } catch (error) {
    return handleActionError(error)
  }
}

export const getOrdersByStatus = withBusiness(_getOrdersByStatus)

/**
 * Obter distribuição de pedidos por tipo
 */
async function _getOrdersByType(
  { business }: BusinessContext
): Promise<ActionResult<OrdersByType[]>> {
  try {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const typeCount = await prisma.order.groupBy({
      by: ['type'],
      where: {
        businessId: business.id,
        createdAt: { gte: startOfMonth },
        status: { not: 'CANCELLED' }
      },
      _count: { id: true }
    })

    const total = typeCount.reduce((sum, item) => sum + item._count.id, 0)

    const typeLabels: Record<string, string> = {
      DELIVERY: 'Delivery',
      PICKUP: 'Retirada',
      DINE_IN: 'Consumo local'
    }

    const result: OrdersByType[] = typeCount.map(item => ({
      type: typeLabels[item.type] || item.type,
      count: item._count.id,
      percentage: total > 0 ? Math.round((item._count.id / total) * 100) : 0
    }))

    return createSuccessResult(result)
  } catch (error) {
    return handleActionError(error)
  }
}

export const getOrdersByType = withBusiness(_getOrdersByType)

/**
 * Obter dados avançados de analytics
 */
async function _getAdvancedAnalytics(
  { business }: BusinessContext
): Promise<ActionResult<{
  averageOrderValue: number
  customerRetention: number
  peakHours: Array<{ hour: number; orders: number }>
  conversionRate: number
}>> {
  try {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Valor médio de pedidos
    const avgOrderValue = await prisma.order.aggregate({
      where: {
        businessId: business.id,
        createdAt: { gte: startOfMonth },
        status: { not: 'CANCELLED' }
      },
      _avg: { total: true }
    })

    // Horários de pico (análise por hora do dia)
    const orders = await prisma.order.findMany({
      where: {
        businessId: business.id,
        createdAt: { gte: startOfMonth },
        status: { not: 'CANCELLED' }
      },
      select: { createdAt: true }
    })

    const hourlyCount: Record<number, number> = {}
    orders.forEach(order => {
      const hour = order.createdAt.getHours()
      hourlyCount[hour] = (hourlyCount[hour] || 0) + 1
    })

    const peakHours = Object.entries(hourlyCount)
      .map(([hour, count]) => ({ hour: parseInt(hour), orders: count }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 6)

    const analytics = {
      averageOrderValue: avgOrderValue._avg.total || 0,
      customerRetention: 75, // Placeholder - seria calculado com dados reais de clientes
      peakHours,
      conversionRate: 85 // Placeholder - seria calculado com dados reais
    }

    return createSuccessResult(analytics)
  } catch (error) {
    return handleActionError(error)
  }
}

export const getAdvancedAnalytics = withBusiness(_getAdvancedAnalytics)

/**
 * Get dashboard overview data - equivalent to /api/dashboard/overview
 */
export async function getDashboardOverview(): Promise<ActionResult<{
  stats: {
    todaySales: number
    todayOrders: number
    uniqueCustomers: number
    avgDeliveryTime: number
    pendingOrders: number
  }
  recentOrders: Array<{
    id: string
    customer: string
    items: string
    total: number
    status: string
    createdAt: string
    type: string
  }>
  business: {
    name: string
    isOpen: boolean
    plan: string
  }
}>> {
  try {
    const { business } = await import('@/lib/actions/auth-helpers').then(m => m.getAuthenticatedUserBusiness())
    
    // Buscar dados da subscription do negócio
    const businessData = await prisma.business.findFirst({
      where: { id: business.id },
      select: {
        id: true,
        name: true,
        isOpen: true,
        subscription: {
          select: {
            planId: true,
              status: true
            }
          }
        }
      })

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
      const pendingOrders = todayOrders.filter(order => 
        order.status === 'PENDING' || order.status === 'CONFIRMED'
      ).length

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

      return createSuccessResult({
        stats: {
          todaySales,
          todayOrders: todayOrders.length,
          uniqueCustomers,
          avgDeliveryTime: 25, // Placeholder - calcular baseado em dados reais
          pendingOrders
        },
        recentOrders: formattedOrders,
        business: {
          name: businessData?.name || business.name,
          isOpen: businessData?.isOpen || true,
          plan: businessData?.subscription?.planId || 'free'
        }
      })
  } catch (error) {
    return handleActionError(error)
  }
}