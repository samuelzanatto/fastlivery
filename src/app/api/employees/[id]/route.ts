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
    const { roleId, isActive, notes, salary } = await request.json()

    // Buscar funcionário
    const employee = await prisma.employeeProfile.findUnique({
      where: { id },
      include: { restaurant: { select: { ownerId: true } } }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
    }

    // Verificar se usuário é dono do restaurante
    if (employee.restaurant.ownerId !== sessionResponse.user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Atualizar funcionário
    const updatedEmployee = await prisma.employeeProfile.update({
      where: { id },
      data: {
        ...(roleId && { roleId }),
        ...(isActive !== undefined && { isActive }),
        ...(notes !== undefined && { notes }),
        ...(salary !== undefined && { salary }),
        ...(isActive === false && { endDate: new Date() })
      },
      include: {
        user: {
          select: { 
            id: true, 
            name: true, 
            email: true, 
            phone: true, 
            image: true,
            isActive: true 
          }
        },
        role: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(updatedEmployee)
  } catch (error) {
    console.error('Erro ao atualizar funcionário:', error)
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

    // Buscar funcionário
    const employee = await prisma.employeeProfile.findUnique({
      where: { id },
      include: { restaurant: { select: { ownerId: true } } }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
    }

    // Verificar se usuário é dono do restaurante
    if (employee.restaurant.ownerId !== sessionResponse.user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Desativar em vez de excluir (soft delete)
    await prisma.employeeProfile.update({
      where: { id },
      data: {
        isActive: false,
        endDate: new Date()
      }
    })

    return NextResponse.json({ message: 'Funcionário desativado com sucesso' })
  } catch (error) {
    console.error('Erro ao desativar funcionário:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
