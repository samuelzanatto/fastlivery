'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardHeader, DashboardHeaderButton } from "@/components/ui/dashboard-header"
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  DollarSign, 
  Users, 
  ShoppingCart,
  Calendar,
  Download
} from "lucide-react"

export default function SupplierAnalytics() {
  const metrics = [
    {
      title: "Receita Total",
      value: "R$ 45.231,90",
      change: "+20.1%",
      trend: "up",
      icon: DollarSign,
      description: "vs. mês anterior"
    },
    {
      title: "Pedidos",
      value: "2.350",
      change: "+15.3%",
      trend: "up",
      icon: ShoppingCart,
      description: "vs. mês anterior"
    },
    {
      title: "Clientes Ativos",
      value: "573",
      change: "+5.2%",
      trend: "up",
      icon: Users,
      description: "vs. mês anterior"
    },
    {
      title: "Produtos Vendidos",
      value: "8.945",
      change: "-2.1%",
      trend: "down",
      icon: Package,
      description: "vs. mês anterior"
    }
  ]

  const topProducts = [
    { name: "Farinha de Trigo Premium", sales: 450, revenue: "R$ 2.250,00", growth: "+12%" },
    { name: "Óleo de Soja Extra", sales: 380, revenue: "R$ 1.900,00", growth: "+8%" },
    { name: "Açúcar Cristal", sales: 320, revenue: "R$ 1.280,00", growth: "+15%" },
    { name: "Fermento Biológico", sales: 250, revenue: "R$ 875,00", growth: "+22%" },
    { name: "Sal Refinado", sales: 180, revenue: "R$ 540,00", growth: "+5%" }
  ]

  const topClients = [
    { name: "Pizzaria Italiana", orders: 45, revenue: "R$ 3.200,00", status: "premium" },
    { name: "Restaurante do Chef", orders: 38, revenue: "R$ 2.850,00", status: "gold" },
    { name: "Padaria Central", orders: 32, revenue: "R$ 2.400,00", status: "regular" },
    { name: "Burger House", orders: 28, revenue: "R$ 2.100,00", status: "regular" },
    { name: "Café da Esquina", orders: 25, revenue: "R$ 1.875,00", status: "regular" }
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <DashboardHeader
        title="Analytics"
        description="Acompanhe o desempenho das suas vendas"
      >
        <Button variant="outline">
          <Calendar className="h-4 w-4 mr-2" />
          Este Mês
        </Button>
        <DashboardHeaderButton>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </DashboardHeaderButton>
      </DashboardHeader>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground flex items-center">
                  {metric.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                  )}
                  <span className={metric.trend === "up" ? "text-green-600" : "text-red-600"}>
                    {metric.change}
                  </span>
                  <span className="ml-1">{metric.description}</span>
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
            <CardDescription>Ranking de produtos por volume de vendas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-medium text-orange-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.sales} unidades</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{product.revenue}</p>
                    <Badge variant="secondary" className="text-green-600 bg-green-50">
                      {product.growth}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Principais Clientes</CardTitle>
            <CardDescription>Clientes com maior volume de pedidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topClients.map((client, index) => (
                <div key={client.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-muted-foreground">{client.orders} pedidos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{client.revenue}</p>
                    <Badge 
                      variant={client.status === "premium" ? "default" : client.status === "gold" ? "secondary" : "outline"}
                      className={
                        client.status === "premium" 
                          ? "bg-purple-100 text-purple-800" 
                          : client.status === "gold" 
                          ? "bg-yellow-100 text-yellow-800"
                          : ""
                      }
                    >
                      {client.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Receita Mensal</CardTitle>
            <CardDescription>Evolução da receita nos últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
              <div className="text-center text-gray-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Gráfico de Receita</p>
                <p className="text-sm">Implementação em desenvolvimento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Categoria</CardTitle>
            <CardDescription>Vendas por categoria de produto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Ingredientes</span>
                <span className="text-sm font-medium">45%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: "45%" }}></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Embalagens</span>
                <span className="text-sm font-medium">25%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: "25%" }}></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Equipamentos</span>
                <span className="text-sm font-medium">20%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: "20%" }}></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Outros</span>
                <span className="text-sm font-medium">10%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: "10%" }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}