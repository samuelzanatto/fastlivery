'use server'

import { prisma } from '@/lib/database/prisma'
import { revalidatePath } from 'next/cache'
import {
  ActionResult,
  createSuccessResult,
  handleActionError,
  withAuth,
  getAuthenticatedUser
} from '@/lib/actions/auth-helpers'
import { 
  validateId 
} from '@/lib/actions/validation-helpers'

export interface Business {
  id: string
  email: string
  name: string
  description: string | null
  phone: string
  address: string
  avatar: string | null
  banner: string | null
  isOpen: boolean
  openingHours: string | null
  deliveryFee: number
  minimumOrder: number
  deliveryTime: number
  acceptsDelivery: boolean
  acceptsPickup: boolean
  acceptsDineIn: boolean
  isActive: boolean
  subscriptionExpiresAt: Date | null
  createdAt: Date
  updatedAt: Date
  ownerId: string | null
  slug: string | null
  mercadoPagoAccessToken: string | null
  mercadoPagoConfigured: boolean
  mercadoPagoPublicKey: string | null
}

export interface BusinessWithRelations extends Business {
  subscription?: unknown
  categories: unknown[]
  products: unknown[]
  orders: unknown[]
}

export interface BusinessUpdateInput {
  name?: string
  description?: string
  phone?: string
  address?: string
  avatar?: string
  banner?: string
  isOpen?: boolean
  openingHours?: string
  deliveryFee?: number
  minimumOrder?: number
  deliveryTime?: number
  acceptsDelivery?: boolean
  acceptsPickup?: boolean
  acceptsDineIn?: boolean
  mercadoPagoAccessToken?: string
  mercadoPagoPublicKey?: string
  mercadoPagoConfigured?: boolean
}

/**
 * Buscar dados do negócio do usuário autenticado
 */
