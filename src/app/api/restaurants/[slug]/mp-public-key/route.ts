import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function debugLog(...args: unknown[]) {
  if (process.env.MP_DEBUG !== '1') return
  console.debug('[MP PUBLIC KEY API]', ...args)
}
// Ajuste: Em versões recentes do Next, params pode ser assíncrono em algumas resoluções internas.
// Garantimos await defensivo caso seja um thenable.
type SlugContext = { params: { slug: string } } | { params: Promise<{ slug: string }> }
export async function GET(_req: NextRequest, context: SlugContext) {
  try {
    const candidateUnknown: unknown = (context as { params: unknown }).params
    let resolvedParams: { slug?: string }
    function isThenable<T>(v: unknown): v is PromiseLike<T> {
      return !!v && typeof v === 'object' && 'then' in v && typeof (v as { then: unknown }).then === 'function'
    }
    if (isThenable<{ slug: string }>(candidateUnknown)) {
      const awaited = await candidateUnknown
      resolvedParams = awaited
    } else if (candidateUnknown && typeof candidateUnknown === 'object') {
      resolvedParams = candidateUnknown as { slug?: string }
    } else {
      resolvedParams = {}
    }
    const { slug } = resolvedParams || {}
    if (!slug) return NextResponse.json({ error: 'Slug obrigatório' }, { status: 400 })

    const restaurant = await prisma.restaurant.findFirst({
      where: { slug },
      select: { mercadoPagoPublicKey: true, mercadoPagoConfigured: true }
    })

    if (!restaurant) {
      debugLog('restaurant:not-found', slug)
      return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 })
    }

    // Fallback: permitir retornar a chave mesmo que configured ainda seja false para facilitar debug
    if (!restaurant.mercadoPagoPublicKey) {
      debugLog('no-public-key-in-db', { slug, configured: restaurant.mercadoPagoConfigured })
      // Opcional: fallback para variável de ambiente (ex: MP_PUBLIC_KEY_TEST) em ambiente de desenvolvimento
      const fallbackEnv = process.env.MP_PUBLIC_KEY || process.env.NEXT_PUBLIC_MP_PUBLIC_KEY
      if (fallbackEnv) {
        debugLog('using-env-fallback')
        return NextResponse.json({ publicKey: fallbackEnv, configured: restaurant.mercadoPagoConfigured })
      }
      return NextResponse.json({ publicKey: null, configured: restaurant.mercadoPagoConfigured })
    }

    debugLog('public-key-returned', {
      configured: restaurant.mercadoPagoConfigured,
      keyPreview: restaurant.mercadoPagoPublicKey.slice(0, 4) + '...' + restaurant.mercadoPagoPublicKey.slice(-4)
    })
    return NextResponse.json({ publicKey: restaurant.mercadoPagoPublicKey, configured: restaurant.mercadoPagoConfigured })
  } catch (e) {
    console.error('Erro ao obter public key MP:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
