import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import { auth } from '@/lib/auth/auth'
import { syncUserData } from '@/lib/auth/user-sync'

export async function GET(_request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: _request.headers })
    
    if (!sessionResponse?.user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const userId = sessionResponse.user.id
    console.log('[business/me] User ID da sessão:', userId)

    await syncUserData(sessionResponse.user)

    const business = await prisma.business.findFirst({
      where: {
        ownerId: userId
      },
      include: {
        subscription: true,
        categories: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        products: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    console.log('[business/me] Negócio encontrado:', business ? business.id : 'null')

    if (!business) {
      return NextResponse.json(
        { error: 'Negócio não encontrado' },
        { status: 404 }
      )
    }

    const { password: _password, ...businessData } = business

    return NextResponse.json({
      business: businessData,
      owner: sessionResponse.user
    })

  } catch (error) {
    console.error('Erro ao buscar dados do negócio:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
