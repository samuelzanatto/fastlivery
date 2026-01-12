import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'

// Verificar se é admin da plataforma
async function verifyPlatformAdmin() {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })

  if (!session?.user) {
    return { error: 'Não autorizado', status: 401 }
  }

  const role = session.user.role
  if (role !== 'platformAdmin' && role !== 'platformSupport') {
    return { error: 'Acesso negado', status: 403 }
  }

  return { session }
}

// PATCH - Ativar/Desativar empresa
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyPlatformAdmin()
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { id } = await params
    const body = await request.json()
    const { isActive } = body

    // Verificar se empresa existe
    const existing = await prisma.business.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    const business = await prisma.business.update({
      where: { id },
      data: { isActive },
    })

    return NextResponse.json(business)
  } catch (error) {
    console.error('Erro ao alterar status:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
