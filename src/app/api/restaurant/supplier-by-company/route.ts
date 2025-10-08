import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import { auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    if (!companyId) return NextResponse.json({ error: 'companyId ausente' }, { status: 400 })

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    let supplier = await prisma.supplier.findUnique({
      where: { companyId },
      select: { id: true }
    })

    if (!supplier) {
      // Fallback: garantir que a company existe e é do usuário; se for, talvez companyId errado na sessão? tentar localizar supplier pelo owner
      const company = await prisma.company.findUnique({ where: { id: companyId }, select: { ownerId: true } })
      if (company?.ownerId === session.user.id) {
        // Buscar qualquer supplier cuja company.ownerId seja o usuário (caso múltiplos, pegar primeiro)
        const ownedSupplier = await prisma.supplier.findFirst({
          where: { company: { ownerId: session.user.id } },
          select: { id: true }
        })
        if (ownedSupplier) supplier = ownedSupplier
      }
    }

    return NextResponse.json({ supplier })
  } catch (error) {
    console.error('[API] supplier-by-company erro', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
