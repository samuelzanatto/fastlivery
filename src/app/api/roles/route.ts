import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId obrigatório' }, { status: 400 })
    }

    // Verificar se usuário é dono do restaurante ou funcionário
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { ownerId: true }
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 })
    }

    const isOwner = restaurant.ownerId === sessionResponse.user.id
    
    if (!isOwner) {
      // Verificar se é funcionário
      const employeeProfile = await prisma.employeeProfile.findFirst({
        where: {
          userId: sessionResponse.user.id,
          restaurantId,
          isActive: true
        }
      })
      
      if (!employeeProfile) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
      }
    }

    const roles = await prisma.role.findMany({
      where: { restaurantId },
      include: {
        permissions: true,
        employees: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(roles)
  } catch (error) {
    console.error('Erro ao buscar cargos:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { restaurantId, name, description, permissions } = await request.json()

    if (!restaurantId || !name) {
      return NextResponse.json({ error: 'restaurantId e name são obrigatórios' }, { status: 400 })
    }

    // Verificar se usuário é dono do restaurante
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { ownerId: true }
    })

    if (!restaurant || restaurant.ownerId !== sessionResponse.user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const role = await prisma.role.create({
      data: {
        restaurantId,
        name,
        description,
        permissions: {
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

    return NextResponse.json(role, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar cargo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
