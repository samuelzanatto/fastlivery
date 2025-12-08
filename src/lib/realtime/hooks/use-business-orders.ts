'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRealtimeChannel } from './use-realtime-channel'
import { 
  getBusinessOrdersChannel, 
  type RealtimeMessage, 
  type OrderRealtimePayload 
} from '../types'

interface BusinessOrder {
  id: string
  orderNumber: string
  status: string
  type: string
  customerName: string
  customerPhone: string
  total: number
  items: Array<{
    id: string
    productId: string
    name: string
    quantity: number
    price: number
  }>
  createdAt: string
  updatedAt: string
}

interface UseBusinessOrdersRealtimeOptions {
  businessId: string
  enabled?: boolean
  onOrderCreated?: (order: BusinessOrder) => void
  onOrderUpdated?: (order: BusinessOrder) => void
  onOrderStatusChanged?: (order: BusinessOrder, oldStatus: string) => void
}

export function useBusinessOrdersRealtime({
  businessId,
  enabled = true,
  onOrderCreated,
  onOrderUpdated,
  onOrderStatusChanged
}: UseBusinessOrdersRealtimeOptions) {
  const [orders, setOrders] = useState<BusinessOrder[]>([])
  const [newOrderCount, setNewOrderCount] = useState(0)

  // Use refs para evitar problemas de dependências
  const callbacksRef = useRef({
    onOrderCreated,
    onOrderUpdated,
    onOrderStatusChanged
  })

  // Atualizar refs quando callbacks mudarem
  useEffect(() => {
    callbacksRef.current = {
      onOrderCreated,
      onOrderUpdated,
      onOrderStatusChanged
    }
  }, [onOrderCreated, onOrderUpdated, onOrderStatusChanged])

  const handleMessage = useCallback((message: RealtimeMessage) => {
    console.log('[useBusinessOrdersRealtime] Mensagem recebida:', message.type, message)

    // Tratar mensagens do postgres_changes (database_insert, database_update, database_delete)
    if (message.type === 'database_insert' || message.type === 'database_update' || message.type === 'database_delete') {
      const dbPayload = message.payload as {
        eventType: string
        new: Record<string, unknown>
        old: Record<string, unknown>
        table: string
      }

      // Verificar se é da tabela orders e do business correto
      if (dbPayload.table !== 'orders') return
      
      const newData = dbPayload.new
      const oldData = dbPayload.old

      // Verificar businessId
      if (newData?.businessId !== businessId && oldData?.businessId !== businessId) return

      const order: BusinessOrder = {
        id: (newData?.id || oldData?.id) as string,
        orderNumber: (newData?.orderNumber || oldData?.orderNumber) as string,
        status: (newData?.status || oldData?.status) as string,
        type: (newData?.type || oldData?.type) as string,
        customerName: (newData?.customerName || oldData?.customerName) as string,
        customerPhone: (newData?.customerPhone || oldData?.customerPhone) as string,
        total: (newData?.total || oldData?.total) as number,
        items: [], // Items precisam ser buscados separadamente
        createdAt: (newData?.createdAt || oldData?.createdAt) as string,
        updatedAt: (newData?.updatedAt || oldData?.updatedAt) as string
      }

      if (message.type === 'database_insert') {
        console.log('[useBusinessOrdersRealtime] Novo pedido via postgres_changes:', order.orderNumber)
        setOrders(prev => {
          const exists = prev.find(o => o.id === order.id)
          if (!exists) {
            setNewOrderCount(count => count + 1)
            callbacksRef.current.onOrderCreated?.(order)
            return [order, ...prev]
          }
          return prev
        })
      } else if (message.type === 'database_update') {
        console.log('[useBusinessOrdersRealtime] Pedido atualizado via postgres_changes:', order.orderNumber)
        const oldStatus = (oldData?.status as string) || ''
        const newStatus = order.status

        if (oldStatus !== newStatus) {
          callbacksRef.current.onOrderStatusChanged?.(order, oldStatus)
        } else {
          callbacksRef.current.onOrderUpdated?.(order)
        }

        setOrders(prev => {
          const exists = prev.find(o => o.id === order.id)
          if (exists) {
            return prev.map(o => o.id === order.id ? { ...o, ...order } : o)
          } else {
            // Pedido não existe ainda, adicionar
            setNewOrderCount(count => count + 1)
            callbacksRef.current.onOrderCreated?.(order)
            return [order, ...prev]
          }
        })
      }
      return
    }

    // Tratar mensagens broadcast (business_order_created, etc.)
    if (message.businessId !== businessId) return

    const payload = message.payload as OrderRealtimePayload
    const order: BusinessOrder = {
      id: payload.id,
      orderNumber: payload.orderNumber,
      status: payload.status,
      type: payload.type,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      total: payload.total,
      items: payload.items,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt
    }

    switch (message.type) {
      case 'business_order_created':
        setOrders(prev => {
          const exists = prev.find(o => o.id === order.id)
          if (!exists) {
            setNewOrderCount(count => count + 1)
            callbacksRef.current.onOrderCreated?.(order)
            return [order, ...prev]
          }
          return prev
        })
        break

      case 'business_order_updated':
        setOrders(prev => prev.map(o => o.id === order.id ? order : o))
        callbacksRef.current.onOrderUpdated?.(order)
        break

      case 'business_order_status_changed':
        setOrders(prev => prev.map(o => {
          if (o.id === order.id) {
            const oldStatus = o.status
            callbacksRef.current.onOrderStatusChanged?.(order, oldStatus)
            return order
          }
          return o
        }))
        break
    }
  }, [businessId])

  const channelName = getBusinessOrdersChannel(businessId)
  const { isConnected, error, sendMessage } = useRealtimeChannel(
    channelName,
    handleMessage,
    { 
      enabled: enabled && !!businessId,
      private: false // Usar canal público para receber broadcasts do banco
      // Removido table: 'orders' pois estamos usando broadcast via trigger
    }
  )

  const markOrdersSeen = useCallback(() => {
    setNewOrderCount(0)
  }, [])

  const refreshOrders = useCallback(() => {
    // Implementar função para recarregar pedidos do servidor
    // Esta função pode chamar uma API para buscar os pedidos mais recentes
  }, [])

  return {
    orders,
    newOrderCount,
    isConnected,
    error,
    markOrdersSeen,
    refreshOrders,
    sendMessage
  }
}