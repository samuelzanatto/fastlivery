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

// GET - Buscar empresa específica
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

    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    })

    if (!business) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    return NextResponse.json(business)
  } catch (error) {
    console.error('Erro ao buscar empresa:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PUT - Atualizar empresa
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

    const {
      name,
      email,
      phone,
      address,
      description,
      slug,
      isActive,
      acceptsDelivery,
      acceptsPickup,
      acceptsDineIn,
      deliveryFee,
      minimumOrder,
      deliveryTime,
      ownerId,
    } = body

    // Verificar se empresa existe
    const existing = await prisma.business.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    // Verificar conflito de email/slug
    if (email !== existing.email || slug !== existing.slug) {
      const conflict = await prisma.business.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                { email: email || undefined },
                { slug: slug || undefined },
              ],
            },
          ],
        },
      })

      if (conflict) {
        return NextResponse.json({ message: 'Email ou slug já em uso' }, { status: 400 })
      }
    }

    const business = await prisma.business.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        address,
        description,
        slug,
        isActive,
        acceptsDelivery,
        acceptsPickup,
        acceptsDineIn,
        deliveryFee,
        minimumOrder,
        deliveryTime,
        ownerId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(business)
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH - alias para PUT (compat)
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return PUT(request, ctx)
}

// DELETE - Excluir empresa
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

    // Verificar se empresa existe
    const existing = await prisma.business.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    // Remover referências antes de deletar
    await prisma.$transaction(async (tx) => {
      // Remover businessId dos usuários
      await tx.user.updateMany({
        where: { businessId: id },
        data: { businessId: null },
      })

      // Deletar empresa (cascades configurados no schema devem cuidar das relações)
      await tx.business.delete({ where: { id } })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir empresa:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
