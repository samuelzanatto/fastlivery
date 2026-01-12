'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRealtimeChannel } from './use-realtime-channel'
import { 
  getBusinessOrdersChannel, 
  type RealtimeMessage, 
  type OrderRealtimePayload 
} from '../types'
import { supabase } from '@/lib/supabase'

interface BusinessOrder {
  id: string
  orderNumber: string
  status: string
  type: string
  tableId?: string | null
  tableNumber?: string | null
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
  const tableCacheRef = useRef<Record<string, string>>({})

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

  // Pré-carrega mapa de mesas para evitar "Mesa ?" em eventos recém-chegados
  useEffect(() => {
    if (!businessId) return
    supabase
      .from('tables')
      .select('id, number')
      .eq('businessId', businessId)
      .then(({ data, error }) => {
        console.log('[useBusinessOrdersRealtime] Tabelas carregadas:', data?.length, error)
        if (error || !data) return
        const map: Record<string, string> = {}
        for (const row of data) {
          if (row.id && row.number) {
            map[row.id] = row.number as string
          }
        }
        tableCacheRef.current = { ...tableCacheRef.current, ...map }
        console.log('[useBusinessOrdersRealtime] Cache de mesas:', tableCacheRef.current)
      })
  }, [businessId])

  const handleMessage = useCallback((message: RealtimeMessage) => {
    console.log('[useBusinessOrdersRealtime] Mensagem recebida:', message.type, message)

    const hydrateTableNumber = async (o: BusinessOrder): Promise<BusinessOrder> => {
      if (o.type !== 'DINE_IN' && o.type !== 'dine-in') return o
      if (!o.tableId || o.tableNumber) return o
      if (tableCacheRef.current[o.tableId]) {
        return { ...o, tableNumber: tableCacheRef.current[o.tableId] }
      }
      const { data, error } = await supabase
        .from('tables')
        .select('number')
        .eq('id', o.tableId)
        .limit(1)
        .maybeSingle()
      if (!error && data?.number) {
        tableCacheRef.current[o.tableId] = data.number
        return { ...o, tableNumber: data.number }
      }
      // último recurso: retorna mesa como "?" só se realmente não acharmos
      return { ...o, tableNumber: o.tableNumber ?? null }
    }

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

      // Supabase retorna snake_case do banco
      const tableId = (newData?.tableId || newData?.table_id || oldData?.tableId || oldData?.table_id) as string | undefined
      const order: BusinessOrder = {
        id: (newData?.id || oldData?.id) as string,
        orderNumber: (newData?.orderNumber || newData?.order_number || oldData?.orderNumber || oldData?.order_number) as string,
        status: (newData?.status || oldData?.status) as string,
        type: (newData?.type || oldData?.type) as string,
        tableId,
        tableNumber: tableId ? tableCacheRef.current[tableId] || null : null,
        customerName: (newData?.customerName || newData?.customer_name || oldData?.customerName || oldData?.customer_name) as string,
        customerPhone: (newData?.customerPhone || newData?.customer_phone || oldData?.customerPhone || oldData?.customer_phone) as string,
        total: (newData?.total || oldData?.total) as number,
        items: [], // Items precisam ser buscados separadamente
        createdAt: (newData?.createdAt || newData?.created_at || oldData?.createdAt || oldData?.created_at) as string,
        updatedAt: (newData?.updatedAt || newData?.updated_at || oldData?.updatedAt || oldData?.updated_at) as string
      }
      console.log('[useBusinessOrdersRealtime] Order tableId:', tableId, 'tableNumber:', order.tableNumber, 'cache:', tableCacheRef.current)

      if (message.type === 'database_insert') {
        console.log('[useBusinessOrdersRealtime] Novo pedido via postgres_changes:', order.orderNumber)
        setOrders(prev => {
          const exists = prev.find(o => o.id === order.id)
          if (!exists) {
            setNewOrderCount(count => count + 1)
            hydrateTableNumber(order).then((hydrated) => {
              callbacksRef.current.onOrderCreated?.(hydrated)
              setOrders(current => current.some(o => o.id === hydrated.id) ? current : [hydrated, ...current])
            })
            return prev
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

        hydrateTableNumber(order).then((hydrated) => {
          setOrders(prev => {
            const exists = prev.find(o => o.id === hydrated.id)
            if (exists) {
              return prev.map(o => o.id === hydrated.id ? { ...o, ...hydrated } : o)
            } else {
              setNewOrderCount(count => count + 1)
              callbacksRef.current.onOrderCreated?.(hydrated)
              return [hydrated, ...prev]
            }
          })
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
        tableId: (payload as { tableId?: string }).tableId,
        tableNumber: (payload as { tableNumber?: string }).tableNumber,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      total: payload.total,
      items: payload.items,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt
    }

    const handleHydrated = (hydrated: BusinessOrder) => {
      switch (message.type) {
      case 'business_order_created':
        setOrders(prev => {
          const exists = prev.find(o => o.id === order.id)
          if (!exists) {
            setNewOrderCount(count => count + 1)
            callbacksRef.current.onOrderCreated?.(hydrated)
            return [hydrated, ...prev]
          }
          return prev
        })
        break

      case 'business_order_updated':
        setOrders(prev => prev.map(o => o.id === order.id ? hydrated : o))
        callbacksRef.current.onOrderUpdated?.(hydrated)
        break

      case 'business_order_status_changed':
        setOrders(prev => prev.map(o => {
          if (o.id === order.id) {
            const oldStatus = o.status
            callbacksRef.current.onOrderStatusChanged?.(hydrated, oldStatus)
            return hydrated
          }
          return o
        }))
        break
    }
    }

    hydrateTableNumber(order).then(handleHydrated)
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