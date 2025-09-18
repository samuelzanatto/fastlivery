"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ShoppingBag, 
  Users, 
  DollarSign,
  TrendingUp,
  Clock,
  Plus,
  Bell,
  QrCode,
  BarChart,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/auth-client'
import { toastHelpers } from '@/lib/toast-helpers'
import Link from 'next/link'

interface DashboardData {
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
  restaurant: {
    name: string
    isOpen: boolean
    plan: string
  }
}

// Cache simples em memória para evitar flicker ao voltar para dashboard
const DASHBOARD_CACHE_TTL = 1000 * 15 // 15s para dados semi-temporários
let dashboardCache: { data: DashboardData | null; fetchedAt: number } = { data: null, fetchedAt: 0 }

export default function Dashboard() {
  const [loading, setLoading] = useState(!dashboardCache.data)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<DashboardData | null>(dashboardCache.data)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const renderCountRef = useRef(0)
  renderCountRef.current += 1

  const loadDashboardData = useCallback(async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true)

      // Reutiliza cache se recente e não for refresh explícito
      const now = Date.now()
      const fresh = dashboardCache.data && (now - dashboardCache.fetchedAt) < DASHBOARD_CACHE_TTL
      if (!showToast && fresh) {
        if (!data) setData(dashboardCache.data)
        setLoading(false)
        return
      }

      const response = await fetch('/api/dashboard/overview', {
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          toastHelpers.auth.error('Sessão expirou')
          router.push('/login')
          return
        }
        
        if (response.status === 404) {
          toastHelpers.system.error(
            'Restaurante não encontrado',
            'Crie seu restaurante nas configurações'
          )
          router.push('/settings')
          return
        }

        throw new Error('Erro ao carregar dados do dashboard')
      }

      const dashboardData = await response.json()
  setData(dashboardData)
  dashboardCache = { data: dashboardData, fetchedAt: Date.now() }
      setError(null)

      if (showToast) {
        toastHelpers.system.success('Dashboard atualizado')
      }

      // Notificar sobre pedidos pendentes se houver
      if (dashboardData.stats.pendingOrders > 0 && !showToast) {
        toastHelpers.restaurant.orderReceived()
      }

    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      
      if (showToast) {
        toastHelpers.system.error('Erro ao atualizar', errorMessage)
      } else {
        toastHelpers.system.networkError()
      }
    } finally {
    setLoading(false)
      setRefreshing(false)
    }
  }, [router, data])

  const handleRefresh = () => {
    loadDashboardData(true)
  }

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login')
      return
    }
    if (!isPending && session) {
      loadDashboardData()
    }
  }, [session, isPending, router, loadDashboardData])

  // Auto-refresh a cada 30 segundos
  useEffect(() => {
    if (!data) return

    const interval = setInterval(() => {
      loadDashboardData()
    }, 30000)

    return () => clearInterval(interval)
  }, [data, loadDashboardData])

  const showLoadingSkeleton = (isPending || loading)

  if (showLoadingSkeleton) {
    return (
      <div className="p-6 space-y-6">
        {process.env.NODE_ENV !== 'production' && (
          <div className="text-[10px] font-mono text-slate-500">
            dashboard renders: {renderCountRef.current} (skeleton)
          </div>
        )}
        <div className="h-8 w-56 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded bg-slate-100 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-slate-100 rounded animate-pulse" />
          <div className="h-72 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  if (error && !data) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Erro ao carregar dashboard
            </h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button 
              onClick={() => loadDashboardData(true)}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-600">Visão geral do seu restaurante</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button variant="ghost" size="sm">
            <Bell className="h-5 w-5" />
            {data?.stats.pendingOrders && data.stats.pendingOrders > 0 && (
              <Badge className="ml-1 bg-red-500 text-white text-xs">
                {data.stats.pendingOrders}
              </Badge>
            )}
          </Button>
          
          <Link href="/orders">
            <Button className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" />
              Novo Pedido
            </Button>
          </Link>
        </div>
      </div>

      {/* Restaurant Status */}
      {data && (
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    data.restaurant.isOpen ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="font-medium text-sm text-slate-800">
                    {data.restaurant.name}
                  </span>
                </div>
                <Badge variant={data.restaurant.isOpen ? "default" : "secondary"} 
                       className={`text-xs ${data.restaurant.isOpen ? "bg-green-100 text-green-800" : ""}`}>
                  {data.restaurant.isOpen ? 'Aberto' : 'Fechado'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Plano {data.restaurant.plan.toUpperCase()}
                </Badge>
              </div>
              
              <div className="text-xs text-slate-600">
                Última atualização: {new Date().toLocaleTimeString('pt-BR')}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Page Content */}
      <OverviewContent data={data} />
    </div>
  )
}

// Overview Content Component
function OverviewContent({ data }: { data: DashboardData | null }) {
  const stats = data?.stats || {
    todaySales: 0,
    todayOrders: 0,
    uniqueCustomers: 0,
    avgDeliveryTime: 0,
    pendingOrders: 0
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: 'Vendas Hoje',
            value: formatCurrency(stats.todaySales),
            change: '+12%',
            icon: DollarSign,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            description: 'Receita do dia'
          },
          {
            title: 'Pedidos Hoje',
            value: stats.todayOrders.toString(),
            change: '+8%',
            icon: ShoppingBag,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            description: 'Total de pedidos'
          },
          {
            title: 'Clientes que Compraram',
            value: stats.uniqueCustomers.toString(),
            change: '+15%',
            icon: Users,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            description: 'Clientes únicos hoje'
          },
          {
            title: 'Pedidos Pendentes',
            value: stats.pendingOrders.toString(),
            change: stats.pendingOrders > 0 ? 'Atenção necessária' : 'Tudo em dia',
            icon: Clock,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
            description: 'Aguardando preparo'
          }
        ].map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="px-4 py-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-medium leading-none text-slate-600 tracking-wide uppercase">
                        {stat.title}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold leading-tight text-slate-800">
                          {stat.value}
                        </p>
                        <div className={`p-1 rounded-md ${stat.bgColor}`}>
                          <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500 truncate max-w-[90px]">
                          {stat.description}
                        </span>
                        {stat.change && (
                          stat.title !== 'Pedidos Pendentes' ? (
                            <span className="flex items-center text-[10px] font-medium text-green-600 whitespace-nowrap">
                              <TrendingUp className="h-3 w-3 mr-0.5" />
                              {stat.change}
                            </span>
                          ) : (
                            <span className={`text-[10px] font-medium ${
                              stats.pendingOrders > 0 ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              {stat.change}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Pedidos Recentes
              <Link href="/orders">
                <Button variant="outline" size="sm">
                  Ver Todos
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.recentOrders?.slice(0, 5).map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-white rounded-lg border border-slate-200 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        Pedido #{order.id}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          order.status === 'preparing' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          order.status === 'ready' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-green-50 text-green-700 border-green-200'
                        }`}
                      >
                        {order.status === 'preparing' ? 'Preparando' : 
                         order.status === 'ready' ? 'Pronto' : 'Entregue'}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {order.type === 'delivery' ? 'Entrega' : 'Retirada'}
                      </Badge>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-bold text-lg text-slate-800">
                        {formatCurrency(order.total)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-700">
                      {order.customer}
                    </p>
                    <p className="text-sm text-slate-600">
                      {order.items}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(order.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </motion.div>
              )) || (
                <div className="text-center py-8">
                  <ShoppingBag className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">Nenhum pedido hoje</p>
                  <p className="text-sm text-slate-500">Os pedidos aparecerão aqui</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  title: 'Criar Produto',
                  description: 'Adicionar novo item ao cardápio',
                  icon: Plus,
                  href: '/products'
                },
                {
                  title: 'Ver Pedidos',
                  description: 'Gerenciar pedidos pendentes',
                  icon: ShoppingBag,
                  href: '/orders'
                },
                {
                  title: 'Gerar QR Code',
                  description: 'Criar QR para nova mesa',
                  icon: QrCode,
                  href: '/tables'
                },
                {
                  title: 'Relatórios',
                  description: 'Ver análises de vendas',
                  icon: BarChart,
                  href: '/analytics'
                }
              ].map((action, index) => {
                const Icon = action.icon
                return (
                  <Link key={action.title} href={action.href}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-all cursor-pointer group bg-white"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                          <Icon className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-800">
                            {action.title}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
