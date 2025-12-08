import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface SendPushRequest {
  businessId: string
  notification: {
    title: string
    body: string
    icon?: string
    badge?: string
    tag?: string
    data?: Record<string, unknown>
    requireInteraction?: boolean
    actions?: Array<{ action: string; title: string; icon?: string }>
  }
  userId?: string
}

// POST - Enviar push notification
export async function POST(request: NextRequest) {
  try {
    const body: SendPushRequest = await request.json()
    const { businessId, notification, userId } = body

    if (!businessId || !notification?.title || !notification?.body) {
      return NextResponse.json(
        { error: 'businessId, notification.title e notification.body são obrigatórios' },
        { status: 400 }
      )
    }

    // Chama a Edge Function do Supabase
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        businessId,
        notification,
        userId
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Erro da Edge Function:', error)
      return NextResponse.json(
        { error: 'Erro ao enviar notificação' },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)

  } catch (error) {
    console.error('Erro ao enviar push notification:', error)
    return NextResponse.json(
      { error: 'Erro interno ao enviar notificação' },
      { status: 500 }
    )
  }
}
