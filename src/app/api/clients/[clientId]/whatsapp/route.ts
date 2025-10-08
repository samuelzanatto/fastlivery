import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import { z } from 'zod'

const UpdateWhatsappSchema = z.object({
  whatsappEnabled: z.boolean(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { whatsappEnabled } = UpdateWhatsappSchema.parse(body)
    const { clientId } = await params

    // Verificar se o usuário tem uma empresa fornecedora
    const supplier = await prisma.company.findFirst({
      where: {
        ownerId: sessionResponse.user.id,
        type: 'SUPPLIER'
      }
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Empresa fornecedora não encontrada' }, { status: 404 })
    }

    // Buscar o cliente (partnership)
    const partnership = await prisma.partnership.findFirst({
      where: {
        id: clientId,
        supplierId: supplier.id,
      }
    })

    if (!partnership) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Atualizar dados do cliente nas notes
    let clientData = {}
    try {
      clientData = JSON.parse(partnership.notes || '{}')
    } catch (error) {
      console.error('Erro ao processar dados do cliente:', error)
    }

    const updatedClientData = {
      ...clientData,
      whatsappEnabled,
    }

    // Atualizar partnership
    await prisma.partnership.update({
      where: { id: clientId },
      data: {
        notes: JSON.stringify(updatedClientData),
      }
    })

    return NextResponse.json({
      success: true,
      client: {
        id: clientId,
        whatsappEnabled,
      }
    })

  } catch (error) {
    console.error('Erro ao atualizar cliente:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}