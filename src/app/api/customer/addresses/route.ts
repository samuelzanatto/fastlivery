import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'

export async function GET(_request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: _request.headers
    })
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const addresses = await prisma.address.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({ addresses })

  } catch (error) {
    console.error('Erro ao buscar endereços:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    // Validações básicas
    if (!street || !number || !neighborhood || !city || !state || !zipCode) {
      return NextResponse.json(
        { error: 'Campos obrigatórios não preenchidos' },
        { status: 400 }
      )
    }

    // Se este endereço for definido como padrão, remover padrão dos outros
    if (isDefault) {
      await prisma.address.updateMany({
        where: {
          userId: session.user.id,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })
    }

    // Criar o novo endereço
    const address = await prisma.address.create({
      data: {
        userId: session.user.id,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        zipCode: zipCode.replace(/\D/g, ''), // Limpar CEP
        isDefault: isDefault || false
      }
    })

    return NextResponse.json({ address })

  } catch (error) {
    console.error('Erro ao criar endereço:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}