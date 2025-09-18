import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

const prisma = new PrismaClient()

// GET - Buscar opções do produto
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const session = await auth.api.getSession({ headers: await headers() })
    
    if (!session) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar se o produto existe e pertence ao restaurante do usuário
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        restaurant: {
          ownerId: session.user.id
        }
      },
      include: {
        options: {
          include: {
            options: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      options: product.options.map(option => ({
        id: option.id,
        name: option.name,
        description: option.description,
        price: option.price,
        isRequired: option.isRequired,
        maxOptions: option.maxOptions,
        options: option.options.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price
        }))
      }))
    })

  } catch (error) {
    console.error('Erro ao buscar opções do produto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// PUT - Salvar opções do produto
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const session = await auth.api.getSession({ headers: await headers() })
    
    if (!session) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { options } = body

    // Verificar se o produto existe e pertence ao restaurante do usuário
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        restaurant: {
          ownerId: session.user.id
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    // Iniciar transação para salvar as opções
    await prisma.$transaction(async (tx) => {
      // Remover todas as opções existentes do produto
      await tx.productOptionItem.deleteMany({
        where: {
          productOption: {
            productId: productId
          }
        }
      })

      await tx.productOption.deleteMany({
        where: {
          productId: productId
        }
      })

      // Criar novas opções
      for (const option of options) {
        if (!option.name?.trim()) continue // Pular grupos sem nome

        const createdOption = await tx.productOption.create({
          data: {
            productId: productId,
            name: option.name,
            description: option.description || null,
            price: option.price || 0,
            isRequired: option.isRequired || false,
            maxOptions: option.maxOptions || 1
          }
        })

        // Criar itens da opção
        for (const item of option.options) {
          if (!item.name?.trim()) continue // Pular itens sem nome

          await tx.productOptionItem.create({
            data: {
              productOptionId: createdOption.id,
              name: item.name,
              price: item.price || 0
            }
          })
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Opções do produto salvas com sucesso'
    })

  } catch (error) {
    console.error('Erro ao salvar opções do produto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}