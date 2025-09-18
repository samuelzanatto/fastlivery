import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(_request: NextRequest) {
  try {
    // Obter dados do usuário logado usando Better Auth
    const sessionResponse = await auth.api.getSession({ headers: _request.headers })
    
    if (!sessionResponse?.user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const userId = sessionResponse.user.id

    // Buscar restaurante do usuário
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        ownerId: userId
      },
      include: {
        subscription: true,
        categories: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        },
        products: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      )
    }

    // Remover dados sensíveis
    const { password: _password, ...restaurantData } = restaurant

    return NextResponse.json({
      restaurant: restaurantData,
      owner: sessionResponse.user
    })

  } catch (error) {
    console.error('Erro ao buscar dados do restaurante:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Obter dados do usuário logado usando Better Auth
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    
    if (!sessionResponse?.user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const userId = sessionResponse.user.id
    const data = await request.json()

    // Verificar se o restaurante pertence ao usuário
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        ownerId: userId
      }
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      )
    }

    // Campos permitidos para atualização
    const allowedFields = [
      'name',
      'description',
      'phone',
      'address',
      'avatar',
      'banner',
      'isOpen',
      'openingHours',
      'deliveryFee',
      'minimumOrder',
      'deliveryTime',
      'acceptsDelivery',
      'acceptsPickup',
      'acceptsDineIn',
      'mercadoPagoAccessToken',
      'mercadoPagoPublicKey',
      'mercadoPagoConfigured'
    ]

    // Filtrar apenas campos permitidos
    const updateData = Object.keys(data)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = data[key]
        return obj
      }, {} as Record<string, unknown>)

    // Atualizar restaurante
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    })

    // Remover dados sensíveis
    const { password: _password, ...restaurantData } = updatedRestaurant

    return NextResponse.json({
      restaurant: restaurantData,
      message: 'Restaurante atualizado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao atualizar restaurante:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
