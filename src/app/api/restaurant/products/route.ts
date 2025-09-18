import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { checkLimit, incrementUsageAfterCreate, decrementUsageAfterDelete, LimitError } from '@/lib/limit-middleware'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
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

    const { name, description, price, categoryId } = await request.json()

    // Buscar restaurante do usuário
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        ownedRestaurants: {
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!user || !user.ownedRestaurants[0]) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      )
    }

    const restaurantId = user.ownedRestaurants[0].id

    // Verificar limite antes de criar produto
    await checkLimit(restaurantId, 'product')

    // Criar produto
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        categoryId,
        restaurantId,
      },
    })

    // Incrementar contador de uso
    await incrementUsageAfterCreate(restaurantId, 'product')

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    if (error instanceof LimitError) {
      return NextResponse.json(
        { 
          error: error.message,
          limitType: error.limitType,
          needsUpgrade: true 
        },
        { status: 403 }
      )
    }

    console.error('Erro ao criar produto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('id')

    if (!productId) {
      return NextResponse.json(
        { error: 'ID do produto é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar restaurante do usuário
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        ownedRestaurants: {
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!user || !user.ownedRestaurants[0]) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      )
    }

    const restaurantId = user.ownedRestaurants[0].id

    // Verificar se o produto pertence ao restaurante do usuário
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        restaurantId,
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    // Deletar produto
    await prisma.product.delete({
      where: { id: productId },
    })

    // Decrementar contador de uso
    await decrementUsageAfterDelete(restaurantId, 'product')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar produto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
