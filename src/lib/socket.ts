// Utility functions for WebSocket event emission
// Used by API routes and webhooks to emit events to connected clients

export async function emitWebSocketEvent(eventType: string, data: unknown) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/ws-emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: eventType,
        data
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    console.log(`[WebSocket] Evento ${eventType} emitido com sucesso:`, result)
    return result
  } catch (error) {
    console.error(`[WebSocket] Erro ao emitir evento ${eventType}:`, error)
    throw error
  }
}

// Event type definitions for type safety
export interface OrderUpdateEvent {
  orderId: string
  status: string
  message: string
  restaurantId: string
  timestamp: Date
}

export interface NewOrderEvent {
  order: {
    id: string
    orderNumber: string
    customerName: string
    total: number
    type: string
    status: string
    items: Array<{
      id: string
      name: string
      quantity: number
      price: number
    }>
  }
  restaurantId: string
  timestamp: Date
}

export interface PaymentUpdateEvent {
  paymentId: string
  status: string
  orderId?: string
  restaurantId: string
  message: string
  timestamp: Date
}
