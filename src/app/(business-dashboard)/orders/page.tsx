"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "@/lib/auth/auth-client"
import { useRouter, useParams } from 'next/navigation'
import { motion } from "framer-motion"

import { notify } from '@/lib/notifications/notify'
import { useOrdersRealtime } from '@/lib/realtime/hooks/use-orders-legacy'
// Uso centralizado do businessId via store (remove fetch local redundante)
import { useBusinessId } from '@/stores/business-store'
import { useBusinessContext } from '@/hooks/business/use-business-context'
import {
  ChevronDown,
  ChevronRight,
  Search,
  Clock,
  CheckCircle,
  Truck,
  Package,
  MapPin,
  User,
  ChevronLeft,
  MessageCircle,
  Send,
  X,
  Zap,
  Plus
} from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { DashboardHeader, DashboardHeaderButton } from '@/components/ui/dashboard-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import NewOrderDialog from '@/components/orders/new-order-dialog'
import { cn } from "@/lib/utils"
import { AdminOrderChatDialog } from '@/components/chat/admin-order-chat-dialog'

// Componente para cancelar pedido com reembolso
const CancelOrderButton = ({ order, onOrderCancelled }: {
  order: Order;
  onOrderCancelled: () => void
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleCancel = async () => {
    if (!reason.trim()) {
      notify('error', 'Por favor, informe o motivo do cancelamento')
      return
    }

    setIsLoading(true)
    try {
      const { cancelOrderWithRefund } = await import('@/actions/orders/orders')
      const result = await cancelOrderWithRefund(order.id, reason.trim())

      if (!result.success) {
        throw new Error(result.error || 'Erro ao cancelar pedido')
      }

      // Mostrar resultado do cancelamento
      if (result.data.refund && result.data.refund.amount > 0) {
        notify('success', `Pedido cancelado! Reembolso de ${new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL"
        }).format(result.data.refund.amount)} processado automaticamente.`)
      } else {
        notify('success', 'Pedido cancelado com sucesso!')
      }

      setIsOpen(false)
      setReason("")
      onOrderCancelled()

    } catch (error) {
      console.error('Erro ao cancelar pedido:', error)
      notify('error', error instanceof Error ? error.message : 'Erro ao cancelar pedido')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-xs h-7 px-2 bg-white text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={() => setIsOpen(true)}
      >
        <X className="h-3 w-3 mr-1" />
        Cancelar
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar Pedido #{order.displayId || order.id}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Ao cancelar este pedido:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  O status será alterado para &quot;Cancelado&quot;
                </li>
                {order.paymentStatus === 'paid' && order.type !== 'dine-in' && (
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                    O valor pago será reembolsado automaticamente
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  O cliente receberá uma notificação
                </li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Motivo do cancelamento *
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Produto em falta, problema na cozinha, etc."
                className="w-full"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false)
                  setReason("")
                }}
                disabled={isLoading}
              >
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={isLoading || !reason.trim()}
              >
                {isLoading ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Tipos UI (mapeados da API)
type OrderStatus = "pending" | "preparing" | "ready" | "delivered" | "cancelled"
type PaymentStatus = "pending" | "paid" | "failed" | "cancelled"
type OrderType = "delivery" | "pickup" | "dine-in"

interface Order {
  id: string
  displayId?: string
  customer: string
  items: string[]
  total: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  type: OrderType
  tableId?: string | null
  tableNumber?: number | string | null
  address?: string
  waiterName?: string
  observations?: string
  createdAt: string
  customerPhone?: string
}

// Componente de formatação de Observações
const FormattedObservations = ({ raw }: { raw: string }) => {
  let parsed: unknown = null
  let isJson = false
  try {
    if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
      parsed = JSON.parse(raw)
      isJson = true
    }
  } catch {
    // ignore parse error
  }

  // Caso especial: structure { address: {...} }
  if (isJson && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const root = parsed as Record<string, unknown>
    if (root.address && typeof root.address === 'object' && !Array.isArray(root.address)) {
      const a = root.address as Record<string, unknown>
      const lines: string[] = []
      const street = typeof a.street === 'string' ? a.street : ''
      const number = typeof a.number === 'string' || typeof a.number === 'number' ? String(a.number) : ''
      const neighborhood = typeof a.neighborhood === 'string' ? a.neighborhood : ''
      const city = typeof a.city === 'string' ? a.city : ''
      const state = typeof a.state === 'string' ? a.state : ''
      const zipcode = typeof a.zipcode === 'string' ? a.zipcode : ''
      if (street || number) lines.push(`${street}${number ? ', ' + number : ''}`.trim())
      if (neighborhood) lines.push(neighborhood)
      if (city || state) lines.push([city, state].filter(Boolean).join(' / '))
      if (zipcode) lines.push(`CEP: ${zipcode}`)
      return (
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Observações (endereço)</label>
          <div className="text-sm text-slate-700 bg-gray-50 border rounded-md p-2 space-y-0.5">
            {lines.filter(Boolean).map((l, i) => (<div key={i}>{l}</div>))}
          </div>
        </div>
      )
    }
  }

  if (isJson) {
    const pretty = JSON.stringify(parsed, null, 2)
    const tooLong = pretty.length > 800
    return (
      <div>
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Observações (JSON)</label>
        <pre className={"text-xs bg-gray-50 border rounded-md p-2 whitespace-pre-wrap font-mono max-h-56 overflow-auto" + (tooLong ? ' pr-3' : '')}>{pretty}</pre>
      </div>
    )
  }

  return (
    <div>
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Observações</label>
      <div className="text-sm text-slate-700 bg-gray-50 border rounded-md p-2">
        {raw}
      </div>
    </div>
  )
}

// ===== Helpers de Mapeamento (DB -> UI) =====
const mapDbOrderType = (raw?: string): OrderType => {
  if (!raw) return 'delivery'
  switch (raw.toUpperCase()) {
    case 'DELIVERY': return 'delivery'
    case 'PICKUP': return 'pickup'
    case 'DINE_IN': return 'dine-in'
    default: return 'delivery'
  }
}

const mapDbOrderStatus = (raw?: string): OrderStatus => {
  if (!raw) return 'pending'
  switch (raw.toUpperCase()) {
    case 'PENDING': return 'pending'
    case 'CONFIRMED':
    case 'PREPARING':
    case 'OUT_FOR_DELIVERY': return 'preparing'
    case 'READY': return 'ready'
    case 'DELIVERED': return 'delivered'
    case 'CANCELLED': return 'cancelled'
    default: return 'pending'
  }
}

const mapDbPaymentStatus = (raw?: string): PaymentStatus => {
  if (!raw) return 'pending'
  const v = raw.toUpperCase()
  // Normalizar variações possíveis de status de pagamento
  if ([
    'PENDING', 'IN_PROCESS', 'IN_PROCESSING', 'AUTHORIZED', 'IN_PROGRESS'
  ].includes(v)) return 'pending'
  if ([
    'APPROVED', 'ACCREDITED'
  ].includes(v)) return 'paid'
  if ([
    'REJECTED', 'DECLINED', 'FAILED'
  ].includes(v)) return 'failed'
  if ([
    'CANCELLED', 'CANCELED', 'REFUNDED', 'CHARGED_BACK'
  ].includes(v)) return 'cancelled'
  return 'pending'
} 

// ... imports
// ... imports



// ... StatusBadge, PaymentBadge, TypeBadge definitions

const OrderExpandedDetails = ({ order, onOrderUpdate, isHydrating, canEdit, canDelete }: { order: Order; onOrderUpdate: () => void; isHydrating?: boolean; canEdit?: boolean; canDelete?: boolean }) => {
  const businessId = useBusinessId()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isChatOpen, setIsChatOpen] = useState(false)

  // Realtime Unread Count for Business
  useEffect(() => {
    let channel: any = null

    async function setupChatListener() {
      // Precisa do telefone para identificar o cliente inequivocamente para o chat
      if (!businessId || !order.customerPhone) return

      try {
        // Reutiliza a lógica de busca/criação para obter o ID da conversa
        const { getOrCreateConversation } = await import('@/actions/chat/client-chat')
        const res = await getOrCreateConversation(businessId, order.customer, order.customerPhone)

        if (res.success && res.data) {
          setUnreadCount(res.data.unread_count_business || 0)

          const { supabase } = await import('@/lib/supabase')
          channel = supabase
            .channel(`unread_business:${res.data.id}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'conversations',
                filter: `id=eq.${res.data.id}`
              },
              (payload) => {
                const updated = payload.new as any
                setUnreadCount(updated.unread_count_business || 0)
              }
            )
            .subscribe()
        }
      } catch (e) {
        console.error('Error setup chat badge:', e)
      }
    }

    setupChatListener()

    return () => {
      if (channel) {
        import('@/lib/supabase').then(({ supabase }) => supabase.removeChannel(channel))
      }
    }
  }, [businessId, order.customer, order.customerPhone])

  const handleChatClick = () => {
    setIsChatOpen(true)
    // Opcional: resetar contador localmente ao abrir, mas o real-time deve tratar isso quando o dialog marcar como lido
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="overflow-hidden"
      >
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-slate-100">
          {/* Coluna 1: Itens */}
          <div className="space-y-3 min-w-0">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-500" />
              Itens do Pedido
            </h4>
            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
              {order.items && order.items.length > 0 ? (
                <ul className="space-y-2">
                  {order.items.map((item, index) => (
                    <li key={index} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-slate-400 mt-1">•</span>
                      <span className="break-all flex-1 min-w-0">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 italic">Sem itens registrados</p>
              )}
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Total</span>
                <span className="text-base font-bold text-slate-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Coluna 2: Detalhes da Entrega/Cliente */}
          <div className="space-y-3 min-w-0">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              Dados do Cliente
            </h4>
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="min-w-0">
                <label className="text-xs text-slate-500 uppercase font-semibold">Nome</label>
                <p className="text-sm text-slate-800 font-medium break-all whitespace-normal">{order.customer}</p>
              </div>

              {order.type === 'delivery' && (
                <div className="min-w-0">
                  <label className="text-xs text-slate-500 uppercase font-semibold flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Endereço
                  </label>
                  <p className="text-sm text-slate-700 break-all whitespace-normal">{order.address || "Endereço não informado"}</p>
                </div>
              )}

              {order.type === 'dine-in' && (
                <div>
                  <label className="text-xs text-slate-500 uppercase font-semibold">Mesa</label>
                  <p className="text-sm text-slate-700">Mesa {order.tableNumber || "?"}</p>
                </div>
              )}

              {order.observations && (
                <FormattedObservations raw={order.observations} />
              )}
            </div>
          </div>

          {/* Coluna 3: Ações */}
          <div className="space-y-3 min-w-0">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Ações Rápidas
            </h4>
            <div className="flex flex-col gap-2">
              <OrderActions order={order} onOrderUpdate={onOrderUpdate} />
              <Button
                variant="outline"
                className="w-full justify-start text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 relative"
                onClick={handleChatClick}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Abrir Chat com Cliente
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {canDelete && order.status !== 'cancelled' && order.status !== 'delivered' && (
                <CancelOrderButton
                  order={order}
                  onOrderCancelled={onOrderUpdate}
                />
              )}

              {/* Placeholder para outras ações futuras */}
              <Button variant="ghost" size="sm" className="w-full justify-start text-slate-500 text-xs" disabled>
                <Clock className="h-3 w-3 mr-2" />
                Histórico (Em breve)
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Dialog Integration */}
        {businessId && (
          <AdminOrderChatDialog
            isOpen={isChatOpen}
            onOpenChange={setIsChatOpen}
            orderId={order.displayId || order.id}
            customerName={order.customer}
            customerPhone={order.customerPhone}
            businessId={businessId}
          />
        )}
      </motion.div>
    </>
  )
}
// Remove ChatDialog component definition entirely if it's separate.
// But replace_file_content targets specific blocks.
// I will just modify ExpandedOrderRow to use router and remove ChatDialog usage.
// I will separately delete ChatDialog function if I can, or leave it unused for now (cleaner to remove).

// Componentes
const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const statusConfig = {
    pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-800 border border-yellow-300" },
    preparing: { label: "Preparando", className: "bg-blue-100 text-blue-800 border border-blue-300" },
    ready: { label: "Pronto", className: "bg-green-100 text-green-800 border border-green-300" },
    delivered: { label: "Entregue", className: "bg-emerald-100 text-emerald-800 border border-emerald-300" },
    cancelled: { label: "Cancelado", className: "bg-red-100 text-red-800 border border-red-300" },
  }

  const config = statusConfig[status]
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}

const PaymentBadge = ({ status }: { status: PaymentStatus }) => {
  const statusConfig = {
    pending: { label: "Pendente", className: "bg-orange-100 text-orange-800 border border-orange-300" },
    paid: { label: "Pago", className: "bg-green-100 text-green-800 border border-green-300" },
    failed: { label: "Falhou", className: "bg-red-100 text-red-800 border border-red-300" },
    cancelled: { label: "Cancelado", className: "bg-red-100 text-red-800 border border-red-300" },
  }

  const config = statusConfig[status]
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}

const TypeBadge = ({ type, tableNumber }: { type: OrderType; tableNumber?: number | string | null }) => {
  const typeConfig = {
    delivery: { label: "Delivery", icon: Truck, className: "bg-indigo-100 text-indigo-800 border border-indigo-300" },
    pickup: { label: "Retirada", icon: Package, className: "bg-amber-100 text-amber-800 border border-amber-300" },
    "dine-in": { label: `Mesa ${tableNumber || "?"}`, icon: User, className: "bg-cyan-100 text-cyan-800 border border-cyan-300" },
  }

  const config = typeConfig[type]

  return (
    <Badge variant="outline" className={cn("flex items-center gap-1", config.className)}>
      {config.label}
    </Badge>
  )
}

// Duplicate ExpandedOrderRow removed


// Componente de ações
const OrderActions = ({ order, onOrderUpdate }: { order: Order; onOrderUpdate: () => void }) => {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    setIsUpdating(true)
    try {
      const { updateOrderStatus } = await import('@/actions/orders/orders')

      const statusForApi = (() => {
        switch (newStatus) {
          case 'pending': return 'PENDING'
          case 'preparing': return 'PREPARING'
          case 'ready': return 'READY'
          case 'delivered': return 'DELIVERED'
          case 'cancelled': return 'CANCELLED'
        }
      })()

      const result = await updateOrderStatus(order.id, statusForApi)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao atualizar status do pedido')
      }

      notify('success', 'Status do pedido atualizado', { description: `Pedido #${order.displayId || order.id} agora está ${newStatus}.` })
      onOrderUpdate()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      notify('error', error instanceof Error ? error.message : 'Erro ao atualizar status')
    } finally {
      setIsUpdating(false)
    }
  }

  const getNextStatus = (): { status: OrderStatus; label: string; color: string; icon: typeof Clock } | null => {
    switch (order.status) {
      case "pending":
        return {
          status: "preparing",
          label: "Iniciar",
          color: "bg-slate-600 hover:bg-slate-700",
          icon: Clock
        }
      case "preparing":
        return {
          status: "ready",
          label: "Pronto",
          color: "bg-slate-600 hover:bg-slate-700",
          icon: CheckCircle
        }
      case "ready":
        return {
          status: "delivered",
          label: "Entregar",
          color: "bg-slate-600 hover:bg-slate-700",
          icon: Truck
        }
      default:
        return null
    }
  }

  const nextAction = getNextStatus()

  if (!nextAction) {
    return (
      <div className="text-center py-2">
        {order.status === "delivered" && (
          <div className="text-slate-600 text-sm font-medium">✓ Entregue</div>
        )}
        {order.status === "cancelled" && (
          <div className="text-slate-600 text-sm font-medium">✕ Cancelado</div>
        )}
      </div>
    )
  }

  return (
    <Button
      onClick={() => handleStatusUpdate(nextAction.status)}
      disabled={isUpdating}
      className={`w-full text-white font-medium text-sm h-8 ${nextAction.color} disabled:opacity-50`}
      size="sm"
    >
      <nextAction.icon className="h-3 w-3 mr-1" />
      {isUpdating ? "..." : nextAction.label}
    </Button>
  )
}

// Componente principal
export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [isNewOrderDialogOpen, setIsNewOrderDialogOpen] = useState(false)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState({ total: 0, pending: 0, preparing: 0, ready: 0 })
  // IDs que receberam highlight recentemente
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set())
  // Evita múltiplas animações se o mesmo pedido for atualizado logo após chegar
  const highlightTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({})
  // Evitar toasts duplicados de mudança de pagamento
  const lastPaymentToastRef = useRef<Record<string, string>>({})
  // Marca o instante em que um pedido foi inserido para ignorar o UPDATE logo em seguida
  const recentInsertsRef = useRef<Record<string, number>>({})
  const [totalPages, setTotalPages] = useState(1)
  const [newOffPageCount, setNewOffPageCount] = useState(0)

  // Obter dados da sessão para identificar a empresa
  const { data: _sessionData } = useSession()

  const businessId = useBusinessId()

  // Permissões de pedidos
  const { hasPermission } = useBusinessContext()
  const canCreate = hasPermission('orders', 'create') || hasPermission('orders', 'manage')
  const canEdit = hasPermission('orders', 'update') || hasPermission('orders', 'manage')
  const canDelete = hasPermission('orders', 'delete') || hasPermission('orders', 'manage')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: itemsPerPage.toString(),
      })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchTerm) params.set('search', searchTerm)

      const { getOrders } = await import('@/actions/orders/orders')
      const result = await getOrders(
        {
          status: statusFilter !== 'all' ? statusFilter as OrderStatus : undefined,
          search: searchTerm || undefined
        },
        {
          page: currentPage,
          pageSize: itemsPerPage
        }
      )

      if (!result.success) {
        throw new Error(result.error || 'Erro ao carregar pedidos')
      }

      setOrders(result.data.data.map(order => ({
        ...order,
        status: order.status as OrderStatus,
        paymentStatus: order.paymentStatus as PaymentStatus,
        type: order.type as OrderType
      })))
      setStats(result.data.stats)
      setTotalPages(result.data.pagination.totalPages)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [currentPage, itemsPerPage, statusFilter, searchTerm])

  // Hook do Realtime com callbacks otimizados
  const {
    ordersConnected: _isRealtimeConnected
  } = useOrdersRealtime(businessId || '', {
    onOrderCreate: (newOrder) => {
      // novo pedido recebido via realtime (incremental)
      // Toast (fallback caso helper não exista)
      notify('info', 'Novo pedido recebido!', { description: 'Verifique os detalhes no painel de pedidos.' })

      // Verificar se pedido passa pelos filtros atuais
      const passesStatus = statusFilter === 'all' || newOrder.status === statusFilter
      const passesSearch = !searchTerm ||
        (newOrder.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          newOrder.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          newOrder.displayId?.toLowerCase().includes(searchTerm.toLowerCase()))

      // Se não passa filtro, apenas atualiza contadores globais e sai
      if (!passesStatus || !passesSearch) {
        setStats(prev => ({
          ...prev,
          total: prev.total + 1,
          pending: newOrder.status === 'pending' ? prev.pending + 1 : prev.pending
        }))
        return
      }

      // Se não estamos na primeira página, não podemos inserir sem bagunçar paginação.
      // Estratégia: informar via toast e não alterar lista atual.
      if (currentPage !== 1) {
        setStats(prev => ({
          ...prev,
          total: prev.total + 1,
          pending: newOrder.status === 'pending' ? prev.pending + 1 : prev.pending
        }))
        // incrementar contador off-page
        setNewOffPageCount(c => c + 1)
        return
      }

      // Inserção incremental na lista local (evita refetch total)
      setOrders(prev => {
        if (prev.some(o => o.id === newOrder.id)) return prev

        // Narrowing genérico: o payload vindo do realtime pode ter campos extras.
        const normalized: Order = {
          id: (newOrder as { id: string }).id,
          displayId: (newOrder as { displayId?: string; orderNumber?: string }).displayId || (newOrder as { orderNumber?: string }).orderNumber || (newOrder as { id: string }).id,
          customer: (newOrder as { customer?: string; customerName?: string }).customer || (newOrder as { customerName?: string }).customerName || 'Cliente',
          items: Array.isArray((newOrder as { items?: string[] }).items) ? (newOrder as { items?: string[] }).items || [] : [],
          total: typeof (newOrder as { total?: number }).total === 'number' ? (newOrder as { total?: number }).total! : 0,
          status: mapDbOrderStatus((newOrder as { status?: string }).status),
          paymentStatus: mapDbPaymentStatus((newOrder as { paymentStatus?: string }).paymentStatus),
          type: mapDbOrderType((newOrder as { type?: string }).type),
          tableId: (newOrder as { tableId?: string | null }).tableId,
          tableNumber: (newOrder as { tableNumber?: number | string | null }).tableNumber,
          address: (newOrder as { address?: string }).address,
          waiterName: (newOrder as { waiterName?: string }).waiterName,
          observations: (newOrder as { observations?: string }).observations,
          createdAt: (newOrder as { createdAt?: string }).createdAt || new Date().toISOString(),
          customerPhone: (newOrder as { customerPhone?: string }).customerPhone,
        }

        const updated = [normalized, ...prev]
        return updated.slice(0, itemsPerPage)
      })

      // Registrar timestamp do insert para ignorar update duplicado imediato
      recentInsertsRef.current[newOrder.id] = Date.now()

      // Atualizar stats (só incrementos simples; se precisar mais precisão, refetch agendado poderia ser usado)
      setStats(prev => ({
        ...prev,
        total: prev.total + 1,
        pending: newOrder.status === 'pending' ? prev.pending + 1 : prev.pending
      }))

      // Marcar highlight
      setHighlighted(prev => {
        const clone = new Set(prev)
        clone.add(newOrder.id)
        return clone
      })
      // Limpar highlight depois de 4s
      if (highlightTimeoutsRef.current[newOrder.id]) {
        clearTimeout(highlightTimeoutsRef.current[newOrder.id])
      }
      highlightTimeoutsRef.current[newOrder.id] = setTimeout(() => {
        setHighlighted(prev => {
          const clone = new Set(prev)
          clone.delete(newOrder.id)
          return clone
        })
        delete highlightTimeoutsRef.current[newOrder.id]
      }, 4000)
    },
    onOrderUpdate: (updatedOrder) => {
      // update de pedido recebido via realtime

      // Ignorar UPDATE que chega logo após INSERT (mesmo id em < 1.5s)
      const insertedAt = recentInsertsRef.current[updatedOrder.id]
      if (insertedAt && Date.now() - insertedAt < 1500) {
        // ignorando update imediato pós-insert
        return
      }

      // Normalizar campos (reutilizando mappers)
      // NOTA: Para updates, só aplicamos o que estiver presente no payload para não zerar arrays/relações que não vêm no realtime.
      const rawUpdate = updatedOrder as any

      const changes: Partial<Order> = {}

      // Ids sempre vêm
      if (rawUpdate.id) changes.id = rawUpdate.id

      // Campos simples
      if (rawUpdate.status) changes.status = mapDbOrderStatus(rawUpdate.status)
      if (rawUpdate.paymentStatus) changes.paymentStatus = mapDbPaymentStatus(rawUpdate.paymentStatus)
      if (rawUpdate.type) changes.type = mapDbOrderType(rawUpdate.type)
      if (typeof rawUpdate.total === 'number') changes.total = rawUpdate.total

      // Strings opcionais - só atualiza se vier no payload (mesmo null/empty string pode ser intencional, mas undefined não)
      if (rawUpdate.displayId !== undefined) changes.displayId = rawUpdate.displayId
      if (rawUpdate.orderNumber !== undefined && !changes.displayId) changes.displayId = rawUpdate.orderNumber

      if (rawUpdate.customer !== undefined) changes.customer = rawUpdate.customer
      if (rawUpdate.customerName !== undefined && !changes.customer) changes.customer = rawUpdate.customerName

      if (rawUpdate.address !== undefined) changes.address = rawUpdate.address
      if (rawUpdate.tableId !== undefined) changes.tableId = rawUpdate.tableId
      if (rawUpdate.tableNumber !== undefined) changes.tableNumber = rawUpdate.tableNumber
      if (rawUpdate.waiterName !== undefined) changes.waiterName = rawUpdate.waiterName
      if (rawUpdate.observations !== undefined) changes.observations = rawUpdate.observations
      if (rawUpdate.customerPhone !== undefined) changes.customerPhone = rawUpdate.customerPhone

      // Array items: Realtime DB update normalmente NÃO traz items (relação).
      // Só assumimos que items mudou se o payload trouxer explicitamente um array.
      if (Array.isArray(rawUpdate.items)) {
        changes.items = rawUpdate.items
      }

      // Aplicar mudanças
      setOrders(prev => prev.map(o => {
        if (o.id !== updatedOrder.id) return o

        // Calcular próximos valores para notificação
        const nextPaymentStatus = changes.paymentStatus || o.paymentStatus
        const nextTotal = changes.total !== undefined ? changes.total : o.total
        const nextStatus = changes.status || o.status

        // Notificação de mudança de pagamento
        if (nextPaymentStatus !== o.paymentStatus) {
          const alreadyNotified = lastPaymentToastRef.current[o.id] === nextPaymentStatus
          if (!alreadyNotified) {
            if (nextPaymentStatus === 'paid') {
              notify('success', 'Pagamento confirmado', { description: `Pedido #${(o.displayId || o.id).slice(0, 6)} foi pago.` })
            } else if (nextPaymentStatus === 'failed' || nextPaymentStatus === 'cancelled') {
              notify('error', 'Pagamento não concluído', { description: `Status: ${nextPaymentStatus}` })
            }
            lastPaymentToastRef.current[o.id] = nextPaymentStatus
          }
        }

        // Notificação de itens adicionados (total aumentou)
        if (nextTotal > o.total && o.total > 0) {
          const diff = nextTotal - o.total
          const tableInfo = (changes.tableNumber || o.tableNumber) ? ` (Mesa ${changes.tableNumber || o.tableNumber})` : ''
          notify('info', `➕ Itens adicionados #${(o.displayId || o.id).slice(0, 8)}${tableInfo}`, {
            description: `+R$ ${diff.toFixed(2)} adicionado ao pedido`
          })
          // Também fazer highlight
          setHighlighted(prev => {
            const clone = new Set(prev)
            clone.add(updatedOrder.id)
            return clone
          })
          if (highlightTimeoutsRef.current[updatedOrder.id]) {
            clearTimeout(highlightTimeoutsRef.current[updatedOrder.id])
          }
          highlightTimeoutsRef.current[updatedOrder.id] = setTimeout(() => {
            setHighlighted(prev => {
              const clone = new Set(prev)
              clone.delete(updatedOrder.id)
              return clone
            })
            delete highlightTimeoutsRef.current[updatedOrder.id]
          }, 4000)
        }

        return { ...o, ...changes }
      }))

      // Ajustar stats se mudança de status impactar contadores simples
      setStats(prev => {
        const existing = orders.find(o => o.id === updatedOrder.id)
        if (!existing) return prev
        // Usar o novo status (ou manter o antigo se não mudou)
        const newStatus = changes.status || existing.status

        if (existing.status === newStatus) return prev

        const next = { ...prev }
        // Só lidamos com transições envolvendo 'pending' porque é o contador exclusivo listado
        if (existing.status === 'pending') next.pending = Math.max(0, next.pending - 1)
        if (newStatus === 'pending') next.pending = next.pending + 1
        return next
      })
    },
    onOrderDelete: (deletedOrderId) => {
      // Remoção local
      setOrders(prev => prev.filter(o => o.id !== deletedOrderId))
      setStats(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        pending: prev.pending - (orders.find(o => o.id === deletedOrderId)?.status === 'pending' ? 1 : 0)
      }))
    }
  })

  useEffect(() => {
    if (!businessId) return
    fetchOrders()
  }, [businessId, fetchOrders])

  // Reset página ao mudar filtros
  useEffect(() => { setCurrentPage(1) }, [searchTerm, statusFilter, itemsPerPage])

  // Limpeza periódica de recentInsertsRef (remove entradas mais antigas que 2 minutos)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const cutoff = 120_000
      const entries = Object.entries(recentInsertsRef.current)
      for (const [id, ts] of entries) {
        if (now - ts > cutoff) {
          delete recentInsertsRef.current[id]
        }
      }
      // opcional: poderia logar removed se necessário
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  // startIndex removido; API já controla offsets
  // endIndex não necessário após refatoração de paginação baseada em API

  const toggleRow = (orderId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
      // Hidratar pedido se faltar dados (items vazios)
      const target = orders.find(o => o.id === orderId)
      if (target && (!target.items || target.items.length === 0)) {
        // Buscar detalhes completos via orderNumber/displayId
        const orderNumber = target.displayId || target.id
        if (orderNumber) {
          ; (async () => {
            try {
              setHydrating(prev => ({ ...prev, [orderId]: true }))

              const { getOrderByNumber } = await import('@/actions/orders/orders')
              const result = await getOrderByNumber(orderNumber)

              if (result.success) {
                const full = result.data
                // Mapear items detalhados -> formato string (ex: '1x Pizza Calabresa')
                type FullItem = { quantity: number; product?: { name?: string } | null }
                const mappedItems = Array.isArray(full.items) ? (full.items as FullItem[]).map((it) => `${it.quantity}x ${it.product?.name || 'Item'}`) : []
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, items: mappedItems, observations: full.notes || o.observations } : o))
              }
            } catch (err) {
              console.error('Falha ao hidratar pedido', err)
            } finally {
              setHydrating(prev => { const clone = { ...prev }; delete clone[orderId]; return clone })
            }
          })()
        }
      }
    }
    setExpandedRows(newExpanded)
  }

  const [hydrating, setHydrating] = useState<Record<string, boolean>>({})

  const displayedOrders = orders

  const handleGoToFirstPage = () => {
    setCurrentPage(1)
    setNewOffPageCount(0)
    // opcional: informar usuário
    notify('info', 'Exibindo novos pedidos mais recentes')
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 overflow-x-hidden">
      {/* Header */}
      <DashboardHeader
        title="Pedidos"
        description="Gerencie todos os pedidos da empresa"
      >
        {newOffPageCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 mr-2"
            onClick={handleGoToFirstPage}
          >
            {newOffPageCount} novo{newOffPageCount > 1 ? 's' : ''} – ver
          </Button>
        )}
        {canCreate && (
          <DashboardHeaderButton onClick={() => setIsNewOrderDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Pedido
          </DashboardHeaderButton>
        )}
      </DashboardHeader>

      {/* Filters and Search */}
      <Card>
        <CardHeader className="-mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por cliente ou número do pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="preparing">Preparando</SelectItem>
                  <SelectItem value="ready">Pronto</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                </SelectContent>
              </Select>

              <span className="text-sm text-slate-600 whitespace-nowrap">Itens por página:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando pedidos...</p>
            </div>
          ) : displayedOrders.length === 0 ? (
            <div className="p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all'
                  ? 'Nenhum pedido encontrado'
                  : 'Nenhum pedido cadastrado'
                }
              </h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Os pedidos aparecerão aqui quando chegarem'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto rounded-md border">
                <Table className="text-sm [&_th]:h-10 [&_th]:py-1 [&_th]:leading-tight [&_td]:align-middle min-w-[800px]">
                  <TableHeader className="sticky top-0 bg-white z-10 shadow-sm border-b">
                    <TableRow>
                      <TableHead className="w-12 min-w-12 max-w-12 bg-white"></TableHead>
                      <TableHead className="w-24 min-w-24 bg-white">Pedido</TableHead>
                      <TableHead className="w-40 min-w-40 bg-white">Cliente</TableHead>
                      <TableHead className="w-28 min-w-28 bg-white">Tipo</TableHead>
                      <TableHead className="w-28 min-w-28 bg-white">Status</TableHead>
                      <TableHead className="w-28 min-w-28 bg-white">Pagamento</TableHead>
                      <TableHead className="w-24 min-w-24 text-right bg-white">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedOrders.map((order) => [
                      // Linha principal
                      <TableRow
                        key={order.id}
                        className={cn("cursor-pointer transition-colors", highlighted.has(order.id) && "animate-[flashAdd_2.5s_ease-out_forwards] ring-1 ring-green-400/50")}
                        onClick={() => toggleRow(order.id)}
                      >
                        <TableCell className="w-12 min-w-12 max-w-12">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleRow(order.id)
                            }}
                          >
                            {expandedRows.has(order.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="w-24 min-w-24 font-medium">{order.displayId || order.id}</TableCell>
                        <TableCell className="w-40 min-w-40">{order.customer}</TableCell>
                        <TableCell className="w-28 min-w-28">
                          <TypeBadge type={order.type} tableNumber={order.tableNumber} />
                        </TableCell>
                        <TableCell className="w-28 min-w-28">
                          <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="w-28 min-w-28">
                          <PaymentBadge status={order.paymentStatus} />
                        </TableCell>
                        <TableCell className="w-24 min-w-24 text-right font-medium">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL"
                          }).format(order.total)}
                        </TableCell>
                      </TableRow>,

                      // Linha expandida
                      ...(expandedRows.has(order.id) ? [
                        <TableRow key={`${order.id}-expanded`} className="bg-slate-50 hover:bg-slate-50">
                          <TableCell colSpan={7} className="p-0">
                            <OrderExpandedDetails
                              order={order}
                              onOrderUpdate={fetchOrders}
                              isHydrating={hydrating[order.id]}
                              canEdit={canEdit}
                              canDelete={canDelete}
                            />
                          </TableCell>
                        </TableRow>
                      ] : [])
                    ]).flat()}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden">
                {displayedOrders.map((order) => (
                  <Card
                    key={order.id}
                    className={cn("overflow-hidden transition-all border-0 border-b shadow-none rounded-none last:border-0", highlighted.has(order.id) && "bg-green-50")}
                  >
                    <div
                      onClick={() => toggleRow(order.id)}
                      className="p-4 cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-base">{order.displayId || order.id}</span>
                          <span className="text-sm text-muted-foreground line-clamp-1">{order.customer}</span>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <TypeBadge type={order.type} tableNumber={order.tableNumber} />
                        <PaymentBadge status={order.paymentStatus} />
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t mt-2">
                        <span className="font-bold text-lg">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL"
                          }).format(order.total)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-muted-foreground"
                        >
                          {expandedRows.has(order.id) ? "Menos detalhes" : "Mais detalhes"}
                          {expandedRows.has(order.id) ? (
                            <ChevronDown className="ml-1 h-3 w-3" />
                          ) : (
                            <ChevronRight className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Content Mobile */}
                    {expandedRows.has(order.id) && (
                      <div className="border-t bg-slate-50">
                        <OrderExpandedDetails
                          order={order}
                          onOrderUpdate={fetchOrders}
                          isHydrating={hydrating[order.id]}
                          canEdit={canEdit}
                          canDelete={canDelete}
                        />
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 pt-4 -mb-2 border-t">
                  <div className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages} • Total {stats.total} pedidos
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = i + 1
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              className="w-8 h-8"
                              onClick={() => setCurrentPage(page)}
                              disabled={loading}
                            >
                              {page}
                            </Button>
                          )
                        })}

                        {totalPages > 5 && (
                          <>
                            {currentPage > 3 && <span className="px-2">...</span>}
                            {totalPages > 5 && currentPage > 3 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-8 h-8"
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={loading}
                              >
                                {totalPages}
                              </Button>
                            )}
                          </>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages || loading}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog para criar novo pedido */}
      <NewOrderDialog
        open={isNewOrderDialogOpen}
        onOpenChange={setIsNewOrderDialogOpen}
        businessId={businessId || ''}
        onOrderCreated={() => {
          // Atualizar a lista de pedidos quando um novo for criado
          fetchOrders()
        }}
      />
    </div>
  )
}

// Estilos globais para animação de nova linha
// (Mantido no final do arquivo para fácil manutenção)
// Usamos keyframes explicitamente já que Tailwind não tem essa animação custom.
// A animação aplica um flash verde suave e desvanece.
// Se preferir mover para um CSS global, basta copiar.
// Nota: prefixo único para evitar conflito.
; <style jsx global>{`
@keyframes flashAdd { 
  0% { background-color: #ecfdf5; } 
  10% { background-color: #d1fae5; } 
  50% { background-color: #f0fdf4; } 
  100% { background-color: transparent; }
}
`}</style>
