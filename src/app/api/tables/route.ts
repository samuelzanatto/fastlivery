import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { nanoid } from 'nanoid'

const createTableSchema = z.object({
  number: z.string().min(1, 'Número da mesa é obrigatório'),
  capacity: z.number().min(1, 'Capacidade mínima é 1').max(20, 'Capacidade máxima é 20').optional()
})

export async function GET(request: NextRequest) {
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

    // Buscar o restaurante do usuário
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        ownerId: session.user.id
      },
      select: {
        id: true
      }
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      )
    }

    const tables = await prisma.table.findMany({
      where: {
        restaurantId: restaurant.id
      },
      select: {
        id: true,
        number: true,
        qrCode: true,
        isOccupied: true,
        isReserved: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        number: 'asc'
      }
    })

    // Função para determinar o status baseado nos campos booleanos
    const getTableStatus = (isOccupied: boolean, isReserved: boolean): 'vacant' | 'occupied' | 'reserved' => {
      if (isOccupied) return 'occupied'
      if (isReserved) return 'reserved'
      return 'vacant'
    }

    // Mapear para o formato esperado pelo frontend
    const formattedTables = tables.map(table => ({
      id: table.id,
      number: parseInt(table.number),
      name: `Mesa ${table.number}`,
      capacity: 4, // Default capacity - você pode adicionar esse campo no schema depois
      status: getTableStatus(table.isOccupied, table.isReserved),
      qrCode: table.qrCode
    }))

    return NextResponse.json(formattedTables)
  } catch (error) {
    console.error('Erro ao buscar mesas:', error)
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

    // Buscar o restaurante do usuário
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        ownerId: session.user.id
      },
      select: {
        id: true
      }
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = createTableSchema.parse(body)

    // Verificar se já existe mesa com esse número
    const existingTable = await prisma.table.findFirst({
      where: {
        restaurantId: restaurant.id,
        number: validatedData.number
      }
    })

    if (existingTable) {
      return NextResponse.json(
        { error: 'Já existe uma mesa com esse número' },
        { status: 400 }
      )
    }

    // Gerar QR Code único
    const qrCode = nanoid(10)

    const table = await prisma.table.create({
      data: {
        restaurantId: restaurant.id,
        number: validatedData.number,
        qrCode,
        isOccupied: false
      }
    })

    const formattedTable = {
      id: table.id,
      number: parseInt(table.number),
      name: `Mesa ${table.number}`,
      capacity: validatedData.capacity || 4,
      status: 'vacant' as const,
      qrCode: table.qrCode
    }

    return NextResponse.json(formattedTable, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao criar mesa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
