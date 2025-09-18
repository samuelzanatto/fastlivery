import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    // Buscar restaurante por slug
    const restaurant = await prisma.restaurant.findFirst({
      where: { slug },
      select: {
        id: true,
        name: true
      }
    })
    
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      )
    }
    
    // Buscar produtos do restaurante com suas categorias hierárquicas
    const products = await prisma.product.findMany({
      where: {
        restaurantId: restaurant.id,
        isAvailable: true
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            parentId: true,
            order: true,
            parent: {
              select: {
                id: true,
                name: true,
                order: true
              }
            }
          }
        }
      },
      orderBy: [
        { category: { order: 'asc' } },
        { name: 'asc' }
      ]
    })
    
    // Filtrar por categoria se especificada (pode ser categoria principal ou subcategoria)
    const filteredProducts = category 
      ? products.filter(p => 
          p.category.name === category || 
          p.category.parent?.name === category
        )
      : products
    
    // Transformar produtos para o formato esperado pelo frontend
    const formattedProducts = filteredProducts.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.image,
      category: product.category.name,
      parentCategory: product.category.parent?.name || null,
      available: product.isAvailable
    }))
    
    // Buscar categorias hierárquicas (incluindo relação parent-child)
    const allCategories = await prisma.category.findMany({
      where: {
        restaurantId: restaurant.id,
        isActive: true,
        products: {
          some: {
            isAvailable: true
          }
        }
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            order: true
          }
        },
        subcategories: {
          where: {
            isActive: true,
            products: {
              some: {
                isAvailable: true
              }
            }
          },
          select: {
            id: true,
            name: true,
            order: true
          },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { order: 'asc' }
    })
    
    // Separar categorias principais (remover linha não utilizada)
    
    // Criar array simples de todas as categorias para compatibilidade
    const categories = [...new Set(products.map(p => p.category.name))]
    
    // Agrupar produtos por categoria
    const productsByCategory = categories.reduce((acc, cat) => {
      acc[cat] = formattedProducts.filter(p => p.category === cat)
      return acc
    }, {} as Record<string, typeof formattedProducts>)

    // Filtrar apenas categorias principais com subcategorias
    const mainCategoriesWithSubs = allCategories.filter(cat => !cat.parentId)
    
    console.log('Categorias encontradas:', {
      total: allCategories.length,
      principais: mainCategoriesWithSubs.length,
      estrutura: mainCategoriesWithSubs.map(c => ({
        nome: c.name,
        subcategorias: c.subcategories.length
      }))
    })

    return NextResponse.json({
      products: formattedProducts,
      productsByCategory,
      categories,
      categoriesHierarchy: mainCategoriesWithSubs // Apenas categorias principais com subcategorias
    })
  } catch (error) {
    console.error('Erro ao buscar produtos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
