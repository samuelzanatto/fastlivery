'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardHeader, DashboardHeaderButton } from "@/components/ui/dashboard-header"
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Package2,
  Truck,
  Calendar,
  Star
} from "lucide-react"

export default function SupplierDashboard() {
  // Mock data - em produção viria de APIs
  const stats = {
    revenue: {
      current: 12500,
      previous: 10800,
      growth: 15.7
    },
    orders: {
      current: 45,
      previous: 38,
      growth: 18.4
    },
    clients: {
      current: 23,
      previous: 21,
      growth: 9.5
    },
    products: {
      current: 156,
      active: 142
    }
  }

  const recentOrders = [
    {
      id: "PED-001",
      client: "Restaurante Bella Vista",
      items: 12,
      value: 450.00,
      status: "Pendente",
      date: "2024-01-15"
    },
    {
      id: "PED-002", 
      client: "Pizzaria do Centro",
      items: 8,
      value: 320.00,
      status: "Confirmado",
      date: "2024-01-14"
    },
    {
      id: "PED-003",
      client: "Lanchonete Express",
      items: 15,
      value: 680.00,
      status: "Entregue",
      date: "2024-01-14"
    }
  ]

  const topProducts = [
    {
      name: "Batata Francesa Premium",
      sales: 89,
      revenue: 2670.00
    },
    {
      name: "Molho Especial da Casa",
      sales: 67,
      revenue: 1340.00
    },
    {
      name: "Hambúrguer Artesanal",
      sales: 45,
      revenue: 2250.00
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendente':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pendente</Badge>
      case 'Confirmado':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Confirmado</Badge>
      case 'Entregue':
        return <Badge variant="outline" className="text-green-600 border-green-600">Entregue</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <DashboardHeader
        title="Dashboard Fornecedor"
        description="Acompanhe suas vendas e performance no marketplace"
      >
        <DashboardHeaderButton>
          <Package2 className="h-4 w-4 mr-2" />
          Adicionar Produto
        </DashboardHeaderButton>
      </DashboardHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.revenue.current)}</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{stats.revenue.growth}% vs mês anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.orders.current}</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{stats.orders.growth}% vs mês anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clients.current}</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{stats.clients.growth}% vs mês anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos</CardTitle>
            <Package2 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.products.current}</div>
            <p className="text-xs text-slate-600">
              {stats.products.active} ativos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Pedidos Recentes</CardTitle>
            <CardDescription>
              Últimos pedidos recebidos dos seus clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{order.id}</span>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-sm text-slate-600 mb-1">{order.client}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Package2 className="h-3 w-3" />
                        {order.items} itens
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(order.date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(order.value)}</div>
                    <Button variant="outline" size="sm" className="mt-2">
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
            <CardDescription>
              Seus produtos com melhor performance este mês
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-medium">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-slate-600">{product.sales} vendas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(product.revenue)}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs text-slate-600">Top produto</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesse rapidamente as funcionalidades mais utilizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-16 flex flex-col gap-2">
              <Package2 className="h-5 w-5" />
              <span className="text-xs">Adicionar Produto</span>
            </Button>
            <Button variant="outline" className="h-16 flex flex-col gap-2">
              <Truck className="h-5 w-5" />
              <span className="text-xs">Ver Pedidos</span>
            </Button>
            <Button variant="outline" className="h-16 flex flex-col gap-2">
              <Users className="h-5 w-5" />
              <span className="text-xs">Meus Clientes</span>
            </Button>
            <Button variant="outline" className="h-16 flex flex-col gap-2">
              <DollarSign className="h-5 w-5" />
              <span className="text-xs">Relatórios</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}