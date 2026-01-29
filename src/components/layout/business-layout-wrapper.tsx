'use client'

import { ReactNode, Suspense, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useCart } from '@/contexts/cart-context'
import { OrderTrackingProvider, useOrderTracking } from '@/contexts/order-tracking-context'
import { OrderTrackingSheet, OrderTrackingButton } from '@/components/checkout/order-tracking-sheet'
import { ChatButton } from '@/components/chat/chat-button'
import { ChatSheet } from '@/components/chat/chat-sheet'

function OrderTrackingUI({ businessId }: { businessId?: string }) {
  const params = useParams()
  const businessSlug = params.slug as string
  const { items } = useCart()

  const {
    activeOrderId,
    activeOrderNumber,
    activeOrderStatus,
    isTrackingSheetOpen,
    isOnOrderPage,
    setIsTrackingSheetOpen,
    setActiveOrderId,
    dismissActiveOrder,
  } = useOrderTracking()

  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatConfig, setChatConfig] = useState<{ businessId: string; name: string; phone: string } | null>(null)

  /* State for unread messages */
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    async function resolveChatConfig() {
      // 1. Se tiver pedido ativo, usar dados do pedido
      if (activeOrderId && businessSlug) {
        try {
          const { getPublicOrder } = await import('@/actions/orders/public-orders')
          const result = await getPublicOrder(activeOrderId, businessSlug)
          if (result.success && result.data) {
            setChatConfig({
              businessId: result.data.businessId,
              name: result.data.customerName,
              phone: result.data.customerPhone
            })
            return
          }
        } catch (error) {
          console.error('Failed to fetch order info for chat:', error)
        }
      }

      // 2. Se não tiver pedido (ou falhar), tentar usuário logado
      if (businessId) {
        try {
          const { getCurrentCustomerInfo } = await import('@/actions/customer/get-current-customer')
          const result = await getCurrentCustomerInfo()

          if (result.success && result.data && result.data.phone) {
            setChatConfig({
              businessId: businessId,
              name: result.data.name,
              phone: result.data.phone
            })
          }
        } catch (error) {
          console.error('Failed to fetch customer info:', error)
        }
      }
    }

    resolveChatConfig()
  }, [activeOrderId, businessSlug, businessId])

  // Setup realtime for unread count
  useEffect(() => {
    let channel: any = null;

    async function setupRealtime() {
      if (!chatConfig) return

      try {
        const { getOrCreateConversation } = await import('@/actions/chat/client-chat')
        const chatRes = await getOrCreateConversation(chatConfig.businessId, chatConfig.name, chatConfig.phone)

        if (chatRes.success && chatRes.data) {
          setUnreadCount(chatRes.data.unread_count_customer || 0)

          const { supabase } = await import('@/lib/supabase')
          channel = supabase
            .channel(`unread_count:${chatRes.data.id}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'conversations',
                filter: `id=eq.${chatRes.data.id}`
              },
              (payload) => {
                const updated = payload.new as any
                setUnreadCount(updated.unread_count_customer || 0)
              }
            )
            .subscribe()
        }
      } catch (e) {
        console.error('Error setting up chat realtime:', e)
      }
    }

    setupRealtime()

    return () => {
      if (channel) {
        import('@/lib/supabase').then(({ supabase }) => supabase.removeChannel(channel))
      }
    }
  }, [chatConfig])


  // Não renderizar se estiver na página de pedido (pois ela já tem seus controles)
  if (isOnOrderPage) return null

  return (
    <>
      {/* Floating Order Tracking Button - Only if active order */}
      {activeOrderId && (
        <OrderTrackingButton
          orderId={activeOrderId}
          orderNumber={activeOrderNumber || undefined}
          status={activeOrderStatus || undefined}
          onClick={() => setIsTrackingSheetOpen(true)}
          onDismiss={dismissActiveOrder}
        />
      )}

      {/* Chat UI - Always show if we resolved config (logged in or active order) */}
      {chatConfig && (
        <>
          <ChatButton
            onClick={() => setIsChatOpen(true)}
            unreadCount={unreadCount}
            className={items.length > 0 ? "bottom-24" : undefined}
          />

          <ChatSheet
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            businessId={chatConfig.businessId}
            customerPhone={chatConfig.phone || ''}
            customerName={chatConfig.name}
            businessName={businessSlug}
          />
        </>
      )}

      {/* Order Tracking Bottom Sheet */}
      {activeOrderId && (
        <OrderTrackingSheet
          orderId={activeOrderId}
          businessSlug={businessSlug}
          isOpen={isTrackingSheetOpen}
          onClose={() => setIsTrackingSheetOpen(false)}
          onAddMoreItems={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      )}
    </>
  )
}

interface BusinessLayoutWrapperProps {
  children: ReactNode
  businessId?: string
}

export function BusinessLayoutWrapper({ children, businessId }: BusinessLayoutWrapperProps) {
  return (
    <Suspense fallback={null}>
      <OrderTrackingProvider>
        {children}
        <OrderTrackingUI businessId={businessId} />
      </OrderTrackingProvider>
    </Suspense>
  )
}
