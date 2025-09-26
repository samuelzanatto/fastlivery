'use client'

import { useState, useEffect } from 'react'
import { PWAHeader } from '@/components/layout/pwa-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingBag, RefreshCw, Plus, Star, MapPin, Clock, Phone } from 'lucide-react'
import Link from 'next/link'

// Formatação simples de moeda
import { formatCurrency } from '@/lib/utils/formatters'

interface CustomerOrder {
  id: string
  orderNumber: string
  businessName: string
  businessLogo?: string
  status: 'pending' | 'preparing' | 'on_way' | 'delivered' | 'cancelled'
  total: number
  createdAt: string
  estimatedDelivery?: string
  deliveryAddress: string
  phone: string
  paymentMethod: string
  items: Array<{
    id: string
    name: string
    quantity: number
    price: number
    image?: string
    notes?: string
  }>
  deliveryFee: number
  discount: number
  rating?: number
  review?: string
  cancellationReason?: string
  trackingUrl?: string
}

const statusLabels = {
  pending: 'Pendente',
  preparing: 'Preparando',
  on_way: 'A caminho',
  delivered: 'Entregue',
  cancelled: 'Cancelado'
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800', 
  on_way: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setIsLoading(true)
    // Simular carregamento de pedidos
    setTimeout(() => {
      setOrders([
        {
          id: 'ord_001',
          orderNumber: '#1234',
          businessName: 'Burger King',
          businessLogo: '/uploads/burger-king.png',
          status: 'on_way',
          total: 35.90,
          createdAt: '2025-01-15T14:30:00Z',
          estimatedDelivery: '2025-01-15T15:00:00Z',
          deliveryAddress: 'Rua das Flores, 123 - Apto 45',
          phone: '+55 11 99999-9999',
          paymentMethod: 'Cartão de Crédito (**** 1234)',
          items: [
            { 
              id: 'item_1',
              name: 'Whopper', 
              quantity: 1, 
              price: 25.90,
              notes: 'Sem cebola'
            },
            { 
              id: 'item_2',
              name: 'Batata Grande', 
              quantity: 1, 
              price: 10.00
            }
          ],
          deliveryFee: 3.00,
          discount: 0,
          trackingUrl: 'https://maps.google.com/tracking/123'
        },
        {
          id: 'ord_002',
          orderNumber: '#1235',
          businessName: 'Pizza Hut',
          status: 'delivered',
          total: 42.50,
          createdAt: '2025-01-14T19:15:00Z',
          estimatedDelivery: '2025-01-14T20:00:00Z',
          deliveryAddress: 'Rua das Flores, 123 - Apto 45',
          phone: '+55 11 99999-9999',
          paymentMethod: 'PIX',
          items: [
            { 
              id: 'item_3',
              name: 'Pizza Margherita M', 
              quantity: 1, 
              price: 39.50,
              notes: 'Massa fina'
            }
          ],
          deliveryFee: 3.00,
          discount: 0,
          rating: 5,
          review: 'Pizza deliciosa, chegou quentinha!'
        }
      ])
      setIsLoading(false)
    }, 1000)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PWAHeader title="Meus Pedidos" showBackButton={true} noBorder={true} className="lg:hidden" />
        <div className="container mx-auto px-4 pt-20 lg:pt-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg p-4 shadow-sm animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-slate-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                  </div>
                  <div className="w-20 h-6 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-4">
      <PWAHeader title="Meus Pedidos" showBackButton={true} noBorder={true} className="lg:hidden" />
      
      <div className="container mx-auto px-4 pt-20 lg:pt-8">
        {/* Header Actions */}
        <div className="mb-6 flex gap-3">
          <Button variant="outline" onClick={loadOrders} disabled={isLoading} className="flex-1 border-slate-200 hover:bg-slate-50">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button asChild className="flex-1 bg-orange-500 hover:bg-orange-600">
            <Link href="/">
              <Plus className="h-4 w-4 mr-2" />
              Novo Pedido
            </Link>
          </Button>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">
              Nenhum pedido encontrado
            </h3>
            <p className="text-slate-600 mb-6">
              Você ainda não fez nenhum pedido
            </p>
            <Button asChild className="bg-orange-500 hover:bg-orange-600">
              <Link href="/">
                Fazer primeiro pedido
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">{order.businessName}</h3>
                      <p className="text-sm text-slate-500">{order.orderNumber}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(order.createdAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={`${statusColors[order.status]} border-0`}>
                      {statusLabels[order.status]}
                    </Badge>
                    <p className="text-lg font-semibold text-slate-900 mt-1">
                      {formatCurrency(order.total)}
                    </p>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2 mb-4 pl-15">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-slate-600">
                        {item.quantity}x {item.name}
                        {item.notes && (
                          <span className="text-slate-400 ml-1">({item.notes})</span>
                        )}
                      </span>
                      <span className="text-slate-500">{formatCurrency(item.price)}</span>
                    </div>
                  ))}
                  {order.deliveryFee > 0 && (
                    <div className="flex justify-between text-sm border-t border-slate-50 pt-2 mt-2">
                      <span className="text-slate-600">Taxa de entrega</span>
                      <span className="text-slate-500">{formatCurrency(order.deliveryFee)}</span>
                    </div>
                  )}
                </div>

                {/* Delivery Info */}
                <div className="space-y-2 text-xs text-slate-500 mb-4 pl-15">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span>{order.deliveryAddress}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 flex-shrink-0" />
                    <span>{order.paymentMethod}</span>
                  </div>
                  {order.estimatedDelivery && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span>Previsão: {new Date(order.estimatedDelivery).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {order.status === 'delivered' && !order.rating && (
                    <Button variant="outline" size="sm" className="flex-1 border-slate-200 hover:bg-slate-50">
                      <Star className="h-4 w-4 mr-1" />
                      Avaliar
                    </Button>
                  )}
                  {(order.status === 'delivered' || order.status === 'cancelled') && (
                    <Button variant="outline" size="sm" className="flex-1 border-slate-200 hover:bg-slate-50">
                      Pedir novamente
                    </Button>
                  )}
                  {order.status === 'on_way' && order.trackingUrl && (
                    <Button variant="outline" size="sm" className="flex-1 border-slate-200 hover:bg-slate-50">
                      Rastrear pedido
                    </Button>
                  )}
                </div>

                {/* Rating */}
                {order.rating && (
                  <div className="mt-3 pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-2 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < order.rating! ? 'fill-orange-400 text-orange-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    {order.review && (
                      <p className="text-sm text-slate-600">{order.review}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
