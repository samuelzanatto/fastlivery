import { NextRequest, NextResponse } from 'next/server'
import { getConversationDetails, sendMessage } from '@/actions/chats/chats'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const result = await getConversationDetails(id)
    if (!result.success) return NextResponse.json({ error: result.error, code: result.code }, { status: 400 })
    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Erro ao obter conversa:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { content } = body
    if (!content) return NextResponse.json({ error: 'Conteúdo é obrigatório' }, { status: 400 })

    const result = await sendMessage(id, { content })
    if (!result.success) return NextResponse.json({ error: result.error, code: result.code }, { status: 400 })

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error('Erro ao enviar mensagem na conversa:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
