'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  CheckCircle,
  ChefHat,
  Package,
  Truck,
  XCircle,
  Plus,
  ArrowLeft,
  RefreshCw,
  Utensils
} from 'lucide-react'
import Link from 'next/link'
import { getPublicOrder, addItemsToOrder } from '@/actions/orders/public-orders'
import { useCart } from '@/contexts/cart-context'
import { ChatButton } from '@/components/chat/chat-button'
import { ChatSheet } from '@/components/chat/chat-sheet'

// Status mapping
const STATUS_CONFIG = {
  PENDING: {
    label: 'Pendente',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    description: 'Aguardando confirmação do estabelecimento'
  },
  CONFIRMED: {
    label: 'Confirmado',
    icon: CheckCircle,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Seu pedido foi confirmado!'
  },
  PREPARING: {
    label: 'Preparando',
    icon: ChefHat,
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    description: 'Seu pedido está sendo preparado'
  },
  READY: {
    label: 'Pronto',
    icon: Package,
    color: 'bg-green-100 text-green-800 border-green-300',
    description: 'Seu pedido está pronto!'
  },
  OUT_FOR_DELIVERY: {
    label: 'Em Entrega',
    icon: Truck,
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Seu pedido está a caminho'
  },
  DELIVERED: {
    label: 'Entregue',
    icon: CheckCircle,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Pedido entregue com sucesso!'
  },
  CANCELLED: {
    label: 'Cancelado',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-300',
    description: 'Este pedido foi cancelado'
  }
} as const

type OrderStatus = keyof typeof STATUS_CONFIG

interface OrderData {
  id: string
  businessId: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: number
  subtotal: number
  deliveryFee: number
  type: string
  tableNumber?: string
  customerName: string
  customerPhone: string
  createdAt: Date
  items: Array<{
    id: string
    quantity: number
    price: number
    notes: string | null
    product: { name: string }
  }>
}

// Statuses que permitem adicionar itens
const ADDABLE_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING']

export default function OrderTrackingPage() {
  const params = useParams()
  const router = useRouter()
  const { items: cartItems, clearCart, getTotalPrice } = useCart()

  const [order, setOrder] = useState<OrderData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddingItems, setIsAddingItems] = useState(false)
  const [showAddItemsSuccess, setShowAddItemsSuccess] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)

  const slug = params.slug as string
  const orderId = params.orderId as string

  const loadOrder = useCallback(async () => {
    try {
      const result = await getPublicOrder(orderId, slug)
      if (result.success && result.data) {
        setOrder(result.data)
        setError(null)
      } else if (!result.success) {
        setError((result as { error?: string }).error || 'Pedido não encontrado')
      }
    } catch {
      setError('Erro ao carregar pedido')
    } finally {
      setIsLoading(false)
    }
  }, [orderId, slug])

  useEffect(() => {
    loadOrder()
    // Auto-refresh a cada 30s para pedidos ativos
    const interval = setInterval(() => {
      if (order && ADDABLE_STATUSES.includes(order.status)) {
        loadOrder()
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [loadOrder, order])

  const handleAddItems = async () => {
    if (cartItems.length === 0 || !order) return

    setIsAddingItems(true)
    try {
      const result = await addItemsToOrder({
        orderId: order.id,
        businessSlug: slug,
        items: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.finalPrice,
          notes: item.optionsText || undefined,
          selectedOptions: item.selectedOptions
        }))
      })

      if (result.success) {
        clearCart()
        setShowAddItemsSuccess(true)
        setTimeout(() => setShowAddItemsSuccess(false), 3000)
        // Recarregar pedido com novos itens
        await loadOrder()
      } else {
        alert(result.error || 'Erro ao adicionar itens')
      }
    } catch {
      alert('Erro ao adicionar itens ao pedido')
    } finally {
      setIsAddingItems(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <XCircle className="h-16 w-16 text-red-400 mb-4" />
        <h1 className="text-xl font-semibold text-slate-800 mb-2">Pedido não encontrado</h1>
        <p className="text-slate-600 mb-6">{error || 'Não foi possível localizar este pedido.'}</p>
        <Link href={`/${slug}`}>
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Menu
          </Button>
        </Link>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[order.status as OrderStatus] || STATUS_CONFIG.PENDING
  const StatusIcon = statusConfig.icon
  const canAddItems = ADDABLE_STATUSES.includes(order.status)
  const isDineIn = order.type === 'DINE_IN'
  const cartTotal = getTotalPrice()

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={`/${slug}`} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">Voltar</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadOrder}
            className="text-slate-500"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Status Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Pedido #{order.orderNumber}</CardTitle>
              <Badge className={statusConfig.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 text-sm mb-3">{statusConfig.description}</p>

            {isDineIn && order.tableNumber && (
              <div className="flex items-center gap-2 text-sm bg-cyan-50 text-cyan-700 px-3 py-2 rounded-lg mb-3">
                <Utensils className="h-4 w-4" />
                <span>Mesa {order.tableNumber}</span>
              </div>
            )}

            <div className="text-xs text-slate-500">
              Criado em {new Date(order.createdAt).toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>

        {/* Success Message */}
        <AnimatePresence>
          {showAddItemsSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-green-100 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2"
            >
              <CheckCircle className="h-5 w-5" />
              <span>Itens adicionados com sucesso!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Items List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Itens do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start py-2 border-b last:border-0">
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.quantity}x {item.product.name}</p>
                  {item.notes && (
                    <p className="text-xs text-slate-500">{item.notes}</p>
                  )}
                </div>
                <p className="text-sm font-medium">
                  R$ {(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}

            {/* Totals */}
            <div className="pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>R$ {order.subtotal.toFixed(2)}</span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Taxa de entrega</span>
                  <span>R$ {order.deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>R$ {order.total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add More Items Section (only for dine-in with active status) */}
        {isDineIn && canAddItems && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Plus className="h-5 w-5 text-orange-600" />
                <h3 className="font-semibold text-orange-900">Adicionar mais itens?</h3>
              </div>
              <p className="text-sm text-orange-700 mb-4">
                Você pode adicionar mais itens ao seu pedido enquanto ele ainda está em preparo.
              </p>
              <Link href={`/${slug}?table=${order.tableNumber}&order=${order.id}`}>
                <Button className="w-full bg-orange-500 hover:bg-orange-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Ver Cardápio e Adicionar Itens
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Floating Cart for Adding Items */}
      {cartItems.length > 0 && canAddItems && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50"
        >
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium">{cartItems.length} novo(s) item(ns)</p>
                <p className="text-sm text-slate-600">+ R$ {cartTotal.toFixed(2)}</p>
              </div>
              <Button
                onClick={handleAddItems}
                disabled={isAddingItems}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isAddingItems ? 'Adicionando...' : 'Adicionar ao Pedido'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Chat UI */}
      <ChatButton
        onClick={() => setIsChatOpen(true)}
        unreadCount={0}
      />

      <ChatSheet
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        businessId={order.businessId}
        customerPhone={order.customerPhone}
        customerName={order.customerName}
        businessName={slug}
      />
    </div>
  )
}
