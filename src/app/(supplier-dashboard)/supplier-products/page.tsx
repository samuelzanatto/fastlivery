'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardHeader, DashboardHeaderButton } from "@/components/ui/dashboard-header"
import { Plus, Package2, Edit3, Eye, MoreVertical } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function SupplierProducts() {
  // Mock data - substituir por dados reais
  const products = [
    {
      id: "1",
      name: "Batata Francesa Premium",
      category: "Acompanhamentos",
      price: 30.00,
      stock: 150,
      status: "Ativo",
      sales: 89
    },
    {
      id: "2",
      name: "Molho Especial da Casa",
      category: "Molhos",
      price: 20.00,
      stock: 75,
      status: "Ativo",
      sales: 67
    },
    {
      id: "3",
      name: "Hambúrguer Artesanal",
      category: "Proteínas",
      price: 50.00,
      stock: 30,
      status: "Baixo Estoque",
      sales: 45
    },
    {
      id: "4",
      name: "Pão Brioche",
      category: "Pães",
      price: 15.00,
      stock: 0,
      status: "Sem Estoque",
      sales: 23
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Ativo':
        return <Badge variant="outline" className="text-green-600 border-green-600">Ativo</Badge>
      case 'Baixo Estoque':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Baixo Estoque</Badge>
      case 'Sem Estoque':
        return <Badge variant="outline" className="text-red-600 border-red-600">Sem Estoque</Badge>
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
        title="Meus Produtos"
        description="Gerencie seu catálogo de produtos no marketplace"
      >
        <DashboardHeaderButton>
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </DashboardHeaderButton>
      </DashboardHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total de Produtos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">156</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Produtos Ativos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-green-600">142</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Baixo Estoque</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-yellow-600">8</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Sem Estoque</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-red-600">6</div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
          <CardDescription>
            Visualize e gerencie todos os seus produtos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center">
                    <Package2 className="h-6 w-6 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-800 truncate">{product.name}</h3>
                    <p className="text-sm text-slate-600">{product.category}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(product.price)}</div>
                    <div className="text-sm text-slate-600">Preço</div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium">{product.stock}</div>
                    <div className="text-sm text-slate-600">Estoque</div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium">{product.sales}</div>
                    <div className="text-sm text-slate-600">Vendas</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(product.status)}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Package2 className="h-4 w-4 mr-2" />
                        Desativar
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