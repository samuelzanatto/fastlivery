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

    // Buscar perfil de funcionário do usuário logado
    const employeeProfile = await prisma.employeeProfile.findFirst({
      where: {
        userId: sessionResponse.user.id,
        restaurantId,
        isActive: true
      },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    })

    if (!employeeProfile) {
      return NextResponse.json({ error: 'Perfil de funcionário não encontrado' }, { status: 404 })
    }

    return NextResponse.json(employeeProfile)
  } catch (error) {
    console.error('Erro ao buscar perfil:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
