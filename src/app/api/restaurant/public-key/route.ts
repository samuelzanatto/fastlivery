import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({ error: 'Slug do restaurante é obrigatório' }, { status: 400 })
    }

    // Buscar restaurante pelo slug
    const restaurant = await prisma.restaurant.findFirst({
      where: { slug },
      select: {
        id: true,
        name: true,
        mercadoPagoPublicKey: true,
        mercadoPagoConfigured: true,
      }
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 })
    }

    // Retornar chave pública se configurada
    if (restaurant.mercadoPagoConfigured && restaurant.mercadoPagoPublicKey) {
      return NextResponse.json({
        publicKey: restaurant.mercadoPagoPublicKey,
        restaurantName: restaurant.name,
        configured: true
      })
    }

    // Retornar indicando que não há configuração específica
    return NextResponse.json({
      publicKey: null,
      restaurantName: restaurant.name,
      configured: false,
      message: 'Restaurante não possui configuração específica do Mercado Pago'
    })
  } catch (error) {
    console.error('Erro ao buscar chave pública do restaurante:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
