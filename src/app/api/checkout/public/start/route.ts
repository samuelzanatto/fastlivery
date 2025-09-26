import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { SubscriptionService } from '@/lib/billing/subscription-service'
import { getStripeCallbackUrls } from '@/lib/utils/urls'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan, email, name, businessName, businessPhone, businessAddress, category, companyType } = body || {}

    if (!plan || !email || !name || !businessName || !businessPhone || !businessAddress) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 })
    }

    // Buscar informações do plano dinamicamente
    const planInfo = await SubscriptionService.getPlanInfo(plan)
    
    if (!planInfo || !planInfo.stripePriceId) {
      console.error(`[checkout.public.start] Plano não encontrado ou sem stripePriceId:`, plan, planInfo)
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
    }

    console.log(`[checkout.public.start] Criando sessão para plano:`, plan, `Price ID:`, planInfo.stripePriceId)

    // Criar sessão de checkout sem usuário autenticado
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: planInfo.stripePriceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      customer_email: email,
      ...getStripeCallbackUrls('checkout'),
      metadata: {
        signupFlow: 'public',
        plan,
        userName: name,
        businessName,
        businessPhone,
        businessAddress,
        category: category || 'business',
        companyType: companyType || 'delivery_company',
      },
    })

    console.log(`[checkout.public.start] Sessão criada com sucesso:`, session.id)
    return NextResponse.json({ url: session.url, id: session.id })
  } catch (error) {
    console.error('[checkout.public.start] error:', error)
    return NextResponse.json({ error: 'Erro ao iniciar checkout' }, { status: 500 })
  }
}
