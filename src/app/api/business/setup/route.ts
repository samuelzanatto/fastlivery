import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import { auth } from '@/lib/auth/auth'

export async function POST(request: NextRequest) {
  try {
    // Verificar sessão usando Better Auth
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!session) {
      return NextResponse.json(
        { error: 'Token de autorização não fornecido' },
        { status: 401 }
      )
    }

    const {
      name,
      description,
      phone,
      email,
      address,
      city,
      state,
      zipCode,
      deliveryFee,
      minimumOrder,
      deliveryTime,
      acceptsDelivery,
      acceptsPickup,
      acceptsDineIn,
      openingHours
    } = await request.json()

    // Validações básicas
    if (!name || !phone || !address || !city || !state || !zipCode) {
      return NextResponse.json(
        { error: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      )
    }

    // Buscar negócio do usuário através do relacionamento
    const business = await prisma.business.findFirst({
      where: { ownerId: session.user.id }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Empresa não encontrada para este usuário' },
        { status: 404 }
      )
    }

    // Atualizar empresa
    const updatedBusiness = await prisma.business.update({
      where: { id: business.id },
      data: {
        name,
        description: description || null,
        phone,
        email: email || null,
        address: `${address}, ${city}, ${state}, ${zipCode}`,
        deliveryFee: deliveryFee ? parseFloat(deliveryFee) : 0,
        minimumOrder: minimumOrder ? parseFloat(minimumOrder) : 0,
        deliveryTime: deliveryTime ? parseInt(deliveryTime) : 30,
        acceptsDelivery: acceptsDelivery ?? true,
        acceptsPickup: acceptsPickup ?? true,
        acceptsDineIn: acceptsDineIn ?? true,
        openingHours: openingHours ? JSON.stringify(openingHours) : null,
        isActive: true // Ativar após setup completo
      }
    })

    // Criar categorias padrão
    const defaultCategories = [
      { name: 'Pratos Principais', description: 'Pratos principais do cardápio' },
      { name: 'Bebidas', description: 'Refrigerantes, sucos e bebidas' },
      { name: 'Sobremesas', description: 'Doces e sobremesas' }
    ]

    for (const category of defaultCategories) {
      await prisma.category.create({
        data: {
          ...category,
          businessId: updatedBusiness.id
        }
      })
    }

    return NextResponse.json({
      message: 'Empresa configurada com sucesso',
      business: {
        id: updatedBusiness.id,
        name: updatedBusiness.name,
        isActive: updatedBusiness.isActive
      }
    })
  } catch (error) {
    console.error('Erro no setup da empresa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
