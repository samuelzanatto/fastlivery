import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
  const userId = (await params).id

    // Verificar se o usuário pode acessar este perfil (próprio perfil ou admin)
    if (sessionResponse.user.id !== userId) {
      // TODO: Adicionar verificação se é admin/owner
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar dados do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        userType: true,
        isActive: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Buscar dados de funcionário se existir
    const employeeProfile = await prisma.employeeProfile.findFirst({
      where: { userId },
      include: {
        role: {
          select: {
            name: true,
            description: true
          }
        }
      }
    })

    return NextResponse.json({
      user,
      employee: employeeProfile
    })

  } catch (error) {
    console.error('Erro ao buscar perfil:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
  const userId = (await params).id
    const { name, phone, image } = await request.json()

    // Verificar se o usuário pode editar este perfil (próprio perfil)
    if (sessionResponse.user.id !== userId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Atualizar dados do usuário
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name || undefined,
        phone: phone || undefined,
        image: image || undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        userType: true,
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      user: updatedUser
    })

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}