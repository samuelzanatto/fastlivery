import { NextRequest, NextResponse } from 'next/server'
import { io } from 'socket.io-client'

// GET - Testar conexão WebSocket
export async function GET(_request: NextRequest) {
  try {
    console.log('🔧 [WebSocket Test] Iniciando teste de conexão...')
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const socketUrl = baseUrl.replace(':3000', ':3001')
    console.log('🔧 [WebSocket Test] Conectando em:', socketUrl)
    
    // Criar cliente socket temporário para teste
    const socket = io(socketUrl, {
      timeout: 5000,
      autoConnect: true
    })

    // Aguardar conexão ou timeout
    const connectionPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Timeout na conexão'))
      }, 5000)

      socket.on('connect', () => {
        clearTimeout(timer)
        console.log('🟢 [WebSocket Test] Conectado com sucesso!')
        resolve('connected')
      })

      socket.on('connect_error', (error) => {
        clearTimeout(timer)
        console.log('🔴 [WebSocket Test] Erro de conexão:', error)
        reject(error)
      })
    })

    try {
      await connectionPromise
      
      // Testar entrada em sala
      socket.emit('join-restaurant', 'cgpoint')
      console.log('🔧 [WebSocket Test] Enviado join-restaurant para cgpoint')
      
      // Testar evento de novo pedido
      socket.emit('new-order', {
        restaurantSlug: 'cgpoint',
        order: {
          id: 'test-order-123',
          total: 54.90,
          status: 'PENDING',
          createdAt: new Date().toISOString()
        }
      })
      console.log('🔧 [WebSocket Test] Enviado evento new-order')

      socket.disconnect()
      
      return NextResponse.json({
        success: true,
        message: 'WebSocket funcionando corretamente',
        socketUrl,
        timestamp: new Date().toISOString()
      })

    } catch (connectionError) {
      return NextResponse.json({
        success: false,
        error: 'Falha na conexão WebSocket',
        details: connectionError instanceof Error ? connectionError.message : 'Erro desconhecido',
        socketUrl,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('🔴 [WebSocket Test] Erro geral:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro no teste de WebSocket',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

// POST - Simular evento de status de pagamento atualizado
export async function POST(request: NextRequest) {
  try {
    const { orderId, status, restaurantSlug } = await request.json()
    
    console.log('🔧 [WebSocket Test] Simulando evento de status atualizado...')
    console.log('🔧 [WebSocket Test] Dados:', { orderId, status, restaurantSlug })
    
    // Conectar ao socket
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const socketUrl = baseUrl.replace(':3000', ':3001')
    
    const socket = io(socketUrl, {
      timeout: 3000
    })

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout')), 3000)
      
      socket.on('connect', () => {
        clearTimeout(timer)
        
        // Emitir evento de status atualizado
        socket.emit('payment-status-updated', {
          orderId,
          status,
          restaurantSlug,
          timestamp: new Date().toISOString()
        })
        
        console.log('🟢 [WebSocket Test] Evento payment-status-updated enviado')
        socket.disconnect()
        resolve('sent')
      })
      
      socket.on('connect_error', reject)
    })

    return NextResponse.json({
      success: true,
      message: 'Evento de status simulado com sucesso',
      data: { orderId, status, restaurantSlug }
    })

  } catch (error) {
    console.error('🔴 [WebSocket Test] Erro ao simular evento:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro ao simular evento',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
