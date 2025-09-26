'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { authClient } from '@/lib/auth/auth-client'
import { getAuthenticatedSupabaseClient } from '@/lib/database/supabase'
import type { SupabaseClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { SenderType } from '@prisma/client'

// ===== TYPES =====

interface Order {
  id: string
  displayId: string
  customer: string
  items: string[]
  total: number
  status: string
  paymentStatus: string
  type: string
  tableNumber?: number
  address?: string
  observations?: string
  createdAt: string
}

interface ChatMessage {
  id: string
  conversationId: string
  content: string
  senderType: SenderType
  senderId?: string
  isRead: boolean
  createdAt: string
  updatedAt: string
}

interface Payment {
  id: string
  status: string
  amount: number
  orderId?: string
  businessId: string
  createdAt: string
  updatedAt: string
}

// ===== HOOK CONFIGURATION TYPES =====

interface OrdersConfig {
  enabled: boolean
  businessId?: string
  onOrderCreate?: (order: Order) => void
  onOrderUpdate?: (order: Order) => void
  onOrderDelete?: (orderId: string) => void
}

interface ChatConfig {
  enabled: boolean
  conversationId?: string
  userId?: string
  onNewMessage?: (message: ChatMessage) => void
  onMessageRead?: (messageId: string) => void
  onTypingStart?: (userId: string) => void
  onTypingStop?: (userId: string) => void
}

interface PaymentsConfig {
  enabled: boolean
  businessId?: string
  onPaymentUpdate?: (payment: Payment) => void
}

interface UseSupabaseRealtimeConfig {
  orders?: OrdersConfig
  chat?: ChatConfig
  payments?: PaymentsConfig
  requireAuth?: boolean
}

interface UseSupabaseRealtimeReturn {
  orders: Order[]
  ordersLoading: boolean
  ordersError: string | null
  ordersConnected: boolean
  chatConnected: boolean
  typingUsers: Set<string>
  paymentsConnected: boolean
  isAuthenticated: boolean
  refreshOrders: () => void
  sendTypingStart: () => void
  sendTypingStop: () => void
}

// ===== MAIN HOOK =====

export function useSupabaseRealtime(config: UseSupabaseRealtimeConfig = {}): UseSupabaseRealtimeReturn {
  const {
    orders = { enabled: false },
    chat = { enabled: false },
    payments = { enabled: false },
    requireAuth = true
  } = config

  // ===== STATE =====
  
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [ordersData, setOrdersData] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [ordersConnected, setOrdersConnected] = useState(false)
  const [chatConnected, setChatConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [paymentsConnected, setPaymentsConnected] = useState(false)
  
  // ===== REFS =====
  
  const supabaseRef = useRef<SupabaseClient | null>(null)
  const ordersChannelRef = useRef<RealtimeChannel | null>(null)
  const chatChannelRef = useRef<RealtimeChannel | null>(null)
  const paymentsChannelRef = useRef<RealtimeChannel | null>(null)
  // Gerenciamento de token Realtime (bridge JWT renovado periodicamente)
  const realtimeTokenRef = useRef<{ token: string; fetchedAt: number; expiresInSec: number } | null>(null)
  const tokenRefreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  const ordersCallbacksRef = useRef({
    onOrderCreate: orders.onOrderCreate,
    onOrderUpdate: orders.onOrderUpdate,
    onOrderDelete: orders.onOrderDelete,
  })
  
  const chatCallbacksRef = useRef({
    onNewMessage: chat.onNewMessage,
    onMessageRead: chat.onMessageRead,
    onTypingStart: chat.onTypingStart,
    onTypingStop: chat.onTypingStop,
  })
  
  const paymentsCallbacksRef = useRef({
    onPaymentUpdate: payments.onPaymentUpdate,
  })

  // Update callback refs when they change
  useEffect(() => {
    ordersCallbacksRef.current = {
      onOrderCreate: orders.onOrderCreate,
      onOrderUpdate: orders.onOrderUpdate,
      onOrderDelete: orders.onOrderDelete,
    }
  }, [orders.onOrderCreate, orders.onOrderUpdate, orders.onOrderDelete])

  useEffect(() => {
    chatCallbacksRef.current = {
      onNewMessage: chat.onNewMessage,
      onMessageRead: chat.onMessageRead,
      onTypingStart: chat.onTypingStart,
      onTypingStop: chat.onTypingStop,
    }
  }, [chat.onNewMessage, chat.onMessageRead, chat.onTypingStart, chat.onTypingStop])

  useEffect(() => {
    paymentsCallbacksRef.current = {
      onPaymentUpdate: payments.onPaymentUpdate,
    }
  }, [payments.onPaymentUpdate])

  // ===== AUTHENTICATION =====
  
  useEffect(() => {
    if (!requireAuth) {
      setIsAuthenticated(true)
      return
    }

    const checkAuth = async () => {
      try {
        const session = await authClient.getSession()
        setIsAuthenticated(!!session?.data?.user)
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error)
        setIsAuthenticated(false)
      }
    }

    checkAuth()
  }, [requireAuth])

  // ===== SUPABASE CLIENT =====
  
  useEffect(() => {
    if (!isAuthenticated) return

    const initSupabaseForRealtime = async () => {
      try {
        const client = await getAuthenticatedSupabaseClient()
        supabaseRef.current = client
      } catch (error) {
        console.error('❌ Erro ao configurar Supabase:', error)
      }
    }

    if (!supabaseRef.current) {
      initSupabaseForRealtime()
    }
  }, [isAuthenticated])

  // ===== ORDERS FUNCTIONALITY =====
  
  const loadInitialOrders = useCallback(async () => {
    if (!orders.enabled || !orders.businessId || !isAuthenticated) return

    setOrdersLoading(true)
    setOrdersError(null)

    try {
      const { getOrders } = await import('@/actions/orders/orders')
      const result = await getOrders()

      if (!result.success) {
        throw new Error(result.error)
      }

      const ordersList = result.data.data || []
      
      setOrdersData(ordersList)
      console.log(`📦 ${ordersList.length} orders carregados via Server Action`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setOrdersError(errorMessage)
      console.error('❌ Erro ao carregar orders:', error)
    } finally {
      setOrdersLoading(false)
    }
  }, [orders.enabled, orders.businessId, isAuthenticated])

  const setupOrdersSubscription = useCallback(async () => {
    if (!orders.enabled || !orders.businessId || !supabaseRef.current || !isAuthenticated) {
      console.log('⚠️ Setup orders subscription cancelado:', {
        enabled: orders.enabled,
        businessId: orders.businessId,
        hasSupabase: !!supabaseRef.current,
        isAuthenticated
      })
      return
    }

    // Cleanup existing subscription
    if (ordersChannelRef.current) {
      await supabaseRef.current.removeChannel(ordersChannelRef.current)
      ordersChannelRef.current = null
    }

    try {
      // CRITICAL FIX: Autenticar Realtime antes de subscrever

      let authToken: string | null = null

      if (requireAuth) {
        try {
          // Buscar token bridge compatível com Supabase (assinado com SUPABASE_JWT_SECRET)
            const resp = await fetch('/api/realtime-token')
            if (resp.ok) {
              const data = await resp.json()
              authToken = data.token
              // token bridge obtido com sucesso
              if (authToken) {
                realtimeTokenRef.current = { token: authToken, fetchedAt: Date.now(), expiresInSec: 600 }
              }
            } else {
              console.warn('[orders] Falha ao obter token bridge, usando fallback Better Auth token')
              const session = await authClient.getSession()
              authToken = session?.data?.session?.token || null
            }
        } catch (bridgeErr) {
          console.error('[orders] Erro ao obter token bridge:', bridgeErr)
          const session = await authClient.getSession()
          authToken = session?.data?.session?.token || null
        }
      }

      if (!authToken) {
  console.warn('[orders] Usando anon key para realtime (pode limitar eventos)')
        authToken = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || null
      }

      if (authToken) {
        await supabaseRef.current.realtime.setAuth(authToken)
        // realtime autenticado com sucesso
        // Agendar refresh 60s antes da expiração estimada (600s ttl default configurada no backend)
        if (tokenRefreshTimerRef.current) clearTimeout(tokenRefreshTimerRef.current)
        if (realtimeTokenRef.current) {
          const ttlMs = realtimeTokenRef.current.expiresInSec * 1000
          const refreshIn = Math.max(30_000, ttlMs - 60_000) // nunca menos que 30s
          tokenRefreshTimerRef.current = setTimeout(async () => {
            try {
              const resp = await fetch('/api/realtime-token')
              if (resp.ok) {
                const data = await resp.json()
                if (data?.token) {
                  realtimeTokenRef.current = { token: data.token, fetchedAt: Date.now(), expiresInSec: 600 }
                  if (supabaseRef.current) {
                    await supabaseRef.current.realtime.setAuth(data.token)
                  }
                }
              }
            } catch (e) {
              console.error('[orders] Falha ao renovar token realtime:', e)
            }
          }, refreshIn)
        }
      } else {
  console.error('[orders] Nenhum token disponível para autenticação Realtime')
        return
      }
    } catch (authError) {
  console.error('Erro ao autenticar Realtime:', authError)
      return
    }

  // configurando subscription orders

    const channelName = `orders:${orders.businessId}`
    const channel = supabaseRef.current
      .channel(channelName, {
        config: {
          broadcast: { ack: true },
          presence: { key: 'orders-listener' }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `businessId=eq.${orders.businessId}`,
        },
        (payload: RealtimePostgresChangesPayload<Order>) => {
          // evento realtime recebido para orders

          if (payload.eventType === 'INSERT' && payload.new) {
            const newOrder = payload.new as Order
            setOrdersData(prev => {
              const exists = prev.find(o => o.id === newOrder.id)
              if (exists) return prev
              return [newOrder, ...prev]
            })
            ordersCallbacksRef.current.onOrderCreate?.(newOrder)
          }

          if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedOrder = payload.new as Order
            setOrdersData(prev => prev.map(order => 
              order.id === updatedOrder.id ? updatedOrder : order
            ))
            ordersCallbacksRef.current.onOrderUpdate?.(updatedOrder)
          }

          if (payload.eventType === 'DELETE' && payload.old) {
            const deletedId = (payload.old as Order).id
            setOrdersData(prev => prev.filter(order => order.id !== deletedId))
            ordersCallbacksRef.current.onOrderDelete?.(deletedId)
          }
        }
      )
      .subscribe((status: string, err?: unknown) => {
        if (err) {
          console.error('[orders] Erro no subscribe:', err)
        }
        setOrdersConnected(status === 'SUBSCRIBED')
      })

    ordersChannelRef.current = channel
  }, [orders.enabled, orders.businessId, isAuthenticated, requireAuth])

  // ===== CHAT FUNCTIONALITY =====
  
  const setupChatSubscription = useCallback(async () => {
    if (!chat.enabled || !chat.conversationId || !chat.userId || !supabaseRef.current || !isAuthenticated) {
      return
    }

    // Cleanup existing subscription
    if (chatChannelRef.current) {
      await supabaseRef.current.removeChannel(chatChannelRef.current)
      chatChannelRef.current = null
      setChatConnected(false)
    }

  const channelName = `chat:${chat.conversationId}`

    const channel = supabaseRef.current
      .channel(channelName)
      .on('broadcast', { event: 'message_sent' }, (payload) => {
        if (payload.payload?.message && chatCallbacksRef.current.onNewMessage) {
          chatCallbacksRef.current.onNewMessage(payload.payload.message)
        }
      })
      .on('broadcast', { event: 'message_read' }, (payload) => {
        if (payload.payload?.messageId && chatCallbacksRef.current.onMessageRead) {
          chatCallbacksRef.current.onMessageRead(payload.payload.messageId)
        }
      })
      .on('broadcast', { event: 'typing_start' }, (payload) => {
        if (payload.payload?.userId && payload.payload.userId !== chat.userId) {
          setTypingUsers(prev => new Set([...prev, payload.payload.userId]))
          chatCallbacksRef.current.onTypingStart?.(payload.payload.userId)
        }
      })
      .on('broadcast', { event: 'typing_stop' }, (payload) => {
        if (payload.payload?.userId && payload.payload.userId !== chat.userId) {
          setTypingUsers(prev => {
            const newSet = new Set(prev)
            newSet.delete(payload.payload.userId)
            return newSet
          })
          chatCallbacksRef.current.onTypingStop?.(payload.payload.userId)
        }
      })
      .subscribe((status: string) => {
        setChatConnected(status === 'SUBSCRIBED')
      })

    chatChannelRef.current = channel
  }, [chat.enabled, chat.conversationId, chat.userId, isAuthenticated])

  // ===== PAYMENTS FUNCTIONALITY =====
  
  const setupPaymentsSubscription = useCallback(async () => {
    if (!payments.enabled || !payments.businessId || !supabaseRef.current || !isAuthenticated) {
      return
    }

    // Cleanup existing subscription
    if (paymentsChannelRef.current) {
      await supabaseRef.current.removeChannel(paymentsChannelRef.current)
      paymentsChannelRef.current = null
      setPaymentsConnected(false)
    }

  const channelName = `payments-realtime-${payments.businessId}`

    const channel = supabaseRef.current
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `businessId=eq.${payments.businessId}`,
        },
        (payload: RealtimePostgresChangesPayload<Payment>) => {
          if (payload.new && paymentsCallbacksRef.current.onPaymentUpdate) {
            paymentsCallbacksRef.current.onPaymentUpdate(payload.new as Payment)
          }
        }
      )
      .subscribe((status: string) => {
        setPaymentsConnected(status === 'SUBSCRIBED')
      })

    paymentsChannelRef.current = channel
  }, [payments.enabled, payments.businessId, isAuthenticated])

  // ===== CHAT ACTIONS =====
  
  const sendTypingStart = useCallback(() => {
    if (!chatChannelRef.current || !chat.userId) return
    
    chatChannelRef.current.send({
      type: 'broadcast',
      event: 'typing_start',
      payload: { userId: chat.userId }
    })
  }, [chat.userId])

  const sendTypingStop = useCallback(() => {
    if (!chatChannelRef.current || !chat.userId) return
    
    chatChannelRef.current.send({
      type: 'broadcast',
      event: 'typing_stop',
      payload: { userId: chat.userId }
    })
  }, [chat.userId])

  // ===== EFFECTS =====
  
  useEffect(() => {
    if (!isAuthenticated) return

    if (orders.enabled) {
      loadInitialOrders()
      setupOrdersSubscription()
    }

    if (chat.enabled) {
      setupChatSubscription()
    }

    if (payments.enabled) {
      setupPaymentsSubscription()
    }
  }, [
    isAuthenticated,
    orders.enabled,
    orders.businessId,
    chat.enabled,
    chat.conversationId,
    chat.userId,
    payments.enabled,
    payments.businessId,
    loadInitialOrders,
    setupOrdersSubscription,
    setupChatSubscription,
    setupPaymentsSubscription
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (supabaseRef.current) {
        if (ordersChannelRef.current) {
          supabaseRef.current.removeChannel(ordersChannelRef.current)
        }
        if (chatChannelRef.current) {
          supabaseRef.current.removeChannel(chatChannelRef.current)
        }
        if (paymentsChannelRef.current) {
          supabaseRef.current.removeChannel(paymentsChannelRef.current)
        }
      }
      if (tokenRefreshTimerRef.current) {
        clearTimeout(tokenRefreshTimerRef.current)
      }
    }
  }, [])

  // ===== RETURN =====
  
  return {
    orders: ordersData,
    ordersLoading,
    ordersError,
    ordersConnected,
    chatConnected,
    typingUsers,
    paymentsConnected,
    isAuthenticated,
    refreshOrders: loadInitialOrders,
    sendTypingStart,
    sendTypingStop,
  }
}

// ===== CONVENIENCE HOOKS =====

export function useOrdersRealtime(businessId: string) {
  return useSupabaseRealtime({
    orders: {
      enabled: true,
      businessId,
    },
  })
}

export function useChatRealtime({
  conversationId,
  userId,
  onNewMessage,
  onMessageRead,
  onTypingStart,
  onTypingStop,
}: {
  conversationId: string
  userId: string
  onNewMessage?: (message: ChatMessage) => void
  onMessageRead?: (messageId: string) => void
  onTypingStart?: (userId: string) => void
  onTypingStop?: (userId: string) => void
}) {
  return useSupabaseRealtime({
    chat: {
      enabled: true,
      conversationId,
      userId,
      onNewMessage,
      onMessageRead,
      onTypingStart,
      onTypingStop,
    },
  })
}

export function useBusinessRealtime(businessId: string) {
  return useSupabaseRealtime({
    orders: {
      enabled: true,
      businessId,
    },
    payments: {
      enabled: true,
      businessId,
    },
  })
}
