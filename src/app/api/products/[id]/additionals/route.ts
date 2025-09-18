import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

interface Params {
  id: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const resolvedParams = await params
    const { id: productId } = resolvedParams
    
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar se o produto existe e se o usuário tem acesso
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
        { message: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    // Buscar adicionais associados ao produto
    const productAdditionals = await prisma.productAdditional.findMany({
      where: { productId },
      select: {
        additionalId: true
      }
    })

    const additionalIds = productAdditionals.map(pa => pa.additionalId)

    return NextResponse.json({ additionalIds })

  } catch (error) {
    console.error('Erro ao buscar adicionais do produto:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const resolvedParams = await params
    const { id: putProductId } = resolvedParams
    
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Remover a linha duplicada
    const { additionalIds } = await request.json()

    if (!Array.isArray(additionalIds)) {
      return NextResponse.json(
        { message: 'additionalIds deve ser um array' },
        { status: 400 }
      )
    }

    // Verificar se todos os adicionais pertencem ao mesmo restaurante do usuário
    const additionals = await prisma.restaurantAdditional.findMany({
      where: {
        id: { in: additionalIds },
        restaurant: {
          ownerId: session.user.id
        }
      }
    })

    if (additionals.length !== additionalIds.length) {
      return NextResponse.json(
        { message: 'Alguns adicionais não foram encontrados ou você não tem acesso' },
        { status: 404 }
      )
    }

    // Atualizar as associações
    await prisma.product.update({
      where: { id: putProductId },
      data: {
        additionals: {
          set: additionalIds.map(id => ({ id }))
        }
      }
    })

    return NextResponse.json({ message: 'Adicionais atualizados com sucesso' })

  } catch (error) {
    console.error('Erro ao atualizar adicionais do produto:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}