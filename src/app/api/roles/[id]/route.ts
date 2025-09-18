import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

  const { id } = await params
    const { name, description, permissions } = await request.json()

    // Buscar o cargo
    const role = await prisma.role.findUnique({
      where: { id },
      include: { restaurant: { select: { ownerId: true } } }
    })

    if (!role) {
      return NextResponse.json({ error: 'Cargo não encontrado' }, { status: 404 })
    }

    // Verificar se usuário é dono do restaurante
    if (role.restaurant.ownerId !== sessionResponse.user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Atualizar cargo e suas permissões
    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        name: name || role.name,
        description: description ?? role.description,
        permissions: {
          deleteMany: {},
          create: permissions?.map((p: { resource: string; action: string; conditions?: Record<string, unknown> }) => ({
            resource: p.resource,
            action: p.action,
            conditions: p.conditions
          })) || []
        }
      },
      include: {
        permissions: true
      }
    })

    return NextResponse.json(updatedRole)
  } catch (error) {
    console.error('Erro ao atualizar cargo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

  const { id } = await params

    // Buscar o cargo
    const role = await prisma.role.findUnique({
      where: { id },
      include: { 
        restaurant: { select: { ownerId: true } },
        employees: true
      }
    })

    if (!role) {
      return NextResponse.json({ error: 'Cargo não encontrado' }, { status: 404 })
    }

    // Verificar se usuário é dono do restaurante
    if (role.restaurant.ownerId !== sessionResponse.user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Verificar se o cargo ainda tem funcionários
    if (role.employees.length > 0) {
      return NextResponse.json({ 
        error: 'Não é possível excluir um cargo que possui funcionários ativos' 
      }, { status: 400 })
    }

    await prisma.role.delete({ where: { id } })

    return NextResponse.json({ message: 'Cargo excluído com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir cargo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
