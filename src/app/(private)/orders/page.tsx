"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useSession } from "@/lib/auth-client"
import { toastHelpers } from "@/lib/toast-helpers"
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
  X
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
      toastHelpers.system.error('Por favor, informe o motivo do cancelamento')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason.trim() })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao cancelar pedido')
      }

      // Mostrar resultado do cancelamento
      if (result.refund) {
        toastHelpers.system.success(`Pedido cancelado! Reembolso de ${new Intl.NumberFormat("pt-BR", { 
          style: "currency", 
          currency: "BRL" 
        }).format(result.refund.amount)} processado automaticamente.`)
      } else {
        toastHelpers.system.success('Pedido cancelado com sucesso!')
      }

      setIsOpen(false)
      setReason("")
      onOrderCancelled()

    } catch (error) {
      console.error('Erro ao cancelar pedido:', error)
      toastHelpers.system.error(error instanceof Error ? error.message : 'Erro ao cancelar pedido')
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
interface OrdersApiResponse {
  data: Order[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
  stats: { total: number; pending: number; preparing: number; ready: number }
}

// Componente de Chat Dialog
const ChatDialog = ({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Olá! Seu pedido foi recebido.", sender: "restaurant", time: "14:30" },
    { id: 2, text: "Obrigado! Quanto tempo para ficar pronto?", sender: "customer", time: "14:32" },
    { id: 3, text: "Aproximadamente 25 minutos.", sender: "restaurant", time: "14:33" },
  ])
  const [newMessage, setNewMessage] = useState("")

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        text: newMessage.trim(),
        sender: "restaurant" as const,
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
              <div key={message.id} className={`flex ${message.sender === 'restaurant' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] p-2 rounded-lg text-sm ${
                  message.sender === 'restaurant' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-slate-900 border'
                }`}>
                  <div>{message.text}</div>
                  <div className={`text-xs mt-1 ${message.sender === 'restaurant' ? 'text-blue-100' : 'text-slate-500'}`}>
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
const ExpandedOrderRow = ({ order, onOrderUpdate }: { order: Order; onOrderUpdate: () => void }) => {
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
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Observações</label>
                        <div className="text-sm text-slate-700 bg-gray-50 border rounded-md p-2">
                          {order.observations}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Itens */}
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">
                    Itens ({order.items.length})
                  </label>
                  <div className="space-y-1">
                    {order.items.map((item, index) => (
                      <div key={index} className="text-sm text-slate-600 flex items-center gap-2">
                        <span className="w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-xs font-medium text-slate-600">
                          {index + 1}
                        </span>
                        {item}
                      </div>
                    ))}
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

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    setIsUpdating(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log(`Pedido ${order.id} atualizado para ${newStatus}`)
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
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState({ total: 0, pending: 0, preparing: 0, ready: 0 })
  const [totalPages, setTotalPages] = useState(1)

  // Obter dados da sessão para identificar o restaurante
  const { data: session } = useSession()
  
  // Configurar Socket.IO apenas quando tivermos o restaurantId
  const [_restaurantId, setRestaurantId] = useState<string | null>(null)
  
  useEffect(() => {
    // Buscar restaurantId do usuário logado
    const fetchRestaurantId = async () => {
      try {
        const response = await fetch('/api/restaurant/me')
        if (response.ok) {
          const data = await response.json()
          setRestaurantId(data.restaurant?.id || null)
        }
      } catch (error) {
        console.error('Erro ao buscar restaurantId:', error)
      }
    }
    
    if (session?.user) {
      fetchRestaurantId()
    }
  }, [session])

  // Hook do Socket.IO para notificações em tempo real - REMOVIDO
  // Funcionalidade WebSocket foi removida do projeto

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: itemsPerPage.toString(),
      })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchTerm) params.set('search', searchTerm)
      const res = await fetch(`/api/orders?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Erro ao carregar pedidos')
      const json: OrdersApiResponse = await res.json()
      setOrders(json.data)
      setStats(json.stats)
      setTotalPages(json.pagination.totalPages)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [currentPage, itemsPerPage, statusFilter, searchTerm])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Reset página ao mudar filtros
  useEffect(() => { setCurrentPage(1) }, [searchTerm, statusFilter, itemsPerPage])

  // startIndex removido; API já controla offsets
  // endIndex não necessário após refatoração de paginação baseada em API

  const toggleRow = (orderId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
    }
    setExpandedRows(newExpanded)
  }

  const displayedOrders = orders

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pedidos</h1>
          <p className="text-slate-600 mt-1">Gerencie todos os pedidos do restaurante</p>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader className="pb-4">
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
              <Table>
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
                      className="cursor-pointer"
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
                      <ExpandedOrderRow key={`${order.id}-expanded`} order={order} onOrderUpdate={fetchOrders} />
                    ] : [])
                  ]).flat()}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
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
    </div>
  )
}
