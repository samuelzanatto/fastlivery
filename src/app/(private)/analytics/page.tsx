'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BarChart3, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Clock
} from 'lucide-react'

export default function AnalyticsPage() {
  // Mock data for analytics
  const stats = {
    revenue: {
      total: 12450.80,
      change: 15.2,
      trend: 'up'
    },
    orders: {
      total: 145,
      change: 8.1,
      trend: 'up'
    },
    customers: {
      total: 89,
      change: 12.3,
      trend: 'up'
    },
    avgOrderValue: {
      total: 85.90,
      change: -2.1,
      trend: 'down'
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const topProducts = [
    { name: 'Pizza Margherita', orders: 45, revenue: 1347.50 },
    { name: 'Hambúrguer Artesanal', orders: 38, revenue: 969.00 },
    { name: 'Lasanha à Bolonhesa', orders: 25, revenue: 822.50 },
    { name: 'Salada Caesar', orders: 22, revenue: 462.00 },
    { name: 'Batata Frita', orders: 35, revenue: 315.00 }
  ]

  const recentActivity = [
    { time: '10:30', event: 'Novo pedido #145', type: 'order' },
    { time: '10:15', event: 'Cliente João S. fez avaliação 5★', type: 'review' },
    { time: '09:45', event: 'Produto "Pizza Margherita" em baixo estoque', type: 'alert' },
    { time: '09:30', event: 'Pedido #144 entregue', type: 'delivery' },
    { time: '09:15', event: 'Nova avaliação 4★ recebida', type: 'review' }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Relatórios e Analytics</h1>
        <p className="text-slate-600">Acompanhe o desempenho do seu restaurante</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: 'Receita Total',
            value: formatCurrency(stats.revenue.total),
            change: stats.revenue.change,
            trend: stats.revenue.trend,
            icon: DollarSign,
            color: 'text-green-600'
          },
          {
            title: 'Total de Pedidos',
            value: stats.orders.total.toString(),
            change: stats.orders.change,
            trend: stats.orders.trend,
            icon: ShoppingBag,
            color: 'text-blue-600'
          },
          {
            title: 'Clientes que Compraram',
            value: stats.customers.total.toString(),
            change: stats.customers.change,
            trend: stats.customers.trend,
            icon: Users,
            color: 'text-purple-600'
          },
          {
            title: 'Ticket Médio',
            value: formatCurrency(stats.avgOrderValue.total),
            change: stats.avgOrderValue.change,
            trend: stats.avgOrderValue.trend,
            icon: Clock,
            color: 'text-orange-600'
          }
        ].map((stat, index) => {
          const Icon = stat.icon
          const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-slate-800">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <TrendIcon 
                      className={`h-4 w-4 mr-1 ${
                        stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`} 
                    />
                    <span 
                      className={`text-sm font-medium ${
                        stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {Math.abs(stat.change)}%
                    </span>
                    <span className="text-sm text-slate-600 ml-1">
                      vs mês anterior
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Produtos Mais Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-medium text-orange-600">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{product.name}</p>
                        <p className="text-sm text-slate-500">{product.orders} pedidos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">
                        {formatCurrency(product.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'order' ? 'bg-blue-500' :
                      activity.type === 'review' ? 'bg-yellow-500' :
                      activity.type === 'alert' ? 'bg-red-500' :
                      'bg-green-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-800">{activity.event}</p>
                      <p className="text-xs text-slate-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Chart Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Vendas por Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600">Gráfico de vendas será implementado aqui</p>
                <p className="text-sm text-slate-500">Integração com biblioteca de gráficos em breve</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
