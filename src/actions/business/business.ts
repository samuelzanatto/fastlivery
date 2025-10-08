'use server'

import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import { slugify } from '@/lib/utils/formatters'
import { computeIsOpenNow, parseOpeningHours } from '@/lib/utils/business-hours'
import { headers } from 'next/headers'

export interface BusinessUpdateInput {
  name?: string
  description?: string | null
  phone?: string
  address?: string
  avatar?: string | null
  banner?: string | null
  isOpen?: boolean
  openingHours?: string | object | null
  deliveryTime?: number
  deliveryFee?: number
  minimumOrder?: number
  acceptsDelivery?: boolean
  acceptsPickup?: boolean
  acceptsDineIn?: boolean
  slug?: string | null
  // Mercado Pago
  mercadoPagoPublicKey?: string | null
  mercadoPagoAccessToken?: string | null
  mercadoPagoConfigured?: boolean
}

export interface BusinessData {
  id: string
  slug: string | null
  name: string
  description: string | null
  phone: string
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
}

/**
 * Atualiza dados do negócio do usuário logado
 */
export async function updateBusiness(
  updates: BusinessUpdateInput
): Promise<{ success: true; data: BusinessData } | { success: false; error: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    
    if (!session?.user) {
      return { success: false, error: 'Não autorizado' }
    }

    // SECURITY: Verificar se usuário tem role adequada para business
    const allowedRoles = ['businessOwner', 'businessAdmin', 'businessManager']
    if (!session.user.role || !allowedRoles.includes(session.user.role)) {
      return { success: false, error: 'Role não autorizada para operações de negócio' }
    }

    // Encontrar negócio do dono
    const business = await prisma.business.findFirst({
      where: { ownerId: session.user.id },
    })

    if (!business) {
      return { success: false, error: 'Negócio não encontrado' }
    }

    // Preparar dados de atualização
    const data: Partial<{
      name: string
      description: string | null
      phone: string
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
      // Mercado Pago
      mercadoPagoPublicKey?: string | null
      mercadoPagoAccessToken?: string | null
      mercadoPagoConfigured?: boolean
    }> = {}

    // Aplicar atualizações condicionalmente
    if (typeof updates.name === 'string') data.name = updates.name
    if (updates.description !== undefined) data.description = updates.description
    if (typeof updates.phone === 'string') data.phone = updates.phone
    if (typeof updates.address === 'string') data.address = updates.address
    if (updates.avatar !== undefined) data.avatar = updates.avatar
    if (updates.banner !== undefined) data.banner = updates.banner
    if (typeof updates.deliveryTime === 'number') data.deliveryTime = updates.deliveryTime
    if (typeof updates.deliveryFee === 'number') data.deliveryFee = updates.deliveryFee
    if (typeof updates.minimumOrder === 'number') data.minimumOrder = updates.minimumOrder
    if (typeof updates.acceptsDelivery === 'boolean') data.acceptsDelivery = updates.acceptsDelivery
    if (typeof updates.acceptsPickup === 'boolean') data.acceptsPickup = updates.acceptsPickup
    if (typeof updates.acceptsDineIn === 'boolean') data.acceptsDineIn = updates.acceptsDineIn

  // Mercado Pago
  if (updates.mercadoPagoPublicKey !== undefined) data.mercadoPagoPublicKey = updates.mercadoPagoPublicKey
  if (updates.mercadoPagoAccessToken !== undefined) data.mercadoPagoAccessToken = updates.mercadoPagoAccessToken
  if (typeof updates.mercadoPagoConfigured === 'boolean') data.mercadoPagoConfigured = updates.mercadoPagoConfigured

    // Tratamento especial para isOpen
    if (typeof updates.isOpen === 'boolean') data.isOpen = updates.isOpen

    // Tratamento especial para openingHours
    if (updates.openingHours) {
      const openingHours = typeof updates.openingHours === 'string' 
        ? updates.openingHours 
        : JSON.stringify(updates.openingHours)
      data.openingHours = openingHours
      
      // Atualiza isOpen automaticamente baseado nos horários se não foi explicitamente definido
      if (typeof updates.isOpen !== 'boolean') {
        const weekly = parseOpeningHours(openingHours)
        data.isOpen = computeIsOpenNow(weekly)
      }
    }

    // Atualização de slug (URL da loja)
    if (typeof updates.slug === 'string') {
      const proposed = slugify(updates.slug)
      if (!proposed) {
        return { success: false, error: 'Slug inválido' }
      }

      // Verifica unicidade: se já existe outro negócio com o mesmo slug
      const existing = await prisma.business.findFirst({ where: { slug: proposed } })
      if (existing && existing.id !== business.id) {
        return { success: false, error: 'Este endereço já está em uso' }
      }
      data.slug = proposed
    }

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
        ...(data.banner !== undefined ? { banner: data.banner } : {}),
        ...(data.isOpen !== undefined ? { isOpen: data.isOpen } : {}),
        ...(data.openingHours !== undefined ? { openingHours: data.openingHours } : {}),
        ...(data.deliveryTime !== undefined ? { deliveryTime: data.deliveryTime } : {}),
        ...(data.deliveryFee !== undefined ? { deliveryFee: data.deliveryFee } : {}),
        ...(data.minimumOrder !== undefined ? { minimumOrder: data.minimumOrder } : {}),
        ...(data.acceptsDelivery !== undefined ? { acceptsDelivery: data.acceptsDelivery } : {}),
        ...(data.acceptsPickup !== undefined ? { acceptsPickup: data.acceptsPickup } : {}),
        ...(data.acceptsDineIn !== undefined ? { acceptsDineIn: data.acceptsDineIn } : {}),
        ...(data.mercadoPagoPublicKey !== undefined ? { mercadoPagoPublicKey: data.mercadoPagoPublicKey } : {}),
        ...(data.mercadoPagoAccessToken !== undefined ? { mercadoPagoAccessToken: data.mercadoPagoAccessToken } : {}),
        ...(data.mercadoPagoConfigured !== undefined ? { mercadoPagoConfigured: data.mercadoPagoConfigured } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        phone: true,
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
        mercadoPagoPublicKey: true,
        mercadoPagoConfigured: true,
        mercadoPagoAccessToken: true,
      }
    })

    return { success: true, data: updated }
  } catch (error) {
    console.error('Erro ao atualizar negócio:', error)
    return { success: false, error: 'Erro interno do servidor' }
  }
}

/**
 * Obtém dados do negócio do usuário logado
 */
export async function getBusiness(): Promise<{ success: true; data: BusinessData } | { success: false; error: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    
    if (!session?.user) {
      return { success: false, error: 'Não autorizado' }
    }

    // SECURITY: Verificar se usuário tem role adequada para business
    const allowedRoles = ['businessOwner', 'businessAdmin', 'businessManager']
    if (!session.user.role || !allowedRoles.includes(session.user.role)) {
      return { success: false, error: 'Role não autorizada para operações de negócio' }
    }

    const business = await prisma.business.findFirst({
      where: { ownerId: session.user.id },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        phone: true,
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

    if (!business) {
      return { success: false, error: 'Negócio não encontrado' }
    }

    return { success: true, data: business }
  } catch (error) {
    console.error('Erro ao buscar negócio:', error)
    return { success: false, error: 'Erro interno do servidor' }
  }
}

/**
 * Atualiza apenas o status de aberto/fechado do negócio
 */
export async function updateBusinessStatus(
  isOpen: boolean
): Promise<{ success: true; data: BusinessData } | { success: false; error: string }> {
  return updateBusiness({ isOpen })
}