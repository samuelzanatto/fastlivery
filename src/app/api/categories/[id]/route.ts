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
    const { name, description, parentId, order = 0, isActive = true } = data

    // Validar dados obrigatórios
    if (!name) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
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

    // Verificar se a categoria existe e pertence ao restaurante
    const existingCategory = await prisma.category.findFirst({
      where: {
        id: id,
        restaurantId: restaurant.id
      }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    // Se parentId foi fornecido, verificar se a categoria pai existe e pertence ao restaurante
    if (parentId) {
      // Não permitir que a categoria seja pai de si mesma
      if (parentId === id) {
        return NextResponse.json(
          { error: 'Uma categoria não pode ser pai de si mesma' },
          { status: 400 }
        )
      }

      const parentCategory = await prisma.category.findFirst({
        where: {
          id: parentId,
          restaurantId: restaurant.id,
          isActive: true,
          parentId: null // Garantir que a categoria pai é uma categoria principal
        }
      })

      if (!parentCategory) {
        return NextResponse.json(
          { error: 'Categoria pai não encontrada ou inválida' },
          { status: 400 }
        )
      }
    }

    // Verificar se já existe outra categoria com mesmo nome no mesmo nível
    const duplicateCategory = await prisma.category.findFirst({
      where: {
        restaurantId: restaurant.id,
        parentId: parentId || null,
        name: {
          equals: name,
          mode: 'insensitive'
        },
        id: {
          not: id
        }
      }
    })

    if (duplicateCategory) {
      return NextResponse.json(
        { error: 'Já existe uma categoria com esse nome neste nível' },
        { status: 400 }
      )
    }

    // Atualizar categoria
    const updatedCategory = await prisma.category.update({
      where: { id: id },
      data: {
        name,
        description,
        parentId: parentId || null,
        order: parseInt(order),
        isActive,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(updatedCategory)
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error)
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

    // Verificar se a categoria existe e pertence ao restaurante
    const existingCategory = await prisma.category.findFirst({
      where: {
        id: id,
        restaurantId: restaurant.id
      }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se a categoria tem produtos
    const productCount = await prisma.product.count({
      where: { categoryId: id }
    })

    if (productCount > 0) {
      return NextResponse.json(
        { error: 'Não é possível deletar uma categoria que possui produtos. Primeiro, mova os produtos para outra categoria.' },
        { status: 400 }
      )
    }

    // Verificar se a categoria tem subcategorias
    const subcategoryCount = await prisma.category.count({
      where: { parentId: id }
    })

    if (subcategoryCount > 0) {
      return NextResponse.json(
        { error: 'Não é possível deletar uma categoria que possui subcategorias. Primeiro, mova ou delete as subcategorias.' },
        { status: 400 }
      )
    }

    // Deletar categoria
    await prisma.category.delete({
      where: { id: id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar categoria:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
