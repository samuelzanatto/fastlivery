import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''

    if (!restaurantId) {
      return NextResponse.json(
        { message: 'ID do restaurante é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o usuário tem acesso ao restaurante
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        ownerId: session.user.id
      }
    })

    if (!restaurant) {
      return NextResponse.json(
        { message: 'Restaurante não encontrado' },
        { status: 404 }
      )
    }

    const offset = (page - 1) * limit

    const whereClause = {
      restaurantId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } }
        ]
      })
    }

    // Contar total de itens
    const total = await prisma.restaurantAdditional.count({
      where: whereClause
    })

    // Buscar adicionais com paginação
    const additionals = await prisma.restaurantAdditional.findMany({
      where: whereClause,
      include: {
        items: {
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' },
      skip: offset,
      take: limit
    })

    // Calcular estatísticas
    const stats = await prisma.restaurantAdditional.groupBy({
      by: ['isRequired'],
      where: { restaurantId },
      _count: { id: true }
    })

    const totalAdditionals = stats.reduce((acc: number, stat) => acc + stat._count.id, 0)
    const requiredCount = stats.find((s) => s.isRequired)?._count.id || 0
    const optionalCount = stats.find((s) => !s.isRequired)?._count.id || 0

    return NextResponse.json({
      additionals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        total: totalAdditionals,
        required: requiredCount,
        optional: optionalCount
      }
    })

  } catch (error) {
    console.error('Erro ao buscar adicionais:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      restaurantId, 
      name, 
      description, 
      price, 
      isRequired, 
      maxOptions, 
      options 
    } = body

    if (!restaurantId || !name || !Array.isArray(options) || options.length === 0) {
      return NextResponse.json(
        { message: 'Dados inválidos' },
        { status: 400 }
      )
    }

    // Verificar se o usuário tem acesso ao restaurante
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        ownerId: session.user.id
      }
    })

    if (!restaurant) {
      return NextResponse.json(
        { message: 'Restaurante não encontrado' },
        { status: 404 }
      )
    }

    // Criar o adicional com seus itens
    const additional = await prisma.restaurantAdditional.create({
      data: {
        restaurantId,
        name,
        description: description || null,
        price: price || 0,
        isRequired: isRequired || false,
        maxOptions: maxOptions || 1,
        items: {
          create: options.map((option: { name: string; price: number }) => ({
            name: option.name,
            price: option.price || 0
          }))
        }
      },
      include: {
        items: true
      }
    })

    return NextResponse.json({ 
      message: 'Adicional criado com sucesso',
      additional
    })

  } catch (error) {
    console.error('Erro ao criar adicional:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}