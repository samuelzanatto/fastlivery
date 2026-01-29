'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  CheckCircle,
  ChefHat,
  Package,
  Truck,
  XCircle,
  Plus,
  X,
  RefreshCw,
  Utensils,
  ChevronUp,
  ShoppingBag
} from 'lucide-react'
import Link from 'next/link'
import { getPublicOrder, addItemsToOrder } from '@/actions/orders/public-orders'
import { useCart } from '@/contexts/cart-context'
import { supabase } from '@/lib/supabase'

// Status mapping
const STATUS_CONFIG = {
  PENDING: {
    label: 'Pendente',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    description: 'Aguardando confirmação'
  },
  CONFIRMED: {
    label: 'Confirmado',
    icon: CheckCircle,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Pedido confirmado!'
  },
  PREPARING: {
    label: 'Preparando',
    icon: ChefHat,
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    description: 'Sendo preparado'
  },
  READY: {
    label: 'Pronto',
    icon: Package,
    color: 'bg-green-100 text-green-800 border-green-300',
    description: 'Pronto para retirada!'
  },
  OUT_FOR_DELIVERY: {
    label: 'Em Entrega',
    icon: Truck,
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'A caminho'
  },
  DELIVERED: {
    label: 'Entregue',
    icon: CheckCircle,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Entregue!'
  },
  CANCELLED: {
    label: 'Cancelado',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-300',
    description: 'Cancelado'
  }
} as const

type OrderStatus = keyof typeof STATUS_CONFIG

interface OrderData {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: number
  subtotal: number
  deliveryFee: number
  type: string
  tableNumber?: string
  customerName: string
  createdAt: Date
  items: Array<{
    id: string
    quantity: number
    price: number
    notes: string | null
    product: { name: string }
  }>
}

const ADDABLE_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING']

interface OrderTrackingSheetProps {
  orderId: string
  businessSlug: string
  isOpen: boolean
  onClose: () => void
  onAddMoreItems?: () => void
}

