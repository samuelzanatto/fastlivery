'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useParams, useSearchParams, usePathname } from 'next/navigation'
import { getActiveOrderForTable } from '@/actions/orders/public-orders'
import { useClientSession } from '@/hooks/use-client-session'

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
}

const OrderTrackingContext = createContext<OrderTrackingContextType | null>(null)

export function OrderTrackingProvider({ children }: { children: ReactNode }) {
  const params = useParams()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { getSession, registerSession } = useClientSession()
  
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

  // Verificar se já existe pedido ativo para esta mesa ou recuperar da sessão
  useEffect(() => {
    async function checkActiveOrder() {
      // Primeiro, tentar recuperar da sessão registrada (via deviceId)
      const session = await getSession()
      
      if (session && session.orderId && session.businessSlug === businessSlug) {
        // Validar se a sessão é para o mesmo negócio
        setActiveOrderId(session.orderId)
        setActiveOrderNumber(session.orderNumber || session.orderId.slice(0, 8))
        setActiveOrderStatus(session.status || 'PENDING')
        setIsInitialized(true)
        return
      }
      
      // Se tem table number na query, verificar pedido ativo para esta mesa
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
      
      // Se tem order na query, setar como ativo
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
