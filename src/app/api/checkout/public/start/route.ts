import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

const STRIPE_PRICE_IDS: Record<string, string> = {
  basic: process.env.STRIPE_STARTER_PRICE_ID!,
  pro: process.env.STRIPE_PRO_PRICE_ID!,
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan, email, name, restaurantName, restaurantPhone, restaurantAddress, category } = body || {}

    if (!plan || !STRIPE_PRICE_IDS[plan]) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
    }
    if (!email || !name || !restaurantName || !restaurantPhone || !restaurantAddress) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 })
    }

    // Criar sessão de checkout sem usuário autenticado
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PRICE_IDS[plan],
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      customer_email: email,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/signup?cancelled=true`,
      metadata: {
        signupFlow: 'public',
        plan,
        userName: name,
        restaurantName,
        restaurantPhone,
        restaurantAddress,
        category: category || 'restaurant',
      },
    })

  return NextResponse.json({ url: session.url, id: session.id })
  } catch (error) {
    console.error('[checkout.public.start] error:', error)
    return NextResponse.json({ error: 'Erro ao iniciar checkout' }, { status: 500 })
  }
}
