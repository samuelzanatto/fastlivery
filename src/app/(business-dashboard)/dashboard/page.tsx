'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/auth/auth-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardHeader, DashboardHeaderButton } from '@/components/ui/dashboard-header'
import { 
  TrendingUp, 
  Package, 
  Users, 
  DollarSign, 
  Clock, 
  ShoppingBag,
  Plus,
  Eye,
  Settings,
  BarChart3,
  Calendar
} from 'lucide-react'
import Link from 'next/link'

type DashboardData = {
  stats: {
    todaySales: number
    todayOrders: number
    uniqueCustomers: number
    avgDeliveryTime: number
    pendingOrders: number
  }
  recentOrders: Array<{
    id: string | null
    customer: string | null
    items: string
    total: number
    status: string
    createdAt: string
    type: string | null
  }>
  business: {
    name: string
    isOpen: boolean
    plan: string
  }
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-orange-100 text-orange-800',
  READY: 'bg-emerald-100 text-emerald-800',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
}

const statusTexts: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Preparando',
  READY: 'Pronto',
  OUT_FOR_DELIVERY: 'Em entrega',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!isPending && session?.user?.role) {
      // Redirecionar apenas usuários supplier
      if (session.user.role === 'supplierOwner') {
        router.replace('/supplier-dashboard')
      }
    }
  }, [session, isPending, router])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/dashboard/overview')
        if (!res.ok) {
          throw new Error('Falha ao carregar dados do dashboard')
        }
        const payload = (await res.json()) as DashboardData
        setData(payload)
      } catch (err) {
        console.error(err)
        setError('Não foi possível carregar os dados em tempo real.')
      } finally {
        setIsLoadingData(false)
      }
    }

    load()
  }, [])

  // Loading state
  if (isPending || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  // Se é supplier, não renderiza nada (será redirecionado)
  if (session.user.role === 'supplierOwner') {
    return null
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <DashboardHeader
        title="Dashboard"
        description={data?.business?.name || 'Bem-vindo de volta! Aqui está um resumo do seu negócio.'}
      >
        <div className="text-sm text-muted-foreground mr-2">
          {currentTime.toLocaleDateString('pt-BR')} - {currentTime.toLocaleTimeString('pt-BR')}
        </div>
        {data?.business && (
          <Badge variant={data.business.isOpen ? 'default' : 'outline'} className="mr-2">
            {data.business.isOpen ? 'Aberto' : 'Fechado'} · Plano {data.business.plan}
          </Badge>
        )}
        <DashboardHeaderButton asChild>
          <Link href="/orders/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo Pedido
          </Link>
        </DashboardHeaderButton>
      </DashboardHeader>

      {error && (
        <div className="rounded-md bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Receita de hoje
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data ? formatCurrency(data.stats.todaySales) : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              Atualizado com pedidos do dia
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pedidos
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data ? data.stats.todayOrders : '—'}</div>
            <p className="text-xs text-muted-foreground">
              {data ? `${data.stats.pendingOrders} pendentes` : 'Carregando...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pedidos pendentes
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data ? data.stats.pendingOrders : '—'}</div>
            <p className="text-xs text-muted-foreground">
              Em preparo ou aguardando confirmação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clientes únicos (hoje)
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data ? data.stats.uniqueCustomers : '—'}</div>
            <p className="text-xs text-muted-foreground">
              {data && data.stats.todayOrders > 0
                ? `Ticket médio: ${formatCurrency(data.stats.todaySales / data.stats.todayOrders)}`
                : 'Ticket médio: —'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Orders */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Pedidos Recentes</CardTitle>
            <CardDescription>
              Últimos pedidos do seu restaurante
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="text-sm text-muted-foreground">Carregando pedidos...</div>
            ) : data?.recentOrders?.length ? (
              <div className="space-y-4">
                {data.recentOrders.map((order) => (
                  <div key={order.id ?? order.createdAt} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="text-sm font-medium leading-none">{order.customer ?? 'Cliente'}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.items || '—'} · {formatTime(order.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={statusColors[order.status] || 'bg-gray-100 text-gray-800'}>
                        {statusTexts[order.status] || order.status}
                      </Badge>
                      <div className="text-sm font-medium">
                        {formatCurrency(order.total)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Nenhum pedido ainda hoje.</div>
            )}
            <div className="mt-4">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/orders">
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Todos os Pedidos
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesso rápido às principais funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" asChild>
              <Link href="/products">
                <Package className="mr-2 h-4 w-4" />
                Gerenciar Produtos
              </Link>
            </Button>
            
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/orders">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Ver Pedidos
              </Link>
            </Button>
            
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/customers">
                <Users className="mr-2 h-4 w-4" />
                Clientes
              </Link>
            </Button>
            
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/analytics">
                <BarChart3 className="mr-2 h-4 w-4" />
                Relatórios
              </Link>
            </Button>
            
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket médio (hoje)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {data && data.stats.todayOrders > 0
                ? formatCurrency(data.stats.todaySales / data.stats.todayOrders)
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground">Atualizado com pedidos do dia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio de Preparo</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{data ? `${data.stats.avgDeliveryTime} min` : '—'}</div>
            <p className="text-xs text-muted-foreground">Estimativa baseada nos pedidos recentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status do restaurante</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {data ? (data.business.isOpen ? 'Aberto para pedidos' : 'Fechado') : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              Plano {data?.business.plan ?? '—'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}