import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'

// Rota compatível com o fetch do checkout: /api/business/[slug]/public-key
// Usa mesma lógica da rota query-based existente, mas com slug em params.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    if (!slug) return NextResponse.json({ error: 'Slug obrigatório' }, { status: 400 })

    const business = await prisma.business.findFirst({
      where: { slug },
      select: {
        name: true,
        mercadoPagoPublicKey: true,
        mercadoPagoConfigured: true
      }
    })

    if (!business) return NextResponse.json({ error: 'Negócio não encontrado' }, { status: 404 })

    if (business.mercadoPagoConfigured && business.mercadoPagoPublicKey) {
      return NextResponse.json({
        publicKey: business.mercadoPagoPublicKey,
        businessName: business.name,
        configured: true
      })
    }

    // Fallback para variável de ambiente (útil se ainda não persistiu) apenas em dev
    const fallbackEnv = process.env.MP_PUBLIC_KEY || process.env.NEXT_PUBLIC_MP_PUBLIC_KEY
    if (fallbackEnv) {
      return NextResponse.json({
        publicKey: fallbackEnv,
        businessName: business.name,
        configured: !!business.mercadoPagoConfigured,
        fallback: true
      })
    }

    return NextResponse.json({
      publicKey: null,
      businessName: business.name,
      configured: !!business.mercadoPagoConfigured,
      message: 'Chave pública não configurada'
    })
  } catch (e) {
    console.error('Erro ao obter public key (slug path):', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
