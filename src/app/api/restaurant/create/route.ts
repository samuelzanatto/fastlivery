import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { slugify } from '@/lib/utils-app'

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

  const { restaurantName, restaurantPhone, restaurantAddress, category } = await request.json()

    if (!restaurantName || !restaurantPhone || !restaurantAddress) {
      return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 })
    }

    // Verifica se já existe um restaurante do usuário
    const existing = await prisma.restaurant.findFirst({ where: { ownerId: session.user.id } })
    if (existing) {
      return NextResponse.json({ id: existing.id, alreadyExists: true })
    }

    const slug = slugify(restaurantName)
    // garantir unicidade simples em caso de colisão
    let finalSlug = slug
    let suffix = 1
    while (true) {
      const exists = await prisma.restaurant.findFirst({ where: { slug: finalSlug } })
      if (!exists) break
      finalSlug = `${slug}-${suffix++}`
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        slug: finalSlug,
        name: restaurantName,
        email: `${session.user.email}-restaurant`,
        password: 'temporary',
        phone: restaurantPhone,
        address: restaurantAddress,
        description: `${category || 'Restaurante'} criado via ZapLivery`,
        ownerId: session.user.id,
        isOpen: false,
        acceptsDelivery: true,
        acceptsPickup: true,
        acceptsDineIn: false,
        minimumOrder: 0,
        deliveryFee: 5.0,
        deliveryTime: 30,
      }
    })

    return NextResponse.json({ id: restaurant.id })
  } catch (error) {
    console.error('Erro ao criar restaurante:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
