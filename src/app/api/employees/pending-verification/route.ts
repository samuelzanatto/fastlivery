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
      return NextResponse.json({ 
        error: 'ID do restaurante é obrigatório' 
      }, { status: 400 })
    }

    // Verificar se o usuário tem acesso a este restaurante
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        OR: [
          { ownerId: sessionResponse.user.id },
          {
            employeeProfiles: {
              some: {
                userId: sessionResponse.user.id,
                isActive: true,
                role: {
                  permissions: {
                    some: {
                      action: 'MANAGE',
                      resource: 'users'
                    }
                  }
                }
              }
            }
          }
        ]
      }
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar funcionários pendentes de verificação
    const pendingEmployees = await prisma.employeeProfile.findMany({
      where: {
        restaurantId,
        isActive: false,
        user: {
          emailVerified: false
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(pendingEmployees)

  } catch (error) {
    console.error('Erro ao buscar funcionários pendentes:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}