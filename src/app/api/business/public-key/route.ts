import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({ error: 'Slug da empresa é obrigatório' }, { status: 400 })
    }

    // Buscar negócio pelo slug
    const business = await prisma.business.findFirst({
      where: { slug },
      select: {
        id: true,
        name: true,
        mercadoPagoPublicKey: true,
        mercadoPagoConfigured: true,
      }
    })

    if (!business) {
      return NextResponse.json({ error: 'Negócio não encontrado' }, { status: 404 })
    }

    // Retornar chave pública se configurada
    if (business.mercadoPagoConfigured && business.mercadoPagoPublicKey) {
      return NextResponse.json({
        publicKey: business.mercadoPagoPublicKey,
        businessName: business.name,
        configured: true
      })
    }

    // Retornar indicando que não há configuração específica
    return NextResponse.json({
      publicKey: null,
      businessName: business.name,
      configured: false,
      message: 'Empresa não possui configuração específica do Mercado Pago'
    })
  } catch (error) {
    console.error('Erro ao buscar chave pública da empresa:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
