import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // CRITICAL: Verificar se o usuário é ADMIN ou EMPLOYEE (não CUSTOMER)
    if (session.user.userType === 'CUSTOMER') {
      return NextResponse.json({
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        },
        restaurant: null, // Clientes não têm restaurante
      })
    }

    // Apenas usuários ADMIN ou EMPLOYEE podem ter restaurantes
    if (!['ADMIN', 'EMPLOYEE'].includes(session.user.userType || '')) {
      return NextResponse.json(
        { error: 'Tipo de usuário inválido para acessar dados de restaurante' },
        { status: 403 }
      )
    }

  // Buscar usuário com restaurante(s) que ele é dono
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        ownedRestaurants: {
          select: {
            id: true,
            slug: true,
            name: true,
            isActive: true,
            isOpen: true,
            description: true,
            phone: true,
            email: true,
            address: true,
            avatar: true,
            banner: true,
            openingHours: true,
            deliveryFee: true,
            minimumOrder: true,
            deliveryTime: true,
            acceptsDelivery: true,
            acceptsPickup: true,
            acceptsDineIn: true,
            ownerId: true,
            subscription: {
              select: {
                id: true,
                planId: true,
                status: true,
                currentPeriodEnd: true,
                stripePriceId: true,
              },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Se o usuário tem restaurantes, retornar o primeiro
    const restaurant = user.ownedRestaurants[0] || null

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      restaurant,
    })
  } catch (error) {
    console.error('Erro ao buscar dados do usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
