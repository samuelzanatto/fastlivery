import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const business = await prisma.business.findFirst({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        avatar: true,
        banner: true,
        isOpen: true,
        address: true,
        openingHours: true,
        deliveryTime: true,
        deliveryFee: true,
        minimumOrder: true,
        acceptsDelivery: true,
        acceptsPickup: true,
        acceptsDineIn: true,
        phone: true
      }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      )
    }

    // Calcular rating médio (simulado por enquanto)
    const rating = 4.5

    const publicData = {
      id: business.id,
      slug: business.slug || slug,
      name: business.name,
      description: business.description,
      avatar: business.avatar,
      banner: business.banner,
      isOpen: business.isOpen,
      category: 'Empresa', // TODO: Adicionar categoria ao modelo
      rating: rating,
      deliveryTime: business.deliveryTime,
      address: business.address,
      openingHours: business.openingHours,
      acceptsDelivery: business.acceptsDelivery,
      acceptsPickup: business.acceptsPickup,
      acceptsDineIn: business.acceptsDineIn,
      deliveryFee: business.deliveryFee,
      minimumOrder: business.minimumOrder,
      phone: business.phone
    }

    return NextResponse.json(publicData)
  } catch (error) {
    console.error('Erro ao buscar empresa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Usar Better Auth para verificar sessão
    const sessionResponse = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!sessionResponse?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

  const { slug } = await params
    const data = await request.json()
  // Buscar empresa por slug
  const business = await prisma.business.findFirst({ where: { slug } })

    if (!business) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      )
    }

    // TODO: Verificar se o usuário é o dono da empresa
    // Por enquanto, qualquer usuário logado pode editar

    // Atualizar dados da empresa
  const updatedBusiness = await prisma.business.update({
      where: {
        id: business.id
      },
      data: {
        name: data.name || business.name,
        description: data.description || business.description,
        address: data.address || business.address,
        openingHours: data.openingHours || business.openingHours,
        isOpen: data.isOpen !== undefined ? data.isOpen : business.isOpen,
        deliveryTime: data.deliveryTime || business.deliveryTime,
        deliveryFee: data.deliveryFee || business.deliveryFee,
        minimumOrder: data.minimumOrder || business.minimumOrder,
        acceptsDelivery: data.acceptsDelivery !== undefined ? data.acceptsDelivery : business.acceptsDelivery,
        acceptsPickup: data.acceptsPickup !== undefined ? data.acceptsPickup : business.acceptsPickup,
        acceptsDineIn: data.acceptsDineIn !== undefined ? data.acceptsDineIn : business.acceptsDineIn,
        avatar: data.avatar || business.avatar,
        banner: data.banner || business.banner,
        phone: data.phone || business.phone
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        avatar: true,
        banner: true,
        isOpen: true,
        address: true,
        openingHours: true,
        deliveryTime: true,
        deliveryFee: true,
        minimumOrder: true,
        acceptsDelivery: true,
        acceptsPickup: true,
        acceptsDineIn: true,
        phone: true
      }
    })

    return NextResponse.json(updatedBusiness)
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
