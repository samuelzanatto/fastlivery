import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'

export async function GET(_request: NextRequest) {
  try {
    // Verificar produtos e preços sincronizados
    const products = await prisma.stripeProduct.findMany({
      include: {
        prices: {
          where: { active: true },
          orderBy: { unitAmount: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      products: products.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        active: product.active,
        metadata: product.metadata,
        prices: product.prices.map(price => ({
          id: price.id,
          unitAmount: price.unitAmount,
          currency: price.currency,
          type: price.type,
          recurring: price.recurring,
          formattedPrice: price.unitAmount ? `R$ ${(price.unitAmount / 100).toFixed(2)}` : 'Grátis'
        }))
      }))
    })
  } catch (error) {
    console.error('Erro ao buscar produtos Stripe:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}