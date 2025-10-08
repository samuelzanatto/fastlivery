"use client"

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DashboardHeader } from "@/components/ui/dashboard-header"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { 
  Package, 
  CheckCircle, 
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { useSession } from '@/lib/auth/auth-client'
import { useRouter } from 'next/navigation'
import { notify } from '@/lib/notifications/notify'
import { useSupplierWhatsAppOrders } from '@/lib/realtime'

// Para fornecedores, por enquanto vamos usar dados mock até implementar sistema de pedidos B2B
interface SupplierOrder {
  id: string
  orderNumber: string
  customer: string
  items: number
  total: number
  status: string
  createdAt: string
  source?: 'WHATSAPP' | 'PLATFORM'
}

interface MinimalSession { user?: { businessId?: string } }
function SupplierOrdersContent({ supplierId, session }: { supplierId: string; session: MinimalSession }) {
  const router = useRouter()
  const [orders, setOrders] = useState<SupplierOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [source, setSource] = useState<'all' | 'whatsapp' | 'platform'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const supplierRealtime = useSupplierWhatsAppOrders({ 
    supplierId,
    enabled: !!supplierId,
    onOrderCreated: (order) => {
      console.log('[SupplierOrders] ✅ Novo pedido via realtime:', order.id)
      
      // Mostrar toast de novo pedido
      notify('info', 'Novo pedido recebido via WhatsApp!', { 
        description: `Pedido #${order.displayId} de ${order.clientName} - R$ ${order.total.toFixed(2)}` 
      })
      
      // Adicionar o novo pedido à lista se não existir
      setOrders(prev => {
        const exists = prev.find(o => o.id === order.id)
        if (exists) return prev
        
        const newOrder: SupplierOrder = {
          id: order.id,
          orderNumber: order.displayId,
          customer: order.clientName,
          items: order.items.length,
          total: order.total,
          status: order.status,
          createdAt: order.createdAt,
          source: 'WHATSAPP'
        }
        
        return [newOrder, ...prev]
      })
    },
    onOrderUpdated: (order) => {
      console.log('[SupplierOrders] ✅ Pedido atualizado via realtime:', order.id)
      // Atualizar o pedido na lista
      setOrders(prev => prev.map(o => {
        if (o.id === order.id) {
          return {
            ...o,
            status: order.status,
            total: order.total,
            items: order.items.length
          }
        }
        return o
      }))
    }
  })

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      if (!supplierId) return
      const res = await fetch(`/api/supplier/orders?supplierId=${supplierId}&source=${source}`)
      if (!res.ok) throw new Error('Falha ao carregar pedidos')
      const data = await res.json()
      const realOrders: SupplierOrder[] = data.orders || []
      setOrders(realOrders)
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
      notify('error', 'Erro ao carregar pedidos', { description: error instanceof Error ? error.message : 'Erro desconhecido' })
    } finally {
      setLoading(false)
    }
  }, [supplierId, source])

  // Recarrega ao trocar filtro de origem
  useEffect(() => {
    if (!supplierId) return
    loadOrders()
  }, [source, supplierId, loadOrders])

  

  useEffect(() => { loadOrders() }, [loadOrders])

  // Log para debug dos eventos realtime
  useEffect(() => {
    if (supplierRealtime.whatsappOrders.length > 0) {
      console.log('[SupplierOrders] 📊 Realtime orders count:', supplierRealtime.whatsappOrders.length)
      console.log('[SupplierOrders] 📊 API orders count:', orders.length)
    }
  }, [supplierRealtime.whatsappOrders.length, orders.length])

  const filteredOrders = orders.filter(order =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Implementar paginação
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)
  const totalOrderPages = Math.ceil(filteredOrders.length / itemsPerPage)

  // Atualizar totalPages quando filteredOrders mudar
  useEffect(() => {
    setTotalPages(totalOrderPages)
    if (currentPage > totalOrderPages && totalOrderPages > 0) {
      setCurrentPage(1)
    }
  }, [totalOrderPages, currentPage])

  // Reset página quando mudar filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, source, itemsPerPage])

  if (!session) return null

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pendente</Badge>
      case 'CONFIRMED':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Confirmado</Badge>
      case 'PREPARING':
        return <Badge variant="outline" className="text-purple-600 border-purple-600">Preparando</Badge>
      case 'READY':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Pronto</Badge>
      case 'DELIVERED':
        return <Badge variant="outline" className="text-green-600 border-green-600">Entregue</Badge>
      case 'CANCELLED':
        return <Badge variant="outline" className="text-red-600 border-red-600">Cancelado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const handleViewOrder = (orderId: string) => {
    router.push(`/supplier-orders/${orderId}`)
  }

  const getOriginBadge = (order: SupplierOrder) => {
    if (order.source === 'WHATSAPP') {
      return <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300">WhatsApp</Badge>
    }
    return <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-300">Plataforma</Badge>
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <DashboardHeader
        title="Pedidos Recebidos"
        description={`Gerencie todos os pedidos recebidos dos seus clientes${supplierRealtime.avgLatencyMs != null ? ' • Latência média RT: ' + supplierRealtime.avgLatencyMs + 'ms' : ''}`}
      />



      {/* Filtros */}
      <div className="flex gap-4 flex-wrap items-center">
        <div className="flex-1">
          <Input
            placeholder="Buscar pedidos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="w-48">
          <Select value={source} onValueChange={(v: 'all'|'whatsapp'|'platform') => setSource(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="platform">Plataforma</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos Recentes</CardTitle>
          <CardDescription>Lista dos últimos pedidos recebidos</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-slate-600">Carregando pedidos...</p>
            </div>
          ) : paginatedOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum pedido encontrado</h3>
              <p className="text-slate-600">
                {searchTerm ? 'Tente ajustar sua busca.' : 'Ainda não há pedidos via WhatsApp para este fornecedor.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Package className="h-6 w-6 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">{order.customer || 'Cliente'}</h3>
                      <p className="text-sm text-slate-600">
                        Pedido #{order.orderNumber} • {order.items || 0} itens
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(order.createdAt)} às {formatTime(order.createdAt)}
                      </p>
                      <div className="mt-1 flex gap-2">
                        {getOriginBadge(order)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {getStatusBadge(order.status)}
                    <span className="font-semibold">{formatCurrency(order.total)}</span>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewOrder(order.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        {order.status === 'PENDING' && (
                          <DropdownMenuItem>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Confirmar Pedido
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        
        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-slate-600">
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredOrders.length)} de{' '}
              {filteredOrders.length} pedido(s)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
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
                    >
                      {page}
                    </Button>
                  )
                })}
                
                {totalPages > 5 && (
                  <>
                    {currentPage > 3 && <span className="px-2 text-slate-500">...</span>}
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-8 h-8"
                        onClick={() => setCurrentPage(totalPages)}
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
                disabled={currentPage >= totalPages}
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default function SupplierOrders() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [supplierLoading, setSupplierLoading] = useState(false)
  const [supplierError, setSupplierError] = useState<string | null>(null)

  // Redireciona se não logado
  useEffect(() => { if (!isPending && !session) router.push('/login') }, [session, isPending, router])

  // Resolver supplierId uma vez
  useEffect(() => {
    async function resolveSupplier() {
      if (process.env.NODE_ENV === 'development') {
        console.log('[SupplierOrders][DBG] session raw', session)
      }
      // 1. Tenta resolver via nova rota centralizada
      try {
        setSupplierLoading(true)
        const meRes = await fetch('/api/supplier/me')
        if (process.env.NODE_ENV === 'development') {
          console.log('[SupplierOrders][DBG] GET /api/supplier/me status', meRes.status)
        }
        if (meRes.ok) {
          const meData = await meRes.json()
          if (process.env.NODE_ENV === 'development') {
            console.log('[SupplierOrders][DBG] /api/supplier/me payload', meData)
          }
          if (meData?.supplier?.id) {
            setSupplierId(meData.supplier.id)
            setSupplierLoading(false)
            return
          }
        }
      } catch (e) {
        console.warn('[SupplierOrders][DBG] falha rota /api/supplier/me', e)
      } finally {
        setSupplierLoading(false)
      }

      // 2. Fallback antigo baseado em businessId se existir
      if (!session?.user?.businessId) {
        console.warn('[SupplierOrders][DBG] Sem businessId na sessão e /api/supplier/me não retornou')
        return
      }
      console.log('[SupplierOrders][DBG] tentando fallback supplier-by-company com businessId=', session.user.businessId)
      setSupplierLoading(true)
      setSupplierError(null)
      try {
        const r = await fetch(`/api/restaurant/supplier-by-company?companyId=${session.user.businessId}`)
        console.log('[SupplierOrders][DBG] GET supplier-by-company status', r.status)
        if (!r.ok) throw new Error('Falha ao resolver fornecedor')
        const data = await r.json()
        console.log('[SupplierOrders][DBG] supplier-by-company payload', data)
        if (!data?.supplier?.id) {
          setSupplierError('Fornecedor não encontrado para esta empresa.')
        } else {
          setSupplierId(data.supplier.id)
        }
      } catch (e) {
        setSupplierError(e instanceof Error ? e.message : 'Erro desconhecido')
      } finally {
        setSupplierLoading(false)
      }
    }
    if (session) resolveSupplier()
  }, [session])

  if (isPending) return null
  if (!session) return null

  if (supplierLoading) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Carregando fornecedor...</CardTitle>
            <CardDescription>Resolvendo vínculo da empresa ao fornecedor.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse h-4 w-1/3 bg-slate-200 rounded" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (supplierError) {
    return (
      <div className="p-8 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Fornecedor não configurado</CardTitle>
            <CardDescription>{supplierError}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">Finalize o onboarding do fornecedor ou verifique se a empresa está corretamente vinculada.</p>
            <Button onClick={() => location.reload()} variant="outline">Tentar novamente</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (supplierId) {
    return <SupplierOrdersContent supplierId={supplierId} session={{ user: { businessId: session.user.businessId ?? undefined } }} />
  }
  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Fornecedor não encontrado</CardTitle>
          <CardDescription>Associe um fornecedor para visualizar pedidos.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}