import { NextRequest } from 'next/server'
import type { WebSocket, WebSocketServer } from 'ws'
import type { IncomingMessage } from 'http'
import { setWebSocketServer, broadcastToRestaurant, broadcastToOrder, broadcastToConversation } from '@/lib/ws-server'

// Estender WebSocket com propriedades customizadas
interface ExtendedWebSocket extends WebSocket {
  restaurantId?: string
  orderId?: string
  userId?: string
  conversationId?: string
}

// Tipos para mensagens
interface WebSocketMessage {
  type: string
  data?: unknown
  restaurantId?: string
  orderId?: string
  userId?: string
  conversationId?: string
}

// WebSocket handler usando next-ws
export function SOCKET(
  client: WebSocket,
  request: IncomingMessage,
  server: WebSocketServer,
) {
  // Registrar o servidor para broadcasting
  setWebSocketServer(server)
  
  console.log('✅ Cliente WebSocket conectado')

  const extClient = client as ExtendedWebSocket

  // Extrair query params da URL para identificar o tipo de conexão
  const url = new URL(request.url || '', `http://${request.headers.host}`)
  const restaurantId = url.searchParams.get('restaurantId')
  const orderId = url.searchParams.get('orderId')
  const userId = url.searchParams.get('userId')
  const conversationId = url.searchParams.get('conversationId')

  // Marcar cliente com identificadores para broadcasting
  extClient.restaurantId = restaurantId || undefined
  extClient.orderId = orderId || undefined
  extClient.userId = userId || undefined
  extClient.conversationId = conversationId || undefined

  console.log('🔗 Conexão estabelecida:', { restaurantId, orderId, userId, conversationId })

  // Lidar com mensagens recebidas
  client.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage
      console.log('📨 Mensagem recebida:', message.type, message)

      // Processar diferentes tipos de eventos
      switch (message.type) {
        case 'join-restaurant':
          // Suporte para diferentes formatos de dados
          let restaurantIdToJoin: string | undefined
          if (message.restaurantId) {
            restaurantIdToJoin = message.restaurantId
          } else if (message.data) {
            // Se data for um array, pegar o primeiro elemento
            if (Array.isArray(message.data) && message.data.length > 0) {
              restaurantIdToJoin = message.data[0] as string
            } else if (typeof message.data === 'string') {
              restaurantIdToJoin = message.data
            }
          }
          
          if (restaurantIdToJoin) {
            extClient.restaurantId = restaurantIdToJoin
            console.log(`📍 Cliente entrou na sala restaurant-${restaurantIdToJoin}`)
          } else {
            console.warn('⚠️ restaurantId não encontrado na mensagem join-restaurant')
          }
          break

        case 'join-order':
          // Suporte para diferentes formatos de dados
          let orderIdToJoin: string | undefined
          if (message.orderId) {
            orderIdToJoin = message.orderId
          } else if (message.data) {
            // Se data for um array, pegar o primeiro elemento
            if (Array.isArray(message.data) && message.data.length > 0) {
              orderIdToJoin = message.data[0] as string
            } else if (typeof message.data === 'string') {
              orderIdToJoin = message.data
            }
          }
          
          if (orderIdToJoin) {
            extClient.orderId = orderIdToJoin
            console.log(`📦 Cliente entrou na sala order-${orderIdToJoin}`)
          } else {
            console.warn('⚠️ orderId não encontrado na mensagem join-order')
          }
          break

        case 'join-user':
          // Suporte para diferentes formatos de dados
          let userIdToJoin: string | undefined
          if (message.userId) {
            userIdToJoin = message.userId
          } else if (message.data) {
            // Se data for um array, pegar o primeiro elemento
            if (Array.isArray(message.data) && message.data.length > 0) {
              userIdToJoin = message.data[0] as string
            } else if (typeof message.data === 'string') {
              userIdToJoin = message.data
            }
          }
          
          if (userIdToJoin) {
            extClient.userId = userIdToJoin
            console.log(`👤 Cliente entrou na sala user-${userIdToJoin}`)
          } else {
            console.warn('⚠️ userId não encontrado na mensagem join-user')
          }
          break

        case 'join-chat':
          // Suporte para diferentes formatos de dados
          let conversationIdToJoin: string | undefined
          if (message.conversationId) {
            conversationIdToJoin = message.conversationId
          } else if (message.data) {
            // Se data for um array, pegar o primeiro elemento
            if (Array.isArray(message.data) && message.data.length > 0) {
              conversationIdToJoin = message.data[0] as string
            } else if (typeof message.data === 'string') {
              conversationIdToJoin = message.data
            }
          }
          
          if (conversationIdToJoin) {
            extClient.conversationId = conversationIdToJoin
            console.log(`💬 Cliente entrou na sala conversation-${conversationIdToJoin}`)
          } else {
            console.warn('⚠️ conversationId não encontrado na mensagem join-chat')
          }
          break

        case 'chat-message':
          // Broadcast mensagem de chat para todos os participantes da conversa
          if (message.data && typeof message.data === 'object') {
            const data = message.data as { conversationId?: string }
            if (data.conversationId) {
              broadcastToConversation(server, data.conversationId, {
                type: 'chat-message',
                data: message.data
              })
            }
          }
          break

        case 'chat-typing':
          // Broadcast indicador de digitação
          if (message.data && typeof message.data === 'object') {
            const data = message.data as { conversationId?: string }
            if (data.conversationId) {
              broadcastToConversation(server, data.conversationId, {
                type: 'chat-typing',
                data: message.data
              })
            }
          }
          break

        case 'new-order':
          // Broadcast para todos os clientes do restaurante
          if (message.data && typeof message.data === 'object' && 'restaurantId' in message.data) {
            broadcastToRestaurant(server, (message.data as { restaurantId: string }).restaurantId, {
              type: 'new-order',
              data: message.data
            })
          }
          break

        case 'payment-update':
          // Broadcast para restaurante e pedido específico
          if (message.data && typeof message.data === 'object') {
            const data = message.data as { restaurantId?: string; orderId?: string }
            if (data.restaurantId) {
              broadcastToRestaurant(server, data.restaurantId, {
                type: 'payment-update',
                data: message.data
              })
            }
            if (data.orderId) {
              broadcastToOrder(server, data.orderId, {
                type: 'payment-update',
                data: message.data
              })
            }
          }
          break

        case 'order-cancelled':
          // Broadcast para restaurante e pedido específico
          if (message.data && typeof message.data === 'object') {
            const data = message.data as { restaurantId?: string }
            if (data.restaurantId) {
              broadcastToRestaurant(server, data.restaurantId, {
                type: 'order-cancelled',
                data: message.data
              })
            }
          }
          break

        default:
          console.warn('⚠️ Tipo de mensagem desconhecido:', message.type)
      }
    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error)
    }
  })

  client.on('close', () => {
    console.log('❌ Cliente WebSocket desconectado')
  })

  client.on('error', (error: Error) => {
    console.error('❌ Erro no WebSocket:', error)
  })
}

// HTTP endpoint para status
export async function GET(_req: NextRequest) {
  return new Response(JSON.stringify({ 
    message: 'WebSocket server ativo',
    path: '/api/socket',
    timestamp: new Date().toISOString(),
    protocol: 'WebSocket (next-ws)'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}