import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
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

    // Buscar restaurante do usuário logado
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

    // Verificar se o produto existe e pertence ao restaurante
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: id,
        restaurantId: restaurant.id
      }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
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

    // Atualizar produto
    const updatedProduct = await prisma.product.update({
      where: { id: id },
      data: {
        name,
        description,
        price: parseFloat(price),
        categoryId,
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

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error('Erro ao atualizar produto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
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

    // Buscar restaurante do usuário logado
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

    // Verificar se o produto existe e pertence ao restaurante
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: id,
        restaurantId: restaurant.id
      }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    // Deletar produto
    await prisma.product.delete({
      where: { id: id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar produto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
