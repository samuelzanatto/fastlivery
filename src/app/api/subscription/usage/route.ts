import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { PrismaClient } from '@prisma/client'
import SubscriptionService from '@/lib/billing/subscription-service'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Verificar sessão do usuário
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Buscar empresa do usuário
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        ownedBusinesses: {
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!user || !user.ownedBusinesses[0]) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      )
    }

    const businessId = user.ownedBusinesses[0].id
    const usageOverview = await SubscriptionService.getUsageOverview(businessId)

    return NextResponse.json(usageOverview)
  } catch (error) {
    console.error('Erro ao buscar dados de uso:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
