import { NextResponse } from 'next/server'
import { SubscriptionService } from '@/lib/subscription-service'

export async function GET() {
  try {
    // Buscar planos atualizados do Stripe
    const plans = await SubscriptionService.getAvailablePlans()
    
    return NextResponse.json({
      success: true,
      plans,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erro ao buscar planos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar planos' },
      { status: 500 }
    )
  }
}
