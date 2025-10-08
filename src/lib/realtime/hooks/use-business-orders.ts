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
    { enabled: enabled && !!businessId }
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