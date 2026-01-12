'use client'

import { ReactNode, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { OrderTrackingProvider, useOrderTracking } from '@/contexts/order-tracking-context'
import { OrderTrackingSheet, OrderTrackingButton } from '@/components/checkout/order-tracking-sheet'

function OrderTrackingUI() {
  const params = useParams()
  const businessSlug = params.slug as string
  
  const {
    activeOrderId,
    activeOrderNumber,
    activeOrderStatus,
    isTrackingSheetOpen,
    isOnOrderPage,
    setIsTrackingSheetOpen,
  } = useOrderTracking()

  // Não mostrar se não tem pedido ativo ou se estamos na página de pedido dedicada
  if (!activeOrderId || isOnOrderPage) return null

  return (
    <>
      {/* Floating Order Tracking Button */}
      <OrderTrackingButton
        orderId={activeOrderId}
        orderNumber={activeOrderNumber || undefined}
        status={activeOrderStatus || undefined}
        onClick={() => setIsTrackingSheetOpen(true)}
      />
      
      {/* Order Tracking Bottom Sheet */}
      <OrderTrackingSheet
        orderId={activeOrderId}
        businessSlug={businessSlug}
        isOpen={isTrackingSheetOpen}
        onClose={() => setIsTrackingSheetOpen(false)}
        onAddMoreItems={() => {
          // Scroll to top para ver o cardápio
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      />
    </>
  )
}

interface BusinessLayoutWrapperProps {
  children: ReactNode
}

export function BusinessLayoutWrapper({ children }: BusinessLayoutWrapperProps) {
  return (
    <Suspense fallback={null}>
      <OrderTrackingProvider>
        {children}
        <OrderTrackingUI />
      </OrderTrackingProvider>
    </Suspense>
  )
}
