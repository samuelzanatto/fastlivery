import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { RealtimeMessage } from '@/lib/realtime/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { channel, message }: { channel: string; message: RealtimeMessage } = body

    if (!channel || !message) {
      return NextResponse.json(
        { error: 'Canal e mensagem são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar estrutura da mensagem
    if (!message.id || !message.type || !message.payload || !message.timestamp) {
      return NextResponse.json(
        { error: 'Estrutura da mensagem inválida' },
        { status: 400 }
      )
    }

    // Usar a função realtime.send para enviar a mensagem
    const { error } = await supabaseAdmin.rpc('send_realtime_message', {
      channel_name: channel,
      event_type: message.type,
      message_payload: message
    })

    if (error) {
      console.error('Erro ao enviar mensagem realtime:', error)
      return NextResponse.json(
        { error: 'Erro interno ao enviar mensagem' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro na API broadcast:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}