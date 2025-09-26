import { NextRequest, NextResponse } from 'next/server'
import { 
  getConversations, 
  sendMessage, 
  markMessagesAsRead 
} from '@/actions/chats/chats'

// GET /api/v2/chats - Obter conversas
export async function GET(_request: NextRequest) {
  try {
    const result = await getConversations()

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === 'UNAUTHORIZED' ? 401 : 400 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Erro na API híbrida de chat (GET):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/v2/chats - Enviar mensagem
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { message, orderId } = data
    
    if (!message) {
      return NextResponse.json(
        { error: 'Mensagem é obrigatória' },
        { status: 400 }
      )
    }
    
    const result = await sendMessage(message, orderId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === 'UNAUTHORIZED' ? 401 : 400 }
      )
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error('Erro na API híbrida de chat (POST):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PATCH /api/v2/chats - Marcar mensagens como lidas
export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json()
    const { conversationId } = data
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId é obrigatório' },
        { status: 400 }
      )
    }
    
    const result = await markMessagesAsRead(conversationId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === 'UNAUTHORIZED' ? 401 : 400 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Erro na API híbrida de chat (PATCH):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}