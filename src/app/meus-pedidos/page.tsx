'use client'

import { useState, useEffect } from 'react'
import { PWAHeader } from '@/components/layout/pwa-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingBag, Star, MapPin, Clock, Phone } from 'lucide-react'
import Link from 'next/link'

// Formatação simples de moeda
import { formatCurrency } from '@/lib/utils/formatters'
import { getMyOrders } from '@/actions/customer/my-orders'

interface CustomerOrder {
  id: string
  orderNumber: string
  businessName: string
  businessLogo?: string
  status: string
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



export default function PedidosPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setIsLoading(true)
    try {
      const result = await getMyOrders()
      if (result.success && result.data) {
        setOrders(result.data.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          businessName: order.business.name,
          businessLogo: order.business.image || undefined,
          status: order.status as any, // Cast to match type, will handle mapping in render
          total: order.total,
          createdAt: new Date(order.createdAt).toISOString(),
          deliveryAddress: order.deliveryAddress || 'Endereço não informado', // Handle null address
          phone: '', // Phone not fetched yet, maybe not needed for display
          paymentMethod: order.paymentMethod || 'Não informado', // Handle null payment
          items: order.items.map(item => ({
            id: item.product.name, // Use name as ID for now or fetch item ID if available
            name: item.product.name,
            quantity: item.quantity,
            price: item.price,
            image: item.product.image || undefined,
            notes: item.notes || undefined
          })),
          deliveryFee: order.deliveryFee,
          discount: order.discount,
          // Fields not yet in backend response:
          estimatedDelivery: undefined,
          trackingUrl: undefined,
          rating: undefined,
          review: undefined,
          cancellationReason: undefined
        })))
      } else {
        console.error("Failed to load orders:", result.error)
      }
    } catch (error) {
      console.error("Error loading orders:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Update statusColors and statusLabels to match Prisma Enums if needed, or handle case insensitivity
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: 'Pendente',
      CONFIRMED: 'Confirmado',
      PREPARING: 'Preparando',
      READY: 'Pronto',
      OUT_FOR_DELIVERY: 'Saiu para entrega',
      DELIVERED: 'Entregue',
      CANCELLED: 'Cancelado'
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PREPARING: 'bg-blue-100 text-blue-800',
      READY: 'bg-green-100 text-green-800',
      OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800'
    }
    return colorMap[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-white pb-4">
      <PWAHeader title="Meus Pedidos" showBackButton={true} noBorder={true} className="lg:hidden" />

      <div className="container mx-auto px-4 pt-20 lg:pt-8">


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
                    <Badge className={`${getStatusColor(order.status)} border-0`}>
                      {getStatusLabel(order.status)}
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
                          className={`h-4 w-4 ${i < order.rating! ? 'fill-orange-400 text-orange-400' : 'text-slate-200'
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
