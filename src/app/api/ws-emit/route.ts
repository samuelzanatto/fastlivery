import { NextRequest } from 'next/server'
import { getWebSocketServer, broadcastToRestaurant, broadcastToOrder } from '@/lib/ws-server'

// Endpoint para receber eventos dos webhooks
export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json()
    
    const wsServer = getWebSocketServer()
    if (!wsServer) {
      return new Response(JSON.stringify({ 
        error: 'WebSocket server não inicializado' 
      }), { status: 500 })
    }

    // Processar diferentes tipos de eventos e fazer broadcast
    switch (type) {
      case 'new-order':
        broadcastToRestaurant(wsServer, data.restaurantId, { type, data })
        break
        
      case 'payment-update':
        if (data.restaurantId) {
          broadcastToRestaurant(wsServer, data.restaurantId, { type, data })
        }
        if (data.orderId) {
          broadcastToOrder(wsServer, data.orderId, { type, data })
        }
        break
        
      case 'order-cancelled':
        if (data.restaurantId) {
          broadcastToRestaurant(wsServer, data.restaurantId, { type, data })
        }
        break
        
      default:
        return new Response(JSON.stringify({ 
          error: 'Tipo de evento desconhecido' 
        }), { status: 400 })
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: `Evento ${type} enviado com sucesso`
    }))
  } catch (error) {
    console.error('Erro ao processar evento WebSocket:', error)
    return new Response(JSON.stringify({ 
      error: 'Erro interno do servidor' 
    }), { status: 500 })
  }
}