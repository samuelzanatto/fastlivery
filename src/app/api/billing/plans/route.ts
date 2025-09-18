import { NextResponse } from 'next/server'
import { SubscriptionService } from '@/lib/subscription-service'

export async function GET() {
  try {
    // Buscar planos atualizados usando o novo sistema de sincronização
    const plans = await SubscriptionService.getAvailablePlans()
    
    // Mapear para o formato esperado pela API antiga (compatibilidade)
    const formattedPlans = plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      price: (plan.price / 100).toFixed(0), // Converter centavos para reais
      productId: `product_${plan.id}`, // ID fictício para compatibilidade
      priceId: plan.stripePriceId,
      description: plan.description,
      metadata: {
        planKey: plan.id,
        interval: plan.interval,
        ...plan.limits
      }
    }))

    return NextResponse.json({ plans: formattedPlans })
  } catch (error) {
    console.error('❌ Erro ao buscar planos:', error)
    
    // Fallback para planos estáticos em caso de erro
    const fallbackPlans = [
      {
        id: 'starter',
        name: 'ZapLivery Starter',
        price: '49',
        productId: 'product_starter',
        priceId: process.env.STRIPE_STARTER_PRICE_ID,
        description: 'Plano básico para pequenos restaurantes',
        metadata: { planKey: 'starter', interval: 'month' }
      },
      {
        id: 'pro', 
        name: 'ZapLivery Pro',
        price: '99',
        productId: 'product_pro',
        priceId: process.env.STRIPE_PRO_PRICE_ID,
        description: 'Plano avançado para restaurantes em crescimento',
        metadata: { planKey: 'pro', interval: 'month' }
      },
      {
        id: 'enterprise',
        name: 'ZapLivery Enterprise', 
        price: '199',
        productId: 'product_enterprise',
        priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
        description: 'Plano completo para grandes restaurantes',
        metadata: { planKey: 'enterprise', interval: 'month' }
      }
    ]
    
    return NextResponse.json({ plans: fallbackPlans })
  }
}
