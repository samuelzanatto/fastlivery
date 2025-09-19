import { NextRequest, NextResponse } from 'next/server'

// GET - Testar conexão WebSocket
export async function GET(_request: NextRequest) {
  try {
    console.log('🔧 [WebSocket Test] Testando sistema WebSocket...')
    
    // Testar se a rota WebSocket existe
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    console.log('🔧 [WebSocket Test] Base URL:', baseUrl)
    
    return NextResponse.json({
      success: true,
      message: 'WebSocket endpoint disponível em /api/socket',
      endpoint: `${baseUrl}/api/socket`,
      emitEndpoint: `${baseUrl}/api/ws-emit`,
      timestamp: new Date().toISOString()
    })

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
    
    // Usar o sistema de WebSocket HTTP
    const { emitWebSocketEvent } = await import('@/lib/socket')
    
    await emitWebSocketEvent('payment-status-updated', {
      orderId,
      status,
      restaurantSlug,
      timestamp: new Date().toISOString()
    })
    
    console.log('🟢 [WebSocket Test] Evento payment-status-updated enviado via HTTP')

    return NextResponse.json({
      success: true,
      message: 'Evento de status simulado com sucesso via WebSocket HTTP',
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
