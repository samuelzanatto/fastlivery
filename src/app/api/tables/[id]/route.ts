import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateTableSchema = z.object({
  number: z.string().min(1, 'Número da mesa é obrigatório').optional(),
  capacity: z.number().min(1, 'Capacidade mínima é 1').max(20, 'Capacidade máxima é 20').optional(),
  status: z.enum(['vacant', 'occupied', 'reserved']).optional()
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  const { id: tableId } = await params

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

    // Verificar se a mesa pertence ao restaurante
    const existingTable = await prisma.table.findFirst({
      where: {
        id: tableId,
        restaurantId: restaurant.id
      }
    })

    if (!existingTable) {
      return NextResponse.json(
        { error: 'Mesa não encontrada' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = updateTableSchema.parse(body)

    // Se está alterando o número, verificar se não existe outro com o mesmo número
    if (validatedData.number && validatedData.number !== existingTable.number) {
      const duplicateTable = await prisma.table.findFirst({
        where: {
          restaurantId: restaurant.id,
          number: validatedData.number,
          id: { not: tableId }
        }
      })

      if (duplicateTable) {
        return NextResponse.json(
          { error: 'Já existe uma mesa com esse número' },
          { status: 400 }
        )
      }
    }

    const updateData: {
      number?: string
      isOccupied?: boolean
      isReserved?: boolean
    } = {}

    if (validatedData.number) {
      updateData.number = validatedData.number
    }

    if (validatedData.status) {
      // Mapear status do frontend para o backend
      switch (validatedData.status) {
        case 'vacant':
          updateData.isOccupied = false
          updateData.isReserved = false
          break
        case 'occupied':
          updateData.isOccupied = true
          updateData.isReserved = false
          break
        case 'reserved':
          updateData.isOccupied = false
          updateData.isReserved = true
          break
      }
    }

    const table = await prisma.table.update({
      where: {
        id: tableId
      },
      data: updateData
    })

    // Função para determinar o status baseado nos campos booleanos
    const getTableStatus = (isOccupied: boolean, isReserved: boolean): 'vacant' | 'occupied' | 'reserved' => {
      if (isOccupied) return 'occupied'
      if (isReserved) return 'reserved'
      return 'vacant'
    }

    const formattedTable = {
      id: table.id,
      number: parseInt(table.number),
      name: `Mesa ${table.number}`,
      capacity: validatedData.capacity || 4,
      status: getTableStatus(table.isOccupied, table.isReserved),
      qrCode: table.qrCode
    }

    return NextResponse.json(formattedTable)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao atualizar mesa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  const { id: tableId } = await params

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

    // Verificar se a mesa pertence ao restaurante
    const existingTable = await prisma.table.findFirst({
      where: {
        id: tableId,
        restaurantId: restaurant.id
      }
    })

    if (!existingTable) {
      return NextResponse.json(
        { error: 'Mesa não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se a mesa tem pedidos ativos
    const activeOrders = await prisma.order.findFirst({
      where: {
        tableId: tableId,
        status: {
          in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY']
        }
      }
    })

    if (activeOrders) {
      return NextResponse.json(
        { error: 'Não é possível excluir mesa com pedidos ativos' },
        { status: 400 }
      )
    }

    await prisma.table.delete({
      where: {
        id: tableId
      }
    })

    return NextResponse.json({ message: 'Mesa excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir mesa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
