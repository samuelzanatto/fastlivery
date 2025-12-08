'use server'

/**
 * Server-side push notification functions
 * Estas funções são chamadas do servidor (Server Actions) para enviar notificações
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Status que geram notificações push
type NotifiableOrderStatus = 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'

// Aceita qualquer OrderStatus mas só envia para os notificáveis
type AnyOrderStatus = 'PENDING' | NotifiableOrderStatus

interface OrderNotificationOptions {
  businessId: string
  businessName: string
  businessLogo?: string | null
  orderId: string
  orderNumber: string | number
  userId?: string | null
  slug?: string | null
}

const STATUS_MESSAGES: Record<NotifiableOrderStatus, { title: string; body: string; emoji: string }> = {
  CONFIRMED: {
    title: 'Pedido Confirmado! ✅',
    body: 'Seu pedido #ORDER_NUMBER foi confirmado e será preparado em breve.',
    emoji: '✅'
  },
  PREPARING: {
    title: 'Preparando seu Pedido 👨‍🍳',
    body: 'Seu pedido #ORDER_NUMBER está sendo preparado com carinho!',
    emoji: '👨‍🍳'
  },
  READY: {
    title: 'Pedido Pronto! 🎉',
    body: 'Seu pedido #ORDER_NUMBER está pronto para retirada!',
    emoji: '🎉'
  },
  OUT_FOR_DELIVERY: {
    title: 'Saiu para Entrega 🚴',
    body: 'Seu pedido #ORDER_NUMBER saiu para entrega! Fique atento.',
    emoji: '🚴'
  },
  DELIVERED: {
    title: 'Pedido Entregue! 📦',
    body: 'Seu pedido #ORDER_NUMBER foi entregue. Bom apetite!',
    emoji: '📦'
  },
  CANCELLED: {
    title: 'Pedido Cancelado 😔',
    body: 'Infelizmente seu pedido #ORDER_NUMBER foi cancelado.',
    emoji: '😔'
  }
}

/**
 * Envia notificação de atualização de status do pedido (server-side)
 */
export async function sendOrderStatusPushNotification(
  status: AnyOrderStatus,
  options: OrderNotificationOptions
): Promise<{ success: boolean; sent?: number; error?: string }> {
  // Não envia push para status PENDING (ainda não foi confirmado)
  if (status === 'PENDING') {
    return { success: true, sent: 0 }
  }

  const statusInfo = STATUS_MESSAGES[status as NotifiableOrderStatus]
  if (!statusInfo) {
    return { success: false, error: 'Status inválido para notificação' }
  }

  const { businessId, businessName, businessLogo, orderId, orderNumber, userId, slug } = options

  const notification = {
    title: `${businessName} - ${statusInfo.title}`,
    body: statusInfo.body.replace('ORDER_NUMBER', String(orderNumber)),
    icon: businessLogo || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: `order-${orderId}`,
    requireInteraction: status === 'READY' || status === 'OUT_FOR_DELIVERY',
    data: {
      type: 'order-status',
      orderId,
      orderNumber,
      status,
      url: slug ? `/${slug}/pedido/${orderId}` : `/pedido/${orderId}`
    },
    actions: [
      {
        action: 'view',
        title: 'Ver Pedido'
      }
    ]
  }

  try {
    // Chama a Edge Function do Supabase diretamente com service role key
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        businessId,
        notification,
        userId: userId || undefined
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Push] Erro ao enviar notificação:', errorText)
      return { success: false, error: 'Erro ao enviar notificação' }
    }

    const result = await response.json()
    console.log(`[Push] Notificação de ${status} enviada:`, result)
    return { success: true, sent: result.sent || 0 }

  } catch (error) {
    console.error('[Push] Erro ao enviar notificação de pedido:', error)
    return { success: false, error: 'Erro de conexão' }
  }
}

/**
 * Envia notificação de novo pedido para funcionários (server-side)
 */
export async function sendNewOrderPushNotification(
  options: OrderNotificationOptions & { total?: number; items?: number }
): Promise<{ success: boolean; sent?: number; error?: string }> {
  const { businessId, businessName, businessLogo, orderId, orderNumber, total, items } = options

  const notification = {
    title: `🔔 Novo Pedido #${orderNumber}!`,
    body: total 
      ? `${items || 1} item(s) - R$ ${total.toFixed(2)}`
      : 'Você recebeu um novo pedido!',
    icon: businessLogo || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: `new-order-${orderId}`,
    requireInteraction: true,
    data: {
      type: 'new-order',
      orderId,
      orderNumber,
      url: `/orders`
    },
    actions: [
      {
        action: 'view',
        title: 'Ver Pedido'
      },
      {
        action: 'accept',
        title: 'Aceitar'
      }
    ]
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        businessId,
        notification
        // Não passa userId para enviar para todos os funcionários
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Push] Erro ao enviar notificação de novo pedido:', errorText)
      return { success: false, error: 'Erro ao enviar notificação' }
    }

    const result = await response.json()
    console.log(`[Push] Notificação de novo pedido enviada:`, result)
    return { success: true, sent: result.sent || 0 }

  } catch (error) {
    console.error('[Push] Erro ao enviar notificação de novo pedido:', error)
    return { success: false, error: 'Erro de conexão' }
  }
}
