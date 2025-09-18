import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

export async function POST(_request: NextRequest) {
  try {
    // Verificar se o usuário está autenticado
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // TODO: Buscar customer_id do usuário no banco de dados
    // Por enquanto, usando um valor mock
    const customerId = 'cus_mock_customer_id'

    // Criar sessão do portal de billing
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
    })

    return NextResponse.json({
      url: portalSession.url
    })

  } catch (error) {
    console.error('Erro ao criar sessão do portal:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
