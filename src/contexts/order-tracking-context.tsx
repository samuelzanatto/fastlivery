'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useParams, useSearchParams, usePathname } from 'next/navigation'
import { getActiveOrderForTable } from '@/actions/orders/public-orders'
import { useClientSession } from '@/hooks/use-client-session'
import { supabase } from '@/lib/supabase'

interface OrderTrackingContextType {
  activeOrderId: string | null
  activeOrderNumber: string | null
  activeOrderStatus: string | null
  isTrackingSheetOpen: boolean
  isOnOrderPage: boolean
  setActiveOrderId: (id: string | null) => void
  setActiveOrderNumber: (number: string | null) => void
  setActiveOrderStatus: (status: string | null) => void
  setIsTrackingSheetOpen: (open: boolean) => void
  setOrderCreated: (orderId: string, orderNumber: string) => void
  dismissActiveOrder: () => void
}

const OrderTrackingContext = createContext<OrderTrackingContextType | null>(null)

export function OrderTrackingProvider({ children }: { children: ReactNode }) {
  const params = useParams()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { getSession, registerSession, clearSession } = useClientSession()

  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  const [activeOrderNumber, setActiveOrderNumber] = useState<string | null>(null)
  const [activeOrderStatus, setActiveOrderStatus] = useState<string | null>(null)
  const [isTrackingSheetOpen, setIsTrackingSheetOpen] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  const tableFromQuery = searchParams.get('table') || undefined
  const orderFromQuery = searchParams.get('order') || undefined
  const businessSlug = params.slug as string

  // Detectar se estamos na página de pedido
  const orderIdFromPath = params.orderId as string | undefined
  const isOnOrderPage = !!orderIdFromPath || pathname?.includes('/pedido/')

  // Função para setar pedido criado
  const setOrderCreated = useCallback((orderId: string, orderNumber: string) => {
    setActiveOrderId(orderId)
    setActiveOrderNumber(orderNumber)
    setActiveOrderStatus('PENDING')
    setIsTrackingSheetOpen(true)

    // Registrar no banco de dados
    if (businessSlug) {
      registerSession(orderId, businessSlug, tableFromQuery).catch(error => {
        console.error('Erro ao registrar sessão no servidor:', error)
      })
    }
  }, [businessSlug, tableFromQuery, registerSession])

  const dismissActiveOrder = useCallback(async () => {
    setActiveOrderId(null)
    setActiveOrderNumber(null)
    setActiveOrderStatus(null)
    setIsTrackingSheetOpen(false)
    await clearSession()
  }, [clearSession])

  // Verificar se já existe pedido ativo para esta mesa ou recuperar da sessão
  useEffect(() => {
    async function checkActiveOrder() {
      // 1. Tentar recuperar por usuário autenticado (Mais robusto)
      if (businessSlug) {
        try {
          const { getActiveOrderForUser } = await import('@/actions/orders/public-orders')
          const userOrder = await getActiveOrderForUser(businessSlug)

          if (userOrder.success && userOrder.data) {
            setActiveOrderId(userOrder.data.id)
            setActiveOrderNumber(userOrder.data.orderNumber)
            setActiveOrderStatus(userOrder.data.status)
            setIsInitialized(true)
            return
          }
        } catch (e) {
          console.error('Falha ao checar pedido do usuário:', e)
        }
      }

      // 2. Tentar recuperar da sessão registrada (via deviceId)
      const session = await getSession()

      if (session && session.orderId && session.businessSlug === businessSlug) {
        // Tentar validar o status real do pedido antes de assumir o da sessão
        try {
          const { getPublicOrder } = await import('@/actions/orders/public-orders')
          const result = await getPublicOrder(session.orderId, businessSlug)

          if (result.success && result.data) {
            setActiveOrderId(result.data.id)
            setActiveOrderNumber(result.data.orderNumber)
            setActiveOrderStatus(result.data.status)
            setIsInitialized(true)
            return
          } else {
            // Pedido não existe mais ou erro -> limpar sessão
            await clearSession()
          }
        } catch (e) {
          console.error('Erro ao validar sessão:', e)
        }

        // Se falhar a validação (mas não for 404), usa o cache ou não? 
        // Melhor não usar se não conseguimos validar, para evitar UI stale.
        // Mas se for erro de rede, o usuário perde o tracking.
        // Vamos manter o fallback conservador: se validou usa, se não, talvez usar o da sessão SE existir e for recente?
        // Neste caso, se a validação falha (catch), vamos tentar assumir o da sessão mas disparar o polling logo.
        // Mas o problema original era status stale. Vamos confiar na validação.

        // Se chegamos aqui, ou validou e retornou (acima), ou falhou/não existe.
        // Se falhou silenciosamente, o polling pode tentar recuperar depois se o ID ainda estivesse lá, mas não setamos o activeOrderId.
        // Vamos permitir que o polling tente achar se tiver ActiveOrderId... mas se não setamos, o polling não roda.

        /* Fallback anterior removido para evitar stale state "PENDING" */
      }

      // 3. Se tem table number na query, verificar pedido ativo para esta mesa
      if (tableFromQuery && businessSlug) {
        const result = await getActiveOrderForTable(businessSlug, tableFromQuery)
        if (result.success && result.data?.exists && result.data.order) {
          setActiveOrderId(result.data.order.id)
          setActiveOrderNumber(result.data.order.orderNumber)
          setActiveOrderStatus(result.data.order.status)
          setIsInitialized(true)
          return
        }
      }

      // 4. Se tem order na query, setar como ativo
      if (orderFromQuery) {
        setActiveOrderId(orderFromQuery)
        setIsInitialized(true)
        return
      }

      setIsInitialized(true)
    }

    if (!isInitialized) {
      checkActiveOrder()
    }
  }, [tableFromQuery, orderFromQuery, businessSlug, isInitialized, getSession])

  // Monitorar atualizações em tempo real do pedido
  useEffect(() => {
    if (!activeOrderId) return

    console.log('[Realtime] Iniciando monitoramento do pedido:', activeOrderId)

    const channel = supabase
      .channel(`order_tracking_${activeOrderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${activeOrderId}`
        },
        (payload) => {
          console.log('[Realtime] Pedido atualizado:', payload)
          const updatedOrder = payload.new as any

          if (updatedOrder.status && updatedOrder.status !== activeOrderStatus) {
            setActiveOrderStatus(updatedOrder.status)
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Status da inscrição:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeOrderId, activeOrderStatus])

  // Polling fallback para garantir sincronia (caso o Realtime falhe)
  useEffect(() => {
    if (!activeOrderId || !businessSlug) return

    // Polling a cada 15 segundos
    const intervalId = setInterval(async () => {
      try {
        const { getPublicOrder } = await import('@/actions/orders/public-orders')
        const result = await getPublicOrder(activeOrderId, businessSlug)

        if (result.success && result.data) {
          // Atualizar se status mudou
          if (result.data.status !== activeOrderStatus) {
            console.log('[Polling] Atualizando status do pedido via fallback:', result.data.status)
            setActiveOrderStatus(result.data.status)
          }
        }
      } catch (err) {
        console.error('[Polling] Erro ao verificar status:', err)
      }
    }, 15000)

    return () => clearInterval(intervalId)
  }, [activeOrderId, businessSlug, activeOrderStatus])

  return (
    <OrderTrackingContext.Provider
      value={{
        activeOrderId,
        activeOrderNumber,
        activeOrderStatus,
        isTrackingSheetOpen,
        isOnOrderPage,
        setActiveOrderId,
        setActiveOrderNumber,
        setActiveOrderStatus,
        setIsTrackingSheetOpen,
        setOrderCreated,
        dismissActiveOrder,
      }}
    >
      {children}
    </OrderTrackingContext.Provider>
  )
}

export function useOrderTracking() {
  const context = useContext(OrderTrackingContext)
  if (!context) {
    throw new Error('useOrderTracking must be used within an OrderTrackingProvider')
  }
  return context
}
