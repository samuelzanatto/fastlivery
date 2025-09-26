"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "@/lib/auth/auth-client"

import { notify } from '@/lib/notifications/notify'
import { useSupabaseRealtime } from '@/hooks/realtime/use-supabase-realtime'
// Uso centralizado do businessId via store (remove fetch local redundante)
import { useBusinessId } from '@/stores/business-store'
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
  tableNumber?: number
  address?: string
  waiterName?: string
  observations?: string
  createdAt: string
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
            {lines.filter(Boolean).map((l,i)=>(<div key={i}>{l}</div>))}
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
  // Normalizar variações possíveis vindas de gateways (MercadoPago etc.)
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

// Componente de Chat Dialog
const ChatDialog = ({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Olá! Seu pedido foi recebido.", sender: "business", time: "14:30" },
    { id: 2, text: "Obrigado! Quanto tempo para ficar pronto?", sender: "customer", time: "14:32" },
    { id: 3, text: "Aproximadamente 25 minutos.", sender: "business", time: "14:33" },
  ])
  const [newMessage, setNewMessage] = useState("")

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        text: newMessage.trim(),
        sender: "business" as const,
        time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      }
      setMessages([...messages, message])
      setNewMessage("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat - {order.customer}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Mensagens */}
          <div className="h-96 overflow-y-auto rounded-lg p-3 space-y-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === 'business' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] p-2 rounded-lg text-sm ${
                  message.sender === 'business' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-slate-900 border'
                }`}>
                  <div>{message.text}</div>
                  <div className={`text-xs mt-1 ${message.sender === 'business' ? 'text-blue-100' : 'text-slate-500'}`}>
                    {message.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Input de nova mensagem */}
          <div className="flex gap-2">
            <Textarea
              placeholder="Digite sua mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 min-h-[40px] max-h-[100px] resize-none"
              rows={2}
            />
            <Button onClick={sendMessage} size="sm" className="px-3">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

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

const TypeBadge = ({ type, tableNumber }: { type: OrderType; tableNumber?: number }) => {
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

// Componente de linha expandida
const ExpandedOrderRow = ({ order, onOrderUpdate, isHydrating }: { order: Order; onOrderUpdate: () => void; isHydrating?: boolean }) => {
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <>
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={7} className="p-0">
          <div className="px-6 py-4 bg-white border-t">
            <div className="max-w-full">
              {/* Header compacto */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Pedido #{order.id}
                  </h3>
                  <span className="text-sm text-slate-500">
                    {new Date(order.createdAt).toLocaleString("pt-BR", {
                      day: "2-digit", month: "2-digit", 
                      hour: "2-digit", minute: "2-digit"
                    })}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-slate-700">
                    {new Intl.NumberFormat("pt-BR", { 
                      style: "currency", 
                      currency: "BRL" 
                    }).format(order.total)}
                  </div>
                </div>
              </div>

              {/* Grid compacto de informações */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-4">
                {/* Cliente - coluna dupla */}
                <div className="lg:col-span-2">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Cliente</label>
                      <div className="font-semibold text-slate-900">{order.customer}</div>
                      {order.address && (
                        <div className="text-sm text-slate-600 flex items-start gap-2 mt-1">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-slate-400" />
                          <span className="break-words">{order.address}</span>
                        </div>
                      )}
                      {order.waiterName && (
                        <div className="text-sm text-slate-600 mt-1">
                          Garçom: <span className="font-medium">{order.waiterName}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Observações */}
                    {order.observations && (
                      <FormattedObservations raw={order.observations} />
                    )}
                  </div>
                </div>

                {/* Itens */}
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">
                    Itens ({order.items?.length || 0})
                  </label>
                  <div className="space-y-1">
                    {(order.items ?? []).length > 0 ? (
                      (order.items ?? []).map((item, index) => (
                        <div key={index} className="text-sm text-slate-600 flex items-center gap-2">
                          <span className="w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-xs font-medium text-slate-600">
                            {index + 1}
                          </span>
                          {item}
                        </div>
                      ))
                    ) : isHydrating ? (
                      <div className="text-xs text-slate-500 italic">Carregando itens...</div>
                    ) : (
                      <div className="text-xs text-slate-500 italic">Nenhum item carregado</div>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Ações</label>
                  <OrderActions order={order} />
                </div>
              </div>

              {/* Status badges e ações secundárias */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200/60">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={order.status} />
                  <PaymentBadge status={order.paymentStatus} />
                  <TypeBadge type={order.type} tableNumber={order.tableNumber} />
                </div>
                
                {/* Ações secundárias */}
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-7 px-2 bg-white"
                    onClick={() => setChatOpen(true)}
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Chat
                  </Button>
                  {order.status !== "cancelled" && order.status !== "delivered" && (
                    <CancelOrderButton order={order} onOrderCancelled={onOrderUpdate} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </TableCell>
      </TableRow>
      
      {/* Chat Dialog */}
      <ChatDialog 
        order={order} 
        open={chatOpen} 
        onClose={() => setChatOpen(false)} 
      />
    </>
  )
}

// Componente de ações
const OrderActions = ({ order }: { order: Order }) => {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusUpdate = async (_newStatus: OrderStatus) => {
    setIsUpdating(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
  // status atualizado localmente (TODO: integrar API)
    } catch (error) {
  console.error('Erro ao atualizar status:', error)
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
  } = useSupabaseRealtime({
      orders: {
      enabled: !!businessId,
      businessId: businessId || undefined,
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
            tableNumber: (newOrder as { tableNumber?: number }).tableNumber,
            address: (newOrder as { address?: string }).address,
            waiterName: (newOrder as { waiterName?: string }).waiterName,
            observations: (newOrder as { observations?: string }).observations,
            createdAt: (newOrder as { createdAt?: string }).createdAt || new Date().toISOString(),
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
        const normalized: Partial<Order> = {
            id: (updatedOrder as { id: string }).id,
            displayId: (updatedOrder as { displayId?: string; orderNumber?: string }).displayId || (updatedOrder as { orderNumber?: string }).orderNumber || (updatedOrder as { id: string }).id,
            customer: (updatedOrder as { customer?: string; customerName?: string }).customer || (updatedOrder as { customerName?: string }).customerName || 'Cliente',
            items: Array.isArray((updatedOrder as { items?: string[] }).items) ? (updatedOrder as { items?: string[] }).items || [] : undefined,
            total: typeof (updatedOrder as { total?: number }).total === 'number' ? (updatedOrder as { total?: number }).total! : undefined,
            status: mapDbOrderStatus((updatedOrder as { status?: string }).status),
            paymentStatus: mapDbPaymentStatus((updatedOrder as { paymentStatus?: string }).paymentStatus),
            type: mapDbOrderType((updatedOrder as { type?: string }).type),
            tableNumber: (updatedOrder as { tableNumber?: number }).tableNumber,
            address: (updatedOrder as { address?: string }).address,
            waiterName: (updatedOrder as { waiterName?: string }).waiterName,
            observations: (updatedOrder as { observations?: string }).observations,
            createdAt: (updatedOrder as { createdAt?: string }).createdAt,
        }

        setOrders(prev => prev.map(o => {
          if (o.id !== updatedOrder.id) return o
          const previousPaymentStatus = o.paymentStatus
          const nextPaymentStatus = normalized.paymentStatus || previousPaymentStatus
          if (previousPaymentStatus !== nextPaymentStatus) {
            const alreadyNotified = lastPaymentToastRef.current[o.id] === nextPaymentStatus
            if (!alreadyNotified) {
              if (nextPaymentStatus === 'paid') {
                notify('success', 'Pagamento confirmado', { description: `Pedido #${(normalized.displayId || o.displayId || o.id).slice(0,6)} foi pago.` })
              } else if (nextPaymentStatus === 'failed' || nextPaymentStatus === 'cancelled') {
                notify('error', 'Pagamento não concluído', { description: `Status: ${nextPaymentStatus}` })
              }
              lastPaymentToastRef.current[o.id] = nextPaymentStatus
            }
          }
          return { ...o, ...normalized }
        }))

        // Ajustar stats se mudança de status impactar contadores simples
        setStats(prev => {
          const existing = orders.find(o => o.id === updatedOrder.id)
          if (!existing || existing.status === normalized.status) return prev
          const next = { ...prev }
          // Só lidamos com transições envolvendo 'pending' porque é o contador exclusivo listado
          if (existing.status === 'pending') next.pending = Math.max(0, next.pending - 1)
          if (normalized.status === 'pending') next.pending = next.pending + 1
          return next
        })
      },
      onOrderDelete: (deletedOrderId) => {
  // pedido removido via realtime
        // Remoção local
        setOrders(prev => prev.filter(o => o.id !== deletedOrderId))
        setStats(prev => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          pending: prev.pending - (orders.find(o => o.id === deletedOrderId)?.status === 'pending' ? 1 : 0)
        }))
      }
    },
    payments: {
      enabled: !!businessId,
      businessId: businessId || undefined,
      onPaymentUpdate: (payment) => {
        console.log('[realtime][payment] update recebido', payment)
        if (!payment?.orderId) return
        setOrders(prev => prev.map(o => {
          if (o.id !== payment.orderId) return o
          const newStatus = mapDbPaymentStatus(payment.status)
          if (o.paymentStatus === newStatus) return o
          return { ...o, paymentStatus: newStatus }
        }))

        // Destacar visualmente a linha do pedido cujo pagamento mudou
        setHighlighted(prev => {
          const clone = new Set(prev)
          clone.add(payment.orderId!)
          return clone
        })
        if (highlightTimeoutsRef.current[payment.orderId!]) {
          clearTimeout(highlightTimeoutsRef.current[payment.orderId!])
        }
        highlightTimeoutsRef.current[payment.orderId!] = setTimeout(() => {
          setHighlighted(prev => {
            const clone = new Set(prev)
            clone.delete(payment.orderId!)
            return clone
          })
          delete highlightTimeoutsRef.current[payment.orderId!]
        }, 4000)

        // Removido: notificações centralizadas no canal de orders para evitar duplicidade
      }
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
          ;(async () => {
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
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
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
        <DashboardHeaderButton onClick={() => setIsNewOrderDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Pedido
        </DashboardHeaderButton>
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
              <Table className="text-sm [&_th]:h-10 [&_th]:py-1 [&_th]:leading-tight [&_td]:py-1.5 [&_td]:align-middle">
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
                      <ExpandedOrderRow key={`${order.id}-expanded`} order={order} onOrderUpdate={fetchOrders} isHydrating={hydrating[order.id]} />
                    ] : [])
                  ]).flat()}
                </TableBody>
              </Table>

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
;<style jsx global>{`
@keyframes flashAdd { 
  0% { background-color: #ecfdf5; } 
  10% { background-color: #d1fae5; } 
  50% { background-color: #f0fdf4; } 
  100% { background-color: transparent; }
}
`}</style>
