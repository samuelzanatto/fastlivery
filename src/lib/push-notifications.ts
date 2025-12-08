/**
 * Helper functions para enviar push notifications de pedidos
 */

interface OrderNotificationOptions {
  businessId: string
  businessName: string
  businessLogo?: string
  orderId: string
  orderNumber: string | number
  userId?: string
  slug?: string
}

type OrderStatus = 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'

const STATUS_MESSAGES: Record<OrderStatus, { title: string; body: string; emoji: string }> = {
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
 * Envia notificação de atualização de status do pedido
 */
export async function sendOrderStatusNotification(
  status: OrderStatus,
  options: OrderNotificationOptions
): Promise<{ success: boolean; sent?: number; error?: string }> {
  const { businessId, businessName, businessLogo, orderId, orderNumber, userId, slug } = options
  
  const statusInfo = STATUS_MESSAGES[status]
  if (!statusInfo) {
    return { success: false, error: 'Status inválido' }
  }

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
    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        businessId,
        notification,
        userId
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error || 'Erro ao enviar notificação' }
    }

    const result = await response.json()
    return { success: true, sent: result.sent }

  } catch (error) {
    console.error('Erro ao enviar notificação de pedido:', error)
    return { success: false, error: 'Erro de conexão' }
  }
}

/**
 * Envia notificação de novo pedido (para o restaurante)
 */
export async function sendNewOrderNotification(
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
      url: `/admin/pedidos/${orderId}`
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
    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        businessId,
        notification
        // Não passa userId para enviar para todos os funcionários
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error || 'Erro ao enviar notificação' }
    }

    const result = await response.json()
    return { success: true, sent: result.sent }

  } catch (error) {
    console.error('Erro ao enviar notificação de novo pedido:', error)
    return { success: false, error: 'Erro de conexão' }
  }
}

/**
 * Envia notificação genérica
 */
export async function sendBusinessNotification(
  businessId: string,
  notification: {
    title: string
    body: string
    icon?: string
    url?: string
    tag?: string
  },
  userId?: string
): Promise<{ success: boolean; sent?: number; error?: string }> {
  try {
    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        businessId,
        notification: {
          ...notification,
          data: {
            type: 'generic',
            url: notification.url
          }
        },
        userId
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error || 'Erro ao enviar notificação' }
    }

    const result = await response.json()
    return { success: true, sent: result.sent }

  } catch (error) {
    console.error('Erro ao enviar notificação:', error)
    return { success: false, error: 'Erro de conexão' }
  }
}
