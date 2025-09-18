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
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      )
    }

    // Buscar categorias do restaurante com hierarquia
    const categories = await prisma.category.findMany({
      where: {
        restaurantId: restaurant.id,
        isActive: true
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true
          }
        },
        subcategories: {
          where: {
            isActive: true
          },
          include: {
            _count: {
              select: {
                products: {
                  where: {
                    isAvailable: true
                  }
                }
              }
            }
          },
          orderBy: {
            order: 'asc'
          }
        },
        _count: {
          select: {
            products: {
              where: {
                isAvailable: true
              }
            }
          }
        }
      },
      orderBy: {
        order: 'asc'
      }
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Erro ao buscar categorias:', error)
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
    const { name, description, parentId, order = 0 } = data

    // Validar dados obrigatórios
    if (!name) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
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

    // Se parentId foi fornecido, verificar se a categoria pai existe e pertence ao restaurante
    if (parentId) {
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

    // Verificar se já existe categoria com mesmo nome no mesmo nível
    const existingCategory = await prisma.category.findFirst({
      where: {
        restaurantId: restaurant.id,
        parentId: parentId || null,
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Já existe uma categoria com esse nome neste nível' },
        { status: 400 }
      )
    }

    // Criar categoria
    const category = await prisma.category.create({
      data: {
        name,
        description,
        parentId: parentId || null,
        order: parseInt(order),
        restaurantId: restaurant.id
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

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar categoria:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
