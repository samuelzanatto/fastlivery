'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRealtimeChannel } from './use-realtime-channel'
import { 
  getSupplierWhatsAppOrdersChannel, 
  type RealtimeMessage, 
  type WhatsAppOrderRealtimePayload 
} from '../types'

interface WhatsAppOrderDbRecord {
  id: string
  phone: string
  companyId: string
  supplierIdsDistinct: string[]
  items: Array<{
    serviceId: string
    name: string
    quantity: number
    unitPrice: number
  }>
  totalEstimated: number
  status: string
  createdAt: string
  updatedAt?: string
}

interface WhatsAppOrder {
  id: string
  displayId: string
  clientName: string
  clientPhone: string
  companyId: string
  items: Array<{
    serviceId: string
    name: string
    quantity: number
    unitPrice: number
  }>
  total: number
  status: string
  createdAt: string
  updatedAt: string
  observations?: string
}

interface UseSupplierWhatsAppOrdersOptions {
  supplierId: string
  enabled?: boolean
  onOrderCreated?: (order: WhatsAppOrder) => void
  onOrderUpdated?: (order: WhatsAppOrder) => void
}

export function useSupplierWhatsAppOrders({
  supplierId,
  enabled = true,
  onOrderCreated,
  onOrderUpdated
}: UseSupplierWhatsAppOrdersOptions) {
  const [whatsappOrders, setWhatsappOrders] = useState<WhatsAppOrder[]>([])
  const [newOrderCount, setNewOrderCount] = useState(0)
  const [avgLatencyMs, setAvgLatencyMs] = useState<number | null>(null)

  // Use refs para evitar problemas de dependências
  const callbacksRef = useRef({
    onOrderCreated,
    onOrderUpdated
  })

  // Atualizar refs quando callbacks mudarem
  useEffect(() => {
    callbacksRef.current = {
      onOrderCreated,
      onOrderUpdated
    }
  }, [onOrderCreated, onOrderUpdated])

  const handleMessage = useCallback((message: RealtimeMessage) => {
    if (!message) return
    
    console.log('[useSupplierWhatsAppOrders] ✅ Mensagem recebida:', {
      type: message.type,
      timestamp: message.timestamp,
      hasPayload: !!message.payload,
      metadata: message.metadata
    })

    // Processar eventos de database changes
    if (message.type.startsWith('database_')) {
      const dbPayload = message.payload as { eventType: string; table: string; new?: Record<string, unknown>; old?: Record<string, unknown> }
      
      // Verificar se é evento da tabela whatsapp_orders
      if (dbPayload?.table !== 'whatsapp_orders') {
        console.debug('[useSupplierWhatsAppOrders] Ignorando evento de tabela diferente:', dbPayload?.table)
        return
      }

      const dbRecord = (dbPayload.new || dbPayload.old) as unknown as WhatsAppOrderDbRecord
      
      // Verificar se o supplier está nas listas de suppliers do pedido
      if (!dbRecord?.supplierIdsDistinct?.includes(supplierId)) {
        console.debug('[useSupplierWhatsAppOrders] Ignorando pedido de supplier diferente:', {
          expected: supplierId,
          got: dbRecord?.supplierIdsDistinct,
          orderId: dbRecord?.id
        })
        return
      }

      // Converter record do banco em WhatsAppOrder
      const order: WhatsAppOrder = {
        id: dbRecord.id,
        displayId: dbRecord.id.slice(-6),
        clientName: dbRecord.phone,
        clientPhone: dbRecord.phone,
        companyId: dbRecord.companyId,
        items: dbRecord.items || [],
        total: dbRecord.totalEstimated || 0,
        status: dbRecord.status,
        createdAt: dbRecord.createdAt,
        updatedAt: dbRecord.updatedAt || dbRecord.createdAt,
        observations: '#whatsapp'
      }

      console.log('[useSupplierWhatsAppOrders] ✅ Processando evento de database:', {
        eventType: dbPayload.eventType,
        orderId: order.id,
        supplierId,
        total: order.total
      })

      switch (dbPayload.eventType) {
        case 'INSERT':
          // Calcular latência
          const latency = Date.now() - new Date(order.createdAt).getTime()
          setAvgLatencyMs(prev => {
            const newCount = (prev ? 1 : 0) + 1
            const newTotal = (prev || 0) + latency
            return Math.round(newTotal / newCount)
          })

          setWhatsappOrders(prev => [order, ...prev])
          setNewOrderCount(prev => prev + 1)
          callbacksRef.current.onOrderCreated?.(order)
          break

        case 'UPDATE':
          setWhatsappOrders(prev => prev.map(o => o.id === order.id ? order : o))
          callbacksRef.current.onOrderUpdated?.(order)
          break

        default:
          console.debug('[useSupplierWhatsAppOrders] Ignorando evento de database:', dbPayload.eventType)
      }
      return
    }

    // Processar eventos tradicionais de broadcast (mantido para compatibilidade)
    if (!message.type?.startsWith('whatsapp_order_')) return
    const rawPayload = message.payload as WhatsAppOrderRealtimePayload | undefined
    if (!rawPayload) return
    if (!message.supplierId?.includes(supplierId)) {
      console.debug('[useSupplierWhatsAppOrders] discard message supplier mismatch', { expected: supplierId, got: message.supplierId, type: message.type })
      return
    }

    const payload = rawPayload
    const order: WhatsAppOrder = {
      id: payload.id,
      displayId: payload.id.slice(-6),
      clientName: payload.phone,
      clientPhone: payload.phone,
      companyId: payload.companyId,
      items: payload.items,
      total: payload.totalEstimated,
      status: payload.status,
      createdAt: payload.createdAt,
      updatedAt: payload.createdAt,
      observations: '#whatsapp'
    }

    switch (message.type) {
      case 'whatsapp_order_created':
        setWhatsappOrders(prev => [order, ...prev])
        setNewOrderCount(prev => prev + 1)
        callbacksRef.current.onOrderCreated?.(order)
        break

      case 'whatsapp_order_updated':
        setWhatsappOrders(prev => prev.map(o => o.id === order.id ? order : o))
        callbacksRef.current.onOrderUpdated?.(order)
        break
      default:
        console.debug('[useSupplierWhatsAppOrders] ignored type', message.type)
    }
  }, [supplierId])

  const channelName = getSupplierWhatsAppOrdersChannel(supplierId)
  const { isConnected, error, sendMessage } = useRealtimeChannel(
    channelName,
    handleMessage,
    { 
      enabled: enabled && !!supplierId,
      private: true,
      table: 'whatsapp_orders',
      schema: 'public'
    }
  )

  const markOrdersSeen = useCallback(() => {
    setNewOrderCount(0)
  }, [])

  const refreshOrders = useCallback(async () => {
    try {
      const response = await fetch(`/api/supplier/orders/whatsapp?supplierId=${supplierId}`)
      if (response.ok) {
        const data = await response.json()
        setWhatsappOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Erro ao carregar pedidos do WhatsApp:', error)
    }
  }, [supplierId])

  // Estatísticas calculadas
  const stats = {
    totalOrdersToday: whatsappOrders.filter(
      order => new Date(order.createdAt).toDateString() === new Date().toDateString()
    ).length,
    whatsappOrdersToday: whatsappOrders.filter(
      order => new Date(order.createdAt).toDateString() === new Date().toDateString()
    ).length,
    pendingOrders: whatsappOrders.filter(
      order => ['pending', 'confirmed'].includes(order.status.toLowerCase())
    ).length,
    totalRevenue: whatsappOrders
      .filter(order => new Date(order.createdAt).toDateString() === new Date().toDateString())
      .reduce((sum, order) => sum + order.total, 0)
  }

  return {
    whatsappOrders,
    newOrderCount,
    avgLatencyMs,
    isConnected,
    error,
    stats,
    markOrdersSeen,
    refreshOrders,
    sendMessage
  }
}