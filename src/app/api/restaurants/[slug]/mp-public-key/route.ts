import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'

function debugLog(...args: unknown[]) {
  if (process.env.MP_DEBUG !== '1') return
  console.debug('[MP PUBLIC KEY API]', ...args)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params

    if (!slug) return NextResponse.json({ error: 'Slug obrigatório' }, { status: 400 })

    const business = await prisma.business.findFirst({
      where: { slug },
      select: { mercadoPagoPublicKey: true, mercadoPagoConfigured: true }
    })

    if (!business) {
      debugLog('business:not-found', slug)
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    // Fallback: permitir retornar a chave mesmo que configured ainda seja false para facilitar debug
    if (!business.mercadoPagoPublicKey) {
      debugLog('no-public-key-in-db', { slug, configured: business.mercadoPagoConfigured })
      // Opcional: fallback para variável de ambiente (ex: MP_PUBLIC_KEY_TEST) em ambiente de desenvolvimento
      const fallbackEnv = process.env.MP_PUBLIC_KEY || process.env.NEXT_PUBLIC_MP_PUBLIC_KEY
      if (fallbackEnv) {
        debugLog('using-env-fallback')
        return NextResponse.json({ publicKey: fallbackEnv, configured: business.mercadoPagoConfigured })
      }
      return NextResponse.json({ publicKey: null, configured: business.mercadoPagoConfigured })
    }

    debugLog('public-key-returned', {
      configured: business.mercadoPagoConfigured,
      keyPreview: business.mercadoPagoPublicKey.slice(0, 4) + '...' + business.mercadoPagoPublicKey.slice(-4)
    })
    return NextResponse.json({ publicKey: business.mercadoPagoPublicKey, configured: business.mercadoPagoConfigured })
  } catch (e) {
    console.error('Erro ao obter public key MP:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
