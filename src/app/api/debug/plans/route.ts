import { NextRequest, NextResponse } from 'next/server'
import { getBillingPlans } from '@/actions/subscription/subscription'

export async function GET(_request: NextRequest) {
  try {
    const result = await getBillingPlans()
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    const formattedPlans = result.data.plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      description: plan.description,
      formattedPrice: `R$ ${plan.price}/mês`,
      priceId: plan.priceId
    }))

    return NextResponse.json({
      success: true,
      plans: formattedPlans,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erro ao verificar planos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}