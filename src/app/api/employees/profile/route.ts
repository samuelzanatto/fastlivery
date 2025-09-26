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
      return NextResponse.json({ error: 'businessId obrigatório' }, { status: 400 })
    }

    // Buscar perfil de funcionário do usuário logado
    const employeeProfile = await prisma.employeeProfile.findFirst({
      where: {
        userId: sessionResponse.user.id,
        businessId,
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
