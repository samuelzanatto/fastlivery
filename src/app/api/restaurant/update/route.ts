import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import { slugify } from '@/lib/utils/formatters'
import { computeIsOpenNow, parseOpeningHours } from '@/lib/utils/business-hours'
import { findBusinessForUser } from '@/lib/actions/auth-helpers'

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()

    // Encontrar empresa do usuário (dono ou funcionário)
    const businessData = await findBusinessForUser(session.user.id, {
      requiredPermission: { resource: 'settings', action: 'update' }
    })

    if (!businessData) {
      return NextResponse.json({ error: 'Empresa não encontrada ou sem permissão' }, { status: 404 })
    }

    const business = await prisma.business.findUnique({
      where: { id: businessData.business.id }
    })

    if (!business) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    // Preparar dados de atualização
    const data: Partial<{
      name: string
      description: string | null
      phone: string
      email: string | null
      address: string
      avatar: string | null
      banner: string | null
      isOpen: boolean
      openingHours: string | null
      deliveryTime: number
      deliveryFee: number
      minimumOrder: number
      acceptsDelivery: boolean
      acceptsPickup: boolean
      acceptsDineIn: boolean
      slug: string | null
    }> = {}
    if (typeof body.name === 'string') data.name = body.name
  if (typeof body.description === 'string') data.description = body.description
    if (typeof body.phone === 'string') data.phone = body.phone
  if (typeof body.email === 'string') data.email = body.email
    if (typeof body.address === 'string') data.address = body.address
  if (typeof body.avatar === 'string') data.avatar = body.avatar
  if (typeof body.banner === 'string') data.banner = body.banner
    if (typeof body.deliveryTime === 'number') data.deliveryTime = body.deliveryTime
    if (typeof body.deliveryFee === 'number') data.deliveryFee = body.deliveryFee
    if (typeof body.minimumOrder === 'number') data.minimumOrder = body.minimumOrder
    if (typeof body.acceptsDelivery === 'boolean') data.acceptsDelivery = body.acceptsDelivery
    if (typeof body.acceptsPickup === 'boolean') data.acceptsPickup = body.acceptsPickup
    if (typeof body.acceptsDineIn === 'boolean') data.acceptsDineIn = body.acceptsDineIn

    if (body.openingHours) {
      // Aceita WeeklyHours (objeto) ou string "HH:MM - HH:MM"
      const openingHours = typeof body.openingHours === 'string' ? body.openingHours : JSON.stringify(body.openingHours)
      data.openingHours = openingHours
      // Atualiza isOpen automaticamente baseado nos horários
      const weekly = parseOpeningHours(openingHours)
      data.isOpen = computeIsOpenNow(weekly)
    }

    // Atualização de slug (URL da loja)
    if (typeof body.slug === 'string') {
      const proposed = slugify(body.slug)
      if (!proposed) {
        return NextResponse.json({ error: 'Slug inválido' }, { status: 400 })
      }
      // Verifica unicidade: se já existe outra empresa com o mesmo slug
      const existing = await prisma.business.findFirst({ where: { slug: proposed } })
      if (existing && existing.id !== business.id) {
        return NextResponse.json({ error: 'Este endereço já está em uso' }, { status: 409 })
      }
      data.slug = proposed
    }

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description ?? undefined } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.email !== undefined ? { email: data.email ?? undefined } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.avatar !== undefined ? { avatar: data.avatar ?? undefined } : {}),
        ...(data.banner !== undefined ? { banner: data.banner ?? undefined } : {}),
        ...(data.isOpen !== undefined ? { isOpen: data.isOpen } : {}),
        ...(data.openingHours !== undefined ? { openingHours: data.openingHours ?? undefined } : {}),
        ...(data.deliveryTime !== undefined ? { deliveryTime: data.deliveryTime } : {}),
        ...(data.deliveryFee !== undefined ? { deliveryFee: data.deliveryFee } : {}),
        ...(data.minimumOrder !== undefined ? { minimumOrder: data.minimumOrder } : {}),
        ...(data.acceptsDelivery !== undefined ? { acceptsDelivery: data.acceptsDelivery } : {}),
        ...(data.acceptsPickup !== undefined ? { acceptsPickup: data.acceptsPickup } : {}),
        ...(data.acceptsDineIn !== undefined ? { acceptsDineIn: data.acceptsDineIn } : {}),
      },
      select: {
        id: true,
  slug: true,
        name: true,
        description: true,
        phone: true,
        email: true,
        address: true,
        avatar: true,
        banner: true,
        isOpen: true,
        openingHours: true,
        deliveryTime: true,
        deliveryFee: true,
        minimumOrder: true,
        acceptsDelivery: true,
        acceptsPickup: true,
        acceptsDineIn: true,
      }
    })

    return NextResponse.json({ ok: true, business: updated })
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}