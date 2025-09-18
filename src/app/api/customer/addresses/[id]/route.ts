import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      zipCode,
      isDefault
    } = body

    // Verificar se o endereço pertence ao usuário
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: id,
        userId: session.user.id
      }
    })
    
    if (!existingAddress) {
      return NextResponse.json(
        { error: 'Endereço não encontrado' },
        { status: 404 }
      )
    }

    // Se definindo como padrão, remover padrão dos outros
    if (isDefault) {
      await prisma.address.updateMany({
        where: {
          userId: session.user.id,
          id: { not: id }
        },
        data: { isDefault: false }
      })
    }

    // Atualizar o endereço
    const address = await prisma.address.update({
      where: {
        id: id
      },
      data: {
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        zipCode,
        isDefault
      }
    })
    
    return NextResponse.json({ address })

  } catch (error) {
    console.error('Erro ao atualizar endereço:', error)
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
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar se o endereço pertence ao usuário
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: id,
        userId: session.user.id
      }
    })

    if (!existingAddress) {
      return NextResponse.json(
        { error: 'Endereço não encontrado' },
        { status: 404 }
      )
    }

    // Se for o endereço padrão, não permitir exclusão se houver outros
    if (existingAddress.isDefault) {
      const totalAddresses = await prisma.address.count({
        where: {
          userId: session.user.id
        }
      })

      if (totalAddresses > 1) {
        return NextResponse.json(
          { error: 'Não é possível excluir o endereço principal. Defina outro endereço como principal primeiro.' },
          { status: 400 }
        )
      }
    }

    // Deletar o endereço
    await prisma.address.delete({
      where: {
        id: id
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao deletar endereço:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar se o endereço pertence ao usuário
    const { id } = await params
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: id,
        userId: session.user.id
      }
    })

    if (!existingAddress) {
      return NextResponse.json(
        { error: 'Endereço não encontrado' },
        { status: 404 }
      )
    }

    // Remover padrão dos outros endereços
    await prisma.address.updateMany({
      where: {
        userId: session.user.id,
        isDefault: true,
        id: { not: id }
      },
      data: {
        isDefault: false
      }
    })

    // Definir este como padrão
    const address = await prisma.address.update({
      where: {
        id: id
      },
      data: {
        isDefault: true
      }
    })

    return NextResponse.json({ address })

  } catch (error) {
    console.error('Erro ao definir endereço como padrão:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}