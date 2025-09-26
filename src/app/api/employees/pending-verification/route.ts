import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'

export async function GET(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({
        error: 'ID da empresa é obrigatório'
      }, { status: 400 })
    }

    // Verificar se o usuário tem acesso a este negócio
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
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

    if (!business) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar funcionários pendentes de verificação
    const pendingEmployees = await prisma.employeeProfile.findMany({
      where: {
        businessId,
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