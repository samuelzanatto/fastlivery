import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const sessionResponse = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!sessionResponse?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Buscar restaurante do usuário logado através do relacionamento
    const restaurant = await prisma.restaurant.findFirst({
      where: { ownerId: sessionResponse.user.id },
      select: { id: true }
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado para este usuário' },
        { status: 404 }
      )
    }

    // Buscar produtos com suas categorias e opções
    const products = await prisma.product.findMany({
      where: {
        restaurantId: restaurant.id
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        options: {
          include: {
            options: true
          },
          orderBy: {
            name: 'asc'
          }
        }
      },
      orderBy: [
        { category: { order: 'asc' } },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Erro ao buscar produtos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const sessionResponse = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!sessionResponse?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const data = await request.json()
    const { name, description, price, categoryId, image, isAvailable = true } = data

    // Validar dados obrigatórios
    if (!name || !price || !categoryId) {
      return NextResponse.json(
        { error: 'Nome, preço e categoria são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar restaurante do usuário logado através do relacionamento
    const restaurant = await prisma.restaurant.findFirst({
      where: { ownerId: sessionResponse.user.id },
      select: { id: true }
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se a categoria existe e pertence ao restaurante
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        restaurantId: restaurant.id
      }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    // Criar produto
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        categoryId,
        restaurantId: restaurant.id,
        image,
        isAvailable
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar produto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
