'use client'

import { useEffect, useState } from 'react'
import { Bell, MessageSquare, Package, DollarSign, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSupplierWhatsAppOrders } from '@/lib/realtime'
import { cn } from '@/lib/utils'

interface OrderNotificationsPanelProps {
  supplierId: string
  className?: string
}

export function OrderNotificationsPanel({ supplierId, className }: OrderNotificationsPanelProps) {
  const {
    whatsappOrders,
    isConnected: ordersConnected,
    newOrderCount,
    markOrdersSeen
  } = useSupplierWhatsAppOrders({ 
    supplierId: supplierId || '',
    enabled: !!supplierId 
  })

  const [showDropdown, setShowDropdown] = useState(false)

  // Marcar pedidos como vistos quando o dropdown é aberto
  useEffect(() => {
    if (showDropdown && newOrderCount > 0) {
      markOrdersSeen()
    }
  }, [showDropdown, newOrderCount, markOrdersSeen])

  // Últimos 5 pedidos para exibição rápida
  const recentOrders = whatsappOrders.slice(0, 5)

  const getOrderStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'preparing': return 'bg-orange-100 text-orange-800'
      case 'ready': return 'bg-green-100 text-green-800'
      case 'delivered': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getOrderStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      preparing: 'Preparando',
      ready: 'Pronto',
      out_for_delivery: 'Saiu para entrega',
      delivered: 'Entregue',
      cancelled: 'Cancelado'
    }
    
    return statusMap[status.toLowerCase()] || status
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Agora'
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`
    return date.toLocaleDateString()
  }

  return (
    <div className={cn("relative", className)}>
      <DropdownMenu open={showDropdown} onOpenChange={setShowDropdown}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative p-2"
          >
            <Bell className="h-5 w-5" />
            {newOrderCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0"
              >
                {newOrderCount > 9 ? '9+' : newOrderCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-96">
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Pedidos via WhatsApp</h4>
              <div className="flex items-center space-x-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  ordersConnected ? "bg-green-500" : "bg-red-500"
                )} />
                <span className="text-xs text-muted-foreground">
                  {ordersConnected ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {recentOrders.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Nenhum pedido ainda
                </h3>
                <p className="text-sm text-gray-500">
                  Os pedidos via WhatsApp aparecerão aqui em tempo real
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentOrders.map((order) => (
                  <div key={order.id} className="p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                    <div className="flex items-start space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${order.clientName}`} />
                        <AvatarFallback className="text-xs">
                          {order.clientName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {order.clientName}
                          </p>
                          <span className="text-xs text-gray-500">
                            {formatTime(order.createdAt)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-gray-600">
                            Pedido #{order.displayId}
                          </p>
                          <Badge className={getOrderStatusColor(order.status)} variant="secondary">
                            {getOrderStatusLabel(order.status)}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-1 text-gray-500">
                            <Package className="w-3 h-3" />
                            <span>{order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-green-600 font-medium">
                            <DollarSign className="w-3 h-3" />
                            <span>R$ {order.total.toFixed(2)}</span>
                          </div>
                        </div>

                        {order.observations && (
                          <p className="text-xs text-gray-500 mt-2 truncate">
                            💬 {order.observations}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {whatsappOrders.length > 5 && (
                  <div className="p-3 text-center border-t border-gray-100">
                    <Button variant="ghost" size="sm" className="text-xs">
                      Ver todos os pedidos ({whatsappOrders.length})
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// Componente para estatísticas em tempo real
export function SupplierStatsCards({ supplierId }: { supplierId: string }) {
  const { whatsappOrders, isConnected: ordersConnected } = useSupplierWhatsAppOrders({ 
    supplierId: supplierId || '',
    enabled: !!supplierId 
  })

  const today = new Date().toDateString()
  
  const todayOrders = whatsappOrders.filter(
    (order) => new Date(order.createdAt).toDateString() === today
  )
  
  const pendingOrders = whatsappOrders.filter(
    (order) => ['pending', 'confirmed', 'preparing'].includes(order.status.toLowerCase())
  )
  
  const todayRevenue = todayOrders.reduce((sum: number, order) => sum + order.total, 0)

  const stats = [
    {
      title: 'Pedidos Hoje',
      value: todayOrders.length,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Pedidos Pendentes',
      value: pendingOrders.length,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Receita Hoje',
      value: `R$ ${todayRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Status WhatsApp',
      value: ordersConnected ? 'Online' : 'Offline',
      icon: MessageSquare,
      color: ordersConnected ? 'text-green-600' : 'text-red-600',
      bgColor: ordersConnected ? 'bg-green-100' : 'bg-red-100',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={cn("p-2 rounded-full", stat.bgColor)}>
                <IconComponent className={cn("h-4 w-4", stat.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  ordersConnected ? "bg-green-500" : "bg-red-500"
                )} />
                <span>Tempo real</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}