import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    if (!slug) return NextResponse.json({ error: 'Slug obrigatório' }, { status: 400 })

    const restaurant = await prisma.restaurant.findFirst({
      where: { slug },
      select: { mercadoPagoPublicKey: true, mercadoPagoConfigured: true }
    })

    if (!restaurant) return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 })

    if (!restaurant.mercadoPagoConfigured || !restaurant.mercadoPagoPublicKey) {
      return NextResponse.json({ publicKey: null, configured: false })
    }

    return NextResponse.json({ publicKey: restaurant.mercadoPagoPublicKey, configured: true })
  } catch (e) {
    console.error('Erro ao obter public key MP:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
