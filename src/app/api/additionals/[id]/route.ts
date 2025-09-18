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
    const { id } = resolvedParams
    
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Buscar o adicional
    const additional = await prisma.restaurantAdditional.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { name: 'asc' }
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            ownerId: true
          }
        }
      }
    })

    if (!additional) {
      return NextResponse.json(
        { message: 'Adicional não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o usuário tem acesso ao restaurante
    if (additional.restaurant.ownerId !== session.user.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    return NextResponse.json({ additional })

  } catch (error) {
    console.error('Erro ao buscar adicional:', error)
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
    const { id } = resolvedParams
    
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
      name, 
      description, 
      price, 
      isRequired, 
      maxOptions, 
      options 
    } = body

    if (!name || !Array.isArray(options) || options.length === 0) {
      return NextResponse.json(
        { message: 'Dados inválidos' },
        { status: 400 }
      )
    }

    // Verificar se o adicional existe e se o usuário tem acesso
    const existingAdditional = await prisma.restaurantAdditional.findUnique({
      where: { id },
      include: {
        restaurant: {
          select: {
            ownerId: true
          }
        }
      }
    })

    if (!existingAdditional) {
      return NextResponse.json(
        { message: 'Adicional não encontrado' },
        { status: 404 }
      )
    }

    if (existingAdditional.restaurant.ownerId !== session.user.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Atualizar o adicional com transação
    const additional = await prisma.$transaction(async (tx) => {
      // Deletar itens antigos
      await tx.restaurantAdditionalItem.deleteMany({
        where: { additionalId: id }
      })

      // Atualizar o adicional e criar novos itens
      return await tx.restaurantAdditional.update({
        where: { id },
        data: {
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
    })

    return NextResponse.json({
      message: 'Adicional atualizado com sucesso',
      additional
    })

  } catch (error) {
    console.error('Erro ao atualizar adicional:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const resolvedParams = await params
    const { id } = resolvedParams
    
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar se o adicional existe e se o usuário tem acesso
    const existingAdditional = await prisma.restaurantAdditional.findUnique({
      where: { id },
      include: {
        restaurant: {
          select: {
            ownerId: true
          }
        }
      }
    })

    if (!existingAdditional) {
      return NextResponse.json(
        { message: 'Adicional não encontrado' },
        { status: 404 }
      )
    }

    if (existingAdditional.restaurant.ownerId !== session.user.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Deletar o adicional (os itens serão deletados automaticamente devido ao onDelete: Cascade)
    await prisma.restaurantAdditional.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'Adicional deletado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao deletar adicional:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}