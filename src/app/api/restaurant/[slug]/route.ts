import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const restaurant = await prisma.restaurant.findFirst({
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
    
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      )
    }

    // Calcular rating médio (simulado por enquanto)
    const rating = 4.5

    const publicData = {
      id: restaurant.id,
      slug: restaurant.slug || slug,
      name: restaurant.name,
      description: restaurant.description,
      avatar: restaurant.avatar,
      banner: restaurant.banner,
      isOpen: restaurant.isOpen,
      category: 'Restaurante', // TODO: Adicionar categoria ao modelo
      rating: rating,
      deliveryTime: restaurant.deliveryTime,
      address: restaurant.address,
      openingHours: restaurant.openingHours,
      acceptsDelivery: restaurant.acceptsDelivery,
      acceptsPickup: restaurant.acceptsPickup,
      acceptsDineIn: restaurant.acceptsDineIn,
      deliveryFee: restaurant.deliveryFee,
      minimumOrder: restaurant.minimumOrder,
      phone: restaurant.phone
    }

    return NextResponse.json(publicData)
  } catch (error) {
    console.error('Erro ao buscar restaurante:', error)
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
  // Buscar restaurante por slug
  const restaurant = await prisma.restaurant.findFirst({ where: { slug } })
    
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      )
    }

    // TODO: Verificar se o usuário é o dono do restaurante
    // Por enquanto, qualquer usuário logado pode editar
    
    // Atualizar dados do restaurante
  const updatedRestaurant = await prisma.restaurant.update({
      where: {
        id: restaurant.id
      },
      data: {
        name: data.name || restaurant.name,
        description: data.description || restaurant.description,
        address: data.address || restaurant.address,
        openingHours: data.openingHours || restaurant.openingHours,
        isOpen: data.isOpen !== undefined ? data.isOpen : restaurant.isOpen,
        deliveryTime: data.deliveryTime || restaurant.deliveryTime,
        deliveryFee: data.deliveryFee || restaurant.deliveryFee,
        minimumOrder: data.minimumOrder || restaurant.minimumOrder,
        acceptsDelivery: data.acceptsDelivery !== undefined ? data.acceptsDelivery : restaurant.acceptsDelivery,
        acceptsPickup: data.acceptsPickup !== undefined ? data.acceptsPickup : restaurant.acceptsPickup,
        acceptsDineIn: data.acceptsDineIn !== undefined ? data.acceptsDineIn : restaurant.acceptsDineIn,
        avatar: data.avatar || restaurant.avatar,
        banner: data.banner || restaurant.banner,
        phone: data.phone || restaurant.phone
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

    return NextResponse.json(updatedRestaurant)
  } catch (error) {
    console.error('Erro ao atualizar restaurante:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
