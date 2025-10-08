import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/database/prisma'

/**
 * Resolve o supplier do usuário logado sem depender de businessId armazenado em sessão.
 * Estratégia:
 * 1. Tenta achar supplier onde company.ownerId = user.id
 * 2. Se não achar e houver user.businessId, tenta supplier.companyId = businessId
 * 3. Retorna null se não encontrado
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const userId = session.user.id

    // 1. Supplier onde o usuário é owner da company
    let supplier = await prisma.supplier.findFirst({
      where: { company: { ownerId: userId } },
      select: { id: true, companyId: true }
    })

    // 2. Fallback via businessId (se presente)
    const userBusinessId = (session.user as Record<string, unknown>)?.businessId as string | undefined
    if (!supplier && userBusinessId) {
      const byBiz = await prisma.supplier.findUnique({
        where: { companyId: userBusinessId },
        select: { id: true, companyId: true }
      })
      supplier = byBiz || null
    }

  return NextResponse.json({ supplier: supplier ?? null })
  } catch (e) {
    console.error('[API] /api/supplier/me erro', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
