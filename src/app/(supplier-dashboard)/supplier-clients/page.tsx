'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/ui/dashboard-header"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { 
  Building2, 
  Star, 
  Eye,
  MessageSquare,
  MoreVertical
} from "lucide-react"

export default function SupplierClients() {
  // Mock data - substituir por dados reais
  const clients = [
    {
      id: "1",
      name: "Restaurante Bella Vista",
      type: "Restaurante Italiano",
      orders: 45,
      totalValue: 12500.00,
      rating: 4.8,
      status: "Ativo",
      joinDate: "2023-08-15"
    },
    {
      id: "2", 
      name: "Pizzaria do Centro",
      type: "Pizzaria",
      orders: 32,
      totalValue: 8900.00,
      rating: 4.6,
      status: "Ativo",
      joinDate: "2023-09-20"
    },
    {
      id: "3",
      name: "Lanchonete Express",
      type: "Fast Food",
      orders: 28,
      totalValue: 6200.00,
      rating: 4.3,
      status: "Inativo",
      joinDate: "2023-07-10"
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Ativo':
        return <Badge variant="outline" className="text-green-600 border-green-600">Ativo</Badge>
      case 'Inativo':
        return <Badge variant="outline" className="text-gray-600 border-gray-600">Inativo</Badge>
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <DashboardHeader
        title="Meus Clientes"
        description="Gerencie seu relacionamento com clientes parceiros"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total de Clientes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">23</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Clientes Ativos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-green-600">18</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Novos Este Mês</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-blue-600">5</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Avaliação Média</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-yellow-600">4.6</div>
          </CardContent>
        </Card>
      </div>

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>Seus clientes parceiros no marketplace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clients.map((client) => (
              <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">{client.name}</h3>
                    <p className="text-sm text-slate-600">{client.type}</p>
                    <p className="text-xs text-slate-500">
                      Cliente desde {formatDate(client.joinDate)} • {client.orders} pedidos
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium">{client.rating}</span>
                    </div>
                    <p className="text-xs text-slate-500">avaliação</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(client.totalValue)}</p>
                    <p className="text-xs text-slate-500">total em compras</p>
                  </div>
                  
                  {getStatusBadge(client.status)}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Enviar Mensagem
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