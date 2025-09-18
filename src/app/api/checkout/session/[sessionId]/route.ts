import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar a sessão do Stripe com informações expandidas
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: [
        'line_items',
        'line_items.data.price.product',
        'payment_intent',
        'subscription'
      ]
    })

    return NextResponse.json(session)
  } catch (error) {
    console.error('Erro ao buscar sessão do Stripe:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
