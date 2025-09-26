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

// Mock data para demonstração - em produção virá da API
const mockStats = {
  totalOrders: 156,
  totalRevenue: 12340.50,
  totalProducts: 42,
  totalCustomers: 89,
  pendingOrders: 8,
  completedOrdersToday: 23,
  averageOrderValue: 67.80,
  topSellingProduct: 'Pizza Margherita'
}

const mockRecentOrders = [
  {
    id: '001',
    customer: 'João Silva',
    items: 2,
    total: 45.90,
    status: 'preparing',
    time: '12:30'
  },
  {
    id: '002',
    customer: 'Maria Santos',
    items: 1,
    total: 28.50,
    status: 'ready',
    time: '12:15'
  },
  {
    id: '003',
    customer: 'Pedro Costa',
    items: 3,
    total: 78.20,
    status: 'delivered',
    time: '11:45'
  }
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'preparing': return 'bg-yellow-100 text-yellow-800'
    case 'ready': return 'bg-blue-100 text-blue-800'
    case 'delivered': return 'bg-green-100 text-green-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'preparing': return 'Preparando'
    case 'ready': return 'Pronto'
    case 'delivered': return 'Entregue'
    default: return status
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [currentTime, setCurrentTime] = useState(new Date())

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
        description="Bem-vindo de volta! Aqui está um resumo do seu negócio."
      >
        <div className="text-sm text-muted-foreground mr-2">
          {currentTime.toLocaleDateString('pt-BR')} - {currentTime.toLocaleTimeString('pt-BR')}
        </div>
        <DashboardHeaderButton asChild>
          <Link href="/orders/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo Pedido
          </Link>
        </DashboardHeaderButton>
      </DashboardHeader>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Receita Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {mockStats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              +20.1% em relação ao mês passado
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
            <div className="text-2xl font-bold">{mockStats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              +{mockStats.completedOrdersToday} completados hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Produtos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {mockStats.pendingOrders} pedidos pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Ticket médio: R$ {mockStats.averageOrderValue.toFixed(2)}
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
            <div className="space-y-4">
              {mockRecentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="text-sm font-medium leading-none">{order.customer}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.items} item(s) - {order.time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(order.status)}>
                      {getStatusText(order.status)}
                    </Badge>
                    <div className="text-sm font-medium">
                      R$ {order.total.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
            <CardTitle className="text-sm font-medium">Produto Mais Vendido</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{mockStats.topSellingProduct}</div>
            <p className="text-xs text-muted-foreground">
              Baseado nos pedidos desta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio de Preparo</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">18 min</div>
            <p className="text-xs text-muted-foreground">
              -2 min em relação à semana passada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próxima Meta</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">200 pedidos</div>
            <p className="text-xs text-muted-foreground">
              Faltam 44 para atingir a meta mensal
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}