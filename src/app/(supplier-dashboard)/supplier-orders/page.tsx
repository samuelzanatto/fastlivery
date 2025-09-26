'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardHeader } from "@/components/ui/dashboard-header"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { 
  Package, 
  CheckCircle, 
  Eye,
  MoreVertical
} from "lucide-react"

export default function SupplierOrders() {
  // Mock data - substituir por dados reais
  const orders = [
    {
      id: "PED-001",
      client: "Restaurante Bella Vista",
      items: 12,
      value: 450.00,
      status: "Pendente",
      date: "2024-01-15",
      time: "14:30"
    },
    {
      id: "PED-002", 
      client: "Pizzaria do Centro",
      items: 8,
      value: 320.00,
      status: "Confirmado",
      date: "2024-01-14",
      time: "10:15"
    },
    {
      id: "PED-003",
      client: "Lanchonete Express",
      items: 15,
      value: 680.00,
      status: "Entregue",
      date: "2024-01-13",
      time: "16:45"
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
        title="Pedidos Recebidos"
        description="Gerencie todos os pedidos recebidos dos seus clientes"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Pedidos Hoje</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Pendentes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-yellow-600">3</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Confirmados</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-blue-600">8</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Valor do Dia</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-green-600">R$ 2.340</div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos Recentes</CardTitle>
          <CardDescription>Lista dos últimos pedidos recebidos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">{order.client}</h3>
                    <p className="text-sm text-slate-600">
                      Pedido #{order.id} • {order.items} itens
                    </p>
                    <p className="text-xs text-slate-500">
                      {order.date} às {order.time}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {getStatusBadge(order.status)}
                  <span className="font-semibold">{formatCurrency(order.value)}</span>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirmar Pedido
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}