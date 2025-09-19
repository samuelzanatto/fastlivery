import type { WebSocket, WebSocketServer } from 'ws'

// Interface para WebSocket estendido
interface ExtendedWebSocket extends WebSocket {
  restaurantId?: string
  orderId?: string
  userId?: string
  conversationId?: string
}

// Armazenar referências aos WebSocket servers para broadcasting
let wsServer: WebSocketServer | null = null

export function setWebSocketServer(server: WebSocketServer) {
  wsServer = server
}

export function getWebSocketServer() {
  return wsServer
}

// Função para broadcast para restaurante
export function broadcastToRestaurant(
  server: WebSocketServer, 
  restaurantId: string, 
  message: { type: string; data: unknown }
) {
  server.clients.forEach((client) => {
    const extClient = client as ExtendedWebSocket
    if (client.readyState === client.OPEN && extClient.restaurantId === restaurantId) {
      client.send(JSON.stringify(message))
    }
  })
  console.log(`📡 Broadcast enviado para restaurant-${restaurantId}:`, message.type)
}

// Função para broadcast para pedido
export function broadcastToOrder(
  server: WebSocketServer, 
  orderId: string, 
  message: { type: string; data: unknown }
) {
  server.clients.forEach((client) => {
    const extClient = client as ExtendedWebSocket
    if (client.readyState === client.OPEN && extClient.orderId === orderId) {
      client.send(JSON.stringify(message))
    }
  })
  console.log(`📡 Broadcast enviado para order-${orderId}:`, message.type)
}

// Função para broadcast para conversa de chat
export function broadcastToConversation(
  server: WebSocketServer, 
  conversationId: string, 
  message: { type: string; data: unknown }
) {
  server.clients.forEach((client) => {
    const extClient = client as ExtendedWebSocket
    if (client.readyState === client.OPEN && extClient.conversationId === conversationId) {
      client.send(JSON.stringify(message))
    }
  })
  console.log(`💬 Broadcast enviado para conversation-${conversationId}:`, message.type)
}

// Função para broadcast para usuário específico
export function broadcastToUser(
  server: WebSocketServer, 
  userId: string, 
  message: { type: string; data: unknown }
) {
  server.clients.forEach((client) => {
    const extClient = client as ExtendedWebSocket
    if (client.readyState === client.OPEN && extClient.userId === userId) {
      client.send(JSON.stringify(message))
    }
  })
  console.log(`👤 Broadcast enviado para user-${userId}:`, message.type)
}