async function _getMyBusiness(): Promise<ActionResult<BusinessWithRelations>> {
  try {
    const user = await getAuthenticatedUser()

    const business = await prisma.business.findFirst({
      where: {
        ownerId: user.id
      },
      include: {
        subscription: true,
        categories: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        },
        products: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!business) {
      return {
        success: false,
        error: 'Negócio não encontrado',
        code: 'BUSINESS_NOT_FOUND'
      }
    }

    // Remover dados sensíveis
    const { password: _password, ...businessData } = business

    return createSuccessResult(businessData as BusinessWithRelations)
  } catch (error) {
    return handleActionError(error)
  }
}

export const getMyBusiness = withAuth(_getMyBusiness)

/**
 * Atualizar dados do negócio
 */
async function _updateMyBusiness(
  input: BusinessUpdateInput
): Promise<ActionResult<Business>> {
  try {
    const user = await getAuthenticatedUser()

    // Verificar se o negócio pertence ao usuário
    const business = await prisma.business.findFirst({
      where: {
        ownerId: user.id
      }
    })

    if (!business) {
      return {
        success: false,
        error: 'Negócio não encontrado',
        code: 'BUSINESS_NOT_FOUND'
      }
    }

    // Validar dados se fornecidos
    const updateData: Partial<BusinessUpdateInput> = {}
    
    if (input.name !== undefined) updateData.name = input.name
    if (input.description !== undefined) updateData.description = input.description
    if (input.phone !== undefined) updateData.phone = input.phone
    if (input.address !== undefined) updateData.address = input.address
    if (input.avatar !== undefined) updateData.avatar = input.avatar
    if (input.banner !== undefined) updateData.banner = input.banner
    if (input.isOpen !== undefined) updateData.isOpen = input.isOpen
    if (input.openingHours !== undefined) updateData.openingHours = input.openingHours
    if (input.deliveryFee !== undefined) updateData.deliveryFee = input.deliveryFee
    if (input.minimumOrder !== undefined) updateData.minimumOrder = input.minimumOrder
    if (input.deliveryTime !== undefined) updateData.deliveryTime = input.deliveryTime
    if (input.acceptsDelivery !== undefined) updateData.acceptsDelivery = input.acceptsDelivery
    if (input.acceptsPickup !== undefined) updateData.acceptsPickup = input.acceptsPickup
    if (input.acceptsDineIn !== undefined) updateData.acceptsDineIn = input.acceptsDineIn
    if (input.mercadoPagoAccessToken !== undefined) updateData.mercadoPagoAccessToken = input.mercadoPagoAccessToken
    if (input.mercadoPagoPublicKey !== undefined) updateData.mercadoPagoPublicKey = input.mercadoPagoPublicKey
    if (input.mercadoPagoConfigured !== undefined) updateData.mercadoPagoConfigured = input.mercadoPagoConfigured

    // Atualizar negócio
    const updatedBusiness = await prisma.business.update({
      where: { id: business.id },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    })

    // Remover dados sensíveis
    const { password: _password, ...businessData } = updatedBusiness

    revalidatePath('/dashboard/settings')
    revalidatePath('/dashboard')

    return createSuccessResult(businessData as Business)
  } catch (error) {
    return handleActionError(error)
  }
}

export const updateMyBusiness = withAuth(_updateMyBusiness)

/**
 * Alternar status de abertura do negócio
 */
async function _toggleBusinessStatus(): Promise<ActionResult<{ isOpen: boolean }>> {
  try {
    const user = await getAuthenticatedUser()

    const business = await prisma.business.findFirst({
      where: {
        ownerId: user.id
      },
      select: { id: true, isOpen: true }
    })

    if (!business) {
      return {
        success: false,
        error: 'Negócio não encontrado',
        code: 'BUSINESS_NOT_FOUND'
      }
    }

    const updatedBusiness = await prisma.business.update({
      where: { id: business.id },
      data: { isOpen: !business.isOpen },
      select: { isOpen: true }
    })

    revalidatePath('/dashboard')

    return createSuccessResult({ isOpen: updatedBusiness.isOpen })
  } catch (error) {
    return handleActionError(error)
  }
}

export const toggleBusinessStatus = withAuth(_toggleBusinessStatus)

/**
 * Buscar negócio público por slug
 */
export async function getBusinessBySlug(slug: string): Promise<ActionResult<unknown>> {
  try {
    const validatedSlug = validateId(slug, 'Slug do negócio')

    const business = await prisma.business.findFirst({
      where: {
        slug: validatedSlug,
        isActive: true
      },
      include: {
        categories: {
          where: { isActive: true },
          include: {
            products: {
              where: { isAvailable: true },
              orderBy: { name: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!business) {
      return {
        success: false,
        error: 'Negócio não encontrado',
        code: 'BUSINESS_NOT_FOUND'
      }
    }

    // Remover dados sensíveis
    const { 
      password: _password, 
      mercadoPagoAccessToken: _accessToken,
      email: _email,
      ...publicBusinessData
    } = business

    return createSuccessResult(publicBusinessData)
  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Verificar status do negócio por slug
 */
export async function getBusinessStatus(slug: string): Promise<ActionResult<{
  isOpen: boolean
  isActive: boolean
  name: string
}>> {
  try {
    const validatedSlug = validateId(slug, 'Slug do negócio')

    const business = await prisma.business.findFirst({
      where: {
        slug: validatedSlug
      },
      select: {
        isOpen: true,
        isActive: true,
        name: true
      }
    })

    if (!business) {
      return {
        success: false,
        error: 'Negócio não encontrado',
        code: 'BUSINESS_NOT_FOUND'
      }
    }

    return createSuccessResult(business)
  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Atualizar configuração do MercadoPago
 */
async function _updateMercadoPagoConfig(input: {
  accessToken: string
  publicKey: string
}): Promise<ActionResult<{ configured: boolean }>> {
  try {
    const user = await getAuthenticatedUser()

    const business = await prisma.business.findFirst({
      where: {
        ownerId: user.id
      }
    })

    if (!business) {
      return {
        success: false,
        error: 'Negócio não encontrado',
        code: 'BUSINESS_NOT_FOUND'
      }
    }

    await prisma.business.update({
      where: { id: business.id },
      data: {
        mercadoPagoAccessToken: input.accessToken,
        mercadoPagoPublicKey: input.publicKey,
        mercadoPagoConfigured: true
      }
    })

    revalidatePath('/dashboard/settings')

    return createSuccessResult({ configured: true })
  } catch (error) {
    return handleActionError(error)
  }
}

export const updateMercadoPagoConfig = withAuth(_updateMercadoPagoConfig)

/**
 * Obter configurações do MercadoPago
 */
async function _getMercadoPagoConfig(): Promise<ActionResult<{
  configured: boolean
  publicKey: string | null
  businessName: string
  isTestMode: boolean
}>> {
  try {
    const user = await getAuthenticatedUser()

    const business = await prisma.business.findFirst({
      where: { ownerId: user.id },
      select: {
        id: true,
        name: true,
        mercadoPagoConfigured: true,
        mercadoPagoPublicKey: true,
        mercadoPagoAccessToken: true,
      }
    })

    if (!business) {
      return {
        success: false,
        error: 'Negócio não encontrado',
        code: 'BUSINESS_NOT_FOUND'
      }
    }

    const isTestMode = business.mercadoPagoAccessToken?.startsWith('TEST-') || false

    return createSuccessResult({
      configured: business.mercadoPagoConfigured,
      publicKey: business.mercadoPagoPublicKey ? '****' + business.mercadoPagoPublicKey.slice(-4) : null,
      businessName: business.name,
      isTestMode
    })
  } catch (error) {
    return handleActionError(error)
  }
}

export const getMercadoPagoConfig = withAuth(_getMercadoPagoConfig)

/**
 * Remover configuração do MercadoPago
 */
async function _removeMercadoPagoConfig(): Promise<ActionResult<{ configured: boolean }>> {
  try {
    const user = await getAuthenticatedUser()

    const business = await prisma.business.findFirst({
      where: {
        ownerId: user.id
      }
    })

    if (!business) {
      return {
        success: false,
        error: 'Negócio não encontrado',
        code: 'BUSINESS_NOT_FOUND'
      }
    }

    await prisma.business.update({
      where: { id: business.id },
      data: {
        mercadoPagoAccessToken: null,
        mercadoPagoPublicKey: null,
        mercadoPagoConfigured: false
      }
    })

    revalidatePath('/dashboard/settings')

    return createSuccessResult({ configured: false })
  } catch (error) {
    return handleActionError(error)
  }
}

export const removeMercadoPagoConfig = withAuth(_removeMercadoPagoConfig)

/**
 * Criar novo negócio
 */
async function _createBusiness(data: {
  name: string
  description?: string
  phone: string
  address: string
  email: string
}): Promise<ActionResult<Business>> {
  try {
    const user = await getAuthenticatedUser()

    // Verificar se o usuário já tem um negócio
    const existingBusiness = await prisma.business.findFirst({
      where: { ownerId: user.id }
    })

    if (existingBusiness) {
      return {
        success: false,
        error: 'Usuário já possui um negócio',
        code: 'BUSINESS_EXISTS'
      }
    }

    // Gerar slug único baseado no nome
    const baseSlug = data.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    let slug = baseSlug
    let counter = 1
    
    // Verificar se slug já existe
    while (await prisma.business.findFirst({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    const business = await prisma.business.create({
      data: {
        name: data.name,
        description: data.description,
        phone: data.phone,
        address: data.address,
        email: data.email,
        slug,
        ownerId: user.id,
        password: 'temp', // Campo requerido mas não usado
        deliveryFee: 5.00, // Valor padrão
        minimumOrder: 20.00, // Valor padrão
        deliveryTime: 45, // Valor padrão em minutos
        isOpen: false, // Fechado por padrão
        acceptsDelivery: true,
        acceptsPickup: true,
        acceptsDineIn: false
      }
    })

    revalidatePath('/dashboard')
    revalidatePath('/settings')

    return createSuccessResult(business as Business)
  } catch (error) {
    return handleActionError(error)
  }
}

export const createBusiness = withAuth(_createBusiness)