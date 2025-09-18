import { Server as SocketIOServer } from 'socket.io'
import { createServer, Server } from 'http'
import { NextRequest, NextResponse } from 'next/server'

let io: SocketIOServer | undefined
let httpServer: Server | undefined

export function initSocketIO(): SocketIOServer {
  if (!io) {
    console.log('Inicializando Socket.IO server...')
    
    httpServer = createServer()
    
    io = new SocketIOServer(httpServer, {
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ['GET', 'POST']
      }
    })

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

    // Iniciar servidor HTTP para Socket.IO
    const port = parseInt(process.env.SOCKET_PORT || '3001')
    httpServer.listen(port, () => {
      console.log(`Socket.IO server rodando na porta ${port}`)
    })
  }

  return io
}

// Função para obter a instância do Socket.IO
export function getSocketIO(): SocketIOServer | undefined {
  if (!io) {
    initSocketIO()
  }
  return io
}

// Handler para Next.js API routes
export async function GET(_request: NextRequest) {
  try {
    const socketIO = initSocketIO()
    return NextResponse.json({ 
      message: 'Socket.IO server inicializado',
      connected: socketIO.engine.clientsCount,
      port: process.env.SOCKET_PORT || '3001'
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Erro ao inicializar Socket.IO:', error)
    return NextResponse.json({ 
      error: 'Erro ao inicializar Socket.IO' 
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
