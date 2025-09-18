import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Buscar o produto com seus adicionais
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        additionals: {
          include: {
            additional: {
              include: {
                items: {
                  orderBy: { name: 'asc' }
                }
              }
            }
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { message: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    // Transformar adicionais para o formato esperado pelo modal
    const options = product.additionals.map(productAdditional => ({
      id: productAdditional.additional.id,
      name: productAdditional.additional.name,
      description: productAdditional.additional.description,
      price: productAdditional.additional.price,
      isRequired: productAdditional.additional.isRequired,
      maxOptions: productAdditional.additional.maxOptions,
      options: productAdditional.additional.items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price
      }))
    }))

    return NextResponse.json({
      product: {
        ...product,
        options
      }
    })
  } catch (error) {
    console.error('Erro ao buscar opções do produto:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}