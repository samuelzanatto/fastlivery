import { Server as SocketIOServer } from 'socket.io'
import { Server as NetServer } from 'http'

interface SocketServer extends NetServer {
  io?: SocketIOServer | undefined
}

interface SocketResponse {
  socket: {
    server: SocketServer
  }
}

export const initSocketIO = (res: SocketResponse): SocketIOServer => {
  if (!res.socket.server.io) {
    console.log('Inicializando Socket.IO server...')
    
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL,
        methods: ['GET', 'POST']
      }
    })

    res.socket.server.io = io

    io.on('connection', (socket) => {
      console.log('Cliente conectado:', socket.id)

      // Join do restaurante
      socket.on('join-restaurant', (restaurantId: string) => {
        socket.join(`restaurant-${restaurantId}`)
        console.log(`Socket ${socket.id} entrou na sala restaurant-${restaurantId}`)
      })

      // Join do cliente
      socket.on('join-user', (userId: string) => {
        socket.join(`user-${userId}`)
        console.log(`Socket ${socket.id} entrou na sala user-${userId}`)
      })

      // Join do pedido específico
      socket.on('join-order', (orderId: string) => {
        socket.join(`order-${orderId}`)
        console.log(`Socket ${socket.id} entrou na sala order-${orderId}`)
      })

      socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id)
      })
    })
  }

  return res.socket.server.io
}

// Tipos para os eventos
export interface OrderUpdateEvent {
  orderId: string
  status: string
  message: string
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

// Funções utilitárias para emitir eventos
export const emitOrderUpdate = (io: SocketIOServer, data: OrderUpdateEvent) => {
  io.to(`order-${data.orderId}`).emit('order-update', data)
  console.log(`Evento order-update emitido para pedido ${data.orderId}`)
}

export const emitNewOrder = (io: SocketIOServer, data: NewOrderEvent) => {
  io.to(`restaurant-${data.restaurantId}`).emit('new-order', data)
  console.log(`Evento new-order emitido para restaurante ${data.restaurantId}`)
}

export const emitPaymentUpdate = (io: SocketIOServer, data: PaymentUpdateEvent) => {
  io.to(`restaurant-${data.restaurantId}`).emit('payment-update', data)
  if (data.orderId) {
    io.to(`order-${data.orderId}`).emit('payment-update', data)
  }
  console.log(`Evento payment-update emitido para restaurante ${data.restaurantId}`)
}