export function OrderTrackingSheet({
  orderId,
  businessSlug,
  isOpen,
  onClose,
  onAddMoreItems
}: OrderTrackingSheetProps) {
  const { items: cartItems, clearCart, getTotalPrice } = useCart()

  const [order, setOrder] = useState<OrderData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddingItems, setIsAddingItems] = useState(false)
  const [showAddItemsSuccess, setShowAddItemsSuccess] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const loadOrder = useCallback(async () => {
    if (!orderId) return
    try {
      const result = await getPublicOrder(orderId, businessSlug)
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
  }, [orderId, businessSlug])

  useEffect(() => {
    if (isOpen && orderId) {
      loadOrder()

      // Inscrever no Realtime para atualizações instantâneas
      console.log('[OrderTrackingSheet] Monitorando pedido:', orderId)
      const channel = supabase
        .channel(`tracking_sheet_${orderId}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Escutar qualquer mudança (UPDATE, etc)
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${orderId}`
          },
          (payload) => {
            console.log('[OrderTrackingSheet] Atualização recebida:', payload)
            loadOrder()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [isOpen, orderId, loadOrder])

  const handleAddItems = async () => {
    if (cartItems.length === 0 || !order) return

    setIsAddingItems(true)
    try {
      const result = await addItemsToOrder({
        orderId: order.id,
        businessSlug,
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

  if (!isOpen) return null

  const statusConfig = order ? (STATUS_CONFIG[order.status as OrderStatus] || STATUS_CONFIG.PENDING) : STATUS_CONFIG.PENDING
  const StatusIcon = statusConfig.icon
  const canAddItems = order && ADDABLE_STATUSES.includes(order.status)
  const isDineIn = order?.type === 'DINE_IN'
  const cartTotal = getTotalPrice()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag={order?.status === 'DELIVERED' ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 100 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (order?.status === 'DELIVERED' && info.offset.y > 100) {
                onClose()
              }
            }}
            className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 ${isExpanded ? 'max-h-[90vh]' : 'max-h-[60vh]'
              } overflow-hidden flex flex-col`}
          >
            {/* Handle */}
            <div
              className="flex justify-center pt-3 pb-2 cursor-pointer"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <div className={`w-12 h-1.5 rounded-full ${order?.status === 'DELIVERED' ? 'bg-slate-400' : 'bg-slate-300'}`} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${statusConfig.color}`}>
                  <StatusIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">
                    {isLoading ? 'Carregando...' : order ? `Pedido #${order.orderNumber}` : 'Erro'}
                  </h2>
                  <p className="text-sm text-slate-600">{statusConfig.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={loadOrder}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onClose}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">
                  <XCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{error}</p>
                </div>
              ) : order ? (
                <div className="space-y-4">
                  {/* Success Message */}
                  <AnimatePresence>
                    {showAddItemsSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-green-100 text-green-800 px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Itens adicionados!</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Mesa info */}
                  {isDineIn && order.tableNumber && (
                    <div className="flex items-center gap-2 text-sm bg-cyan-50 text-cyan-700 px-3 py-2 rounded-lg">
                      <Utensils className="h-4 w-4" />
                      <span>Mesa {order.tableNumber}</span>
                    </div>
                  )}

                  {/* Items List */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm text-slate-500 uppercase tracking-wide">Itens</h3>
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start py-2 border-b border-slate-100 last:border-0">
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
                  </div>

                  {/* Totals */}
                  <div className="bg-slate-50 rounded-lg p-3 space-y-1">
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
                    <div className="flex justify-between font-bold text-base pt-1 border-t border-slate-200">
                      <span>Total</span>
                      <span>R$ {order.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Add More Items CTA */}
                  {isDineIn && canAddItems && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-sm text-orange-700 mb-2">
                        Quer pedir mais alguma coisa?
                      </p>
                      <Button
                        className="w-full bg-orange-500 hover:bg-orange-600"
                        onClick={() => {
                          onClose()
                          onAddMoreItems?.()
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Ver Cardápio
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Footer - Cart items to add */}
            {cartItems.length > 0 && canAddItems && (
              <div className="border-t bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{cartItems.length} novo(s) item(ns)</p>
                    <p className="text-xs text-slate-600">+ R$ {cartTotal.toFixed(2)}</p>
                  </div>
                  <Button
                    onClick={handleAddItems}
                    disabled={isAddingItems}
                    className="bg-orange-500 hover:bg-orange-600"
                    size="sm"
                  >
                    {isAddingItems ? 'Adicionando...' : 'Adicionar ao Pedido'}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Floating button para mostrar quando tem pedido ativo
interface OrderTrackingButtonProps {
  orderId: string
  orderNumber?: string
  status?: string
  onClick: () => void
  onDismiss?: () => void
}

export function OrderTrackingButton({ orderId, orderNumber, status, onClick, onDismiss }: OrderTrackingButtonProps) {
  if (!orderId) return null

  const statusConfig = status ? (STATUS_CONFIG[status as OrderStatus] || STATUS_CONFIG.PENDING) : STATUS_CONFIG.PENDING
  const StatusIcon = statusConfig.icon

  return (
    <motion.button
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      drag={status === 'DELIVERED' ? 'y' : false}
      dragConstraints={{ top: 0, bottom: 100 }}
      dragElastic={0.2}
      onDragEnd={(_, info) => {
        if (status === 'DELIVERED' && info.offset.y > 50) {
          onDismiss?.()
        }
      }}
      onClick={onClick}
      className={`fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white border border-slate-200 shadow-lg rounded-2xl p-3 flex items-center gap-3 z-30 ${status === 'DELIVERED' ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
    >
      <div className={`p-2 rounded-full ${statusConfig.color}`}>
        <StatusIcon className="h-5 w-5" />
      </div>
      <div className="flex-1 text-left">
        <p className="font-medium text-sm">Pedido #{orderNumber || orderId.slice(0, 8)}</p>
        <p className="text-xs text-slate-600">{statusConfig.description}</p>
      </div>
      <ChevronUp className="h-5 w-5 text-slate-400" />
    </motion.button>
  )
}
