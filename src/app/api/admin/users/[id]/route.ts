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

// GET - Buscar usuário específico
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyPlatformAdmin()
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        businessId: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PUT - Atualizar usuário
export async function PUT(
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

    const { name, email, phone, role, businessId, isActive } = body

    // Verificar se usuário existe
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar conflito de email
    if (email !== existing.email) {
      const conflict = await prisma.user.findFirst({
        where: {
          AND: [{ id: { not: id } }, { email }],
        },
      })

      if (conflict) {
        return NextResponse.json({ message: 'Email já em uso' }, { status: 400 })
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        role,
        businessId: businessId === '_none' ? null : businessId,
        isActive,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        businessId: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE - Excluir usuário
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyPlatformAdmin()
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { id } = await params

    // Verificar se usuário existe
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Não permitir excluir a si mesmo
    if (authResult.session.user.id === id) {
      return NextResponse.json({ message: 'Não é possível excluir a si mesmo' }, { status: 400 })
    }

    // Remover usuário e relacionados
    await prisma.$transaction(async (tx) => {
      // Remover ownerId das empresas
      await tx.business.updateMany({
        where: { ownerId: id },
        data: { ownerId: null },
      })

      // Deletar accounts
      await tx.account.deleteMany({ where: { userId: id } })

      // Deletar sessions
      await tx.session.deleteMany({ where: { userId: id } })

      // Deletar tokens de reset
      await tx.passwordResetToken.deleteMany({ where: { userId: id } })

      // Deletar usuário
      await tx.user.delete({ where: { id } })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir usuário:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
