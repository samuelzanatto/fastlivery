import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import { z } from 'zod'
import { normalizePhone } from '@/lib/phone'

const CreateClientSchema = z.object({
  type: z.enum(['MANUAL', 'PARTNERSHIP']),
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  company: z.string().optional(),
  whatsappEnabled: z.boolean().default(true),
})

export async function POST(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const clientData = CreateClientSchema.parse(body)

    // Verificar se o usuário tem uma empresa fornecedora
    const supplierCompany = await prisma.company.findFirst({
      where: {
        ownerId: sessionResponse.user.id,
        type: 'SUPPLIER'
      },
      include: {
        supplier: true
      }
    })

    if (!supplierCompany || !supplierCompany.supplier) {
      return NextResponse.json({ error: 'Empresa fornecedora não encontrada' }, { status: 404 })
    }

    // Criar cliente direto do fornecedor
    const normalizedPhone = normalizePhone(clientData.phone)

    // Evitar duplicados se já existir cliente com mesmo telefone (normalizado ou original)
    const existing = await prisma.supplierClient.findFirst({
      where: {
        supplierId: supplierCompany.supplier.id,
        OR: [
          { phone: clientData.phone },
          { phone: normalizedPhone }
        ]
      }
    })
    if (existing) {
      return NextResponse.json({
        success: true,
        client: {
          id: existing.id,
          type: clientData.type,
          name: existing.name,
          phone: existing.phone,
          email: existing.email,
          company: existing.company,
          whatsappEnabled: existing.whatsappEnabled,
          isActive: true,
          totalOrders: 0,
          createdAt: existing.createdAt,
        }
      })
    }

    const client = await prisma.supplierClient.create({
      data: {
        supplierId: supplierCompany.supplier.id,
        name: clientData.name,
        phone: normalizedPhone,
        email: clientData.email,
        company: clientData.company,
        whatsappEnabled: clientData.whatsappEnabled,
        notes: {
          clientType: clientData.type,
          createdBy: sessionResponse.user.id,
          originalPhoneInput: clientData.phone
        }
      }
    })

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        type: clientData.type,
        name: client.name,
        phone: client.phone,
        email: client.email,
        company: client.company,
        whatsappEnabled: client.whatsappEnabled,
        isActive: true,
        totalOrders: 0,
        createdAt: client.createdAt,
      }
    })

  } catch (error) {
    console.error('Erro ao criar cliente:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se o usuário tem uma empresa fornecedora
    const supplierCompany = await prisma.company.findFirst({
      where: {
        ownerId: sessionResponse.user.id,
        type: 'SUPPLIER'
      },
      include: {
        supplier: true
      }
    })

    if (!supplierCompany || !supplierCompany.supplier) {
      return NextResponse.json({ error: 'Empresa fornecedora não encontrada' }, { status: 404 })
    }

    // Buscar clientes diretos
    const supplierClients = await prisma.supplierClient.findMany({
      where: {
        supplierId: supplierCompany.supplier.id,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const clients = supplierClients.map((c) => {
      let clientType = 'MANUAL'
      if (c.notes && typeof c.notes === 'object' && 'clientType' in c.notes) {
        const ct = (c.notes as Record<string, unknown>).clientType
        if (typeof ct === 'string') clientType = ct
      }
      return {
        id: c.id,
        type: clientType,
        name: c.name,
        phone: c.phone,
        email: c.email || '',
        company: c.company || '',
        whatsappEnabled: c.whatsappEnabled,
        isActive: true,
        totalOrders: 0,
        lastContact: null,
        createdAt: c.createdAt,
      }
    })

    return NextResponse.json({
      success: true,
      clients
    })

  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}