import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'

// Limpa payments placeholders/orfãos antigos e marca merge info
// GET /api/payments/mercadopago/cleanup?dryRun=1
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const authHeader = req.headers.get('x-internal-token')
  const expected = process.env.INTERNAL_ADMIN_TOKEN
  if (!expected || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const dryRun = searchParams.get('dryRun') === '1'
  const olderThanDays = Number(searchParams.get('days') || '7')
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)

  try {
    // Criteria: metadata.bootstrap=true OR metadata.orphan=true OR metadata.mergedInto!=null
    // e updatedAt < cutoff e sem orderId (exceto mergedInto)
    const candidates = await prisma.payment.findMany({
      where: {
        updatedAt: { lt: cutoff },
        OR: [
          { metadata: { path: ['bootstrap'], equals: true } },
          { metadata: { path: ['orphan'], equals: true } },
          { metadata: { path: ['mergedInto'], string_contains: '' } } // qualquer valor presente
        ]
      },
      take: 200
    })

    interface PaymentWithMeta { metadata: unknown; orderId: string | null; preferenceId: string }
    const toDelete = candidates.filter((c: PaymentWithMeta) => {
      const meta = (c.metadata || {}) as Record<string, unknown>
      return !c.orderId || typeof meta.mergedInto === 'string'
    })

    if (dryRun) {
      return NextResponse.json({ dryRun: true, count: toDelete.length, sample: toDelete.slice(0, 5).map(p => p.preferenceId) })
    }

    for (const pay of toDelete) {
      await prisma.payment.delete({ where: { preferenceId: pay.preferenceId } }).catch(() => {})
    }

    return NextResponse.json({ deleted: toDelete.length })
  } catch (e) {
    console.error('[cleanup] erro', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
