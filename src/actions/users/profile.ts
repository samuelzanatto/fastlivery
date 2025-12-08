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

export interface UserProfile {
  id: string
  name: string | null
  email: string
  phone: string | null
  role: string | null
  emailVerified: boolean
  isActive: boolean
  image: string | null
}

export interface UserWithBusiness extends UserProfile {
  business: {
    id: string
    slug: string | null
    name: string
    isActive: boolean
    isOpen: boolean
    description: string | null
    phone: string
    email: string
    address: string
    avatar: string | null
    banner: string | null
    openingHours: string | null
    deliveryFee: number
    minimumOrder: number
    deliveryTime: number
    acceptsDelivery: boolean
    acceptsPickup: boolean
    acceptsDineIn: boolean
    ownerId: string | null
    subscription: {
      id: string
      planId: string
      status: string
      currentPeriodEnd: Date | null
    } | null
  } | null
}

export interface ProfileUpdateInput {
  name?: string
  email?: string
  phone?: string
  password?: string
  emailVerified?: boolean
  image?: string
}

/**
 * Obter dados do usuário atual com negócio (se aplicável)
 */
async function _getUserProfile(): Promise<ActionResult<UserWithBusiness>> {
  try {
    const user = await getAuthenticatedUser()

    // Buscar dados completos do usuário
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        emailVerified: true,
        isActive: true,
        image: true,
        ownedBusinesses: {
          select: {
            id: true,
            slug: true,
            name: true,
            isActive: true,
            isOpen: true,
            description: true,
            phone: true,
            email: true,
            address: true,
            avatar: true,
            banner: true,
            openingHours: true,
            deliveryFee: true,
            minimumOrder: true,
            deliveryTime: true,
            acceptsDelivery: true,
            acceptsPickup: true,
            acceptsDineIn: true,
            ownerId: true,
            subscription: {
              select: {
                id: true,
                planId: true,
                status: true,
                currentPeriodEnd: true,
              },
            },
          },
        },
      },
    })

    if (!fullUser) {
      return {
        success: false,
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      }
    }

    // Se for cliente simples, retorna apenas dados básicos
    if (fullUser.role === 'customer') {
      return createSuccessResult({
        id: fullUser.id,
        name: fullUser.name,
        email: fullUser.email,
        phone: fullUser.phone,
        role: fullUser.role,
        emailVerified: fullUser.emailVerified,
        isActive: fullUser.isActive,
        image: fullUser.image,
        business: null
      })
    }

    // Apenas roles de empresa ou plataforma podem ter negócios associados
    const allowedRoles = new Set([
      'businessOwner', 'businessManager', 'businessChef', 
      'businessWaiter', 'businessCashier', 'businessEmployee',
      'platformAdmin', 'platformSupport'
    ])
    
    if (!fullUser.role || !allowedRoles.has(fullUser.role)) {
      return {
        success: false,
        error: 'Role não autorizada para recurso negócio',
        code: 'UNAUTHORIZED_ROLE'
      }
    }

    // Se o usuário tem negócios, retornar o primeiro
    const business = fullUser.ownedBusinesses[0] || null

    return createSuccessResult({
      id: fullUser.id,
      name: fullUser.name,
      email: fullUser.email,
      phone: fullUser.phone,
      role: fullUser.role,
      emailVerified: fullUser.emailVerified,
      isActive: fullUser.isActive,
      image: fullUser.image,
      business
    })
  } catch (error) {
    return handleActionError(error)
  }
}

export const getUserProfile = withAuth(_getUserProfile)

/**
 * Atualizar perfil do usuário
 */
async function _updateUserProfile(
  input: ProfileUpdateInput
): Promise<ActionResult<UserProfile>> {
  try {
    const user = await getAuthenticatedUser()

    const updateData: {
      name?: string
      email?: string
      phone?: string
      emailVerified?: boolean
      image?: string
    } = {}
    
    if (input.name !== undefined) updateData.name = input.name
    if (input.email !== undefined) updateData.email = input.email
    if (input.phone !== undefined) updateData.phone = input.phone
    if (input.emailVerified !== undefined) updateData.emailVerified = input.emailVerified
    if (input.image !== undefined) updateData.image = input.image

    // Para senha, será necessário usar BetterAuth API se implementado
    // Por enquanto, focamos nos outros campos
    if (input.password) {
      // TODO: Implementar mudança de senha via BetterAuth
      console.warn('Mudança de senha via perfil não implementada ainda')
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        emailVerified: true,
        isActive: true,
        image: true
      }
    })

    revalidatePath('/profile')
    revalidatePath('/dashboard')

    return createSuccessResult(updatedUser)
  } catch (error) {
    return handleActionError(error)
  }
}

export const updateUserProfile = withAuth(_updateUserProfile)

/**
 * Obter dados básicos do usuário atual (apenas info do usuário)
 */
async function _getCurrentUser(): Promise<ActionResult<UserProfile>> {
  try {
    const user = await getAuthenticatedUser()

    // Buscar dados completos do usuário
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        emailVerified: true,
        isActive: true,
        image: true
      }
    })

    if (!fullUser) {
      return {
        success: false,
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      }
    }

    return createSuccessResult({
      id: fullUser.id,
      name: fullUser.name,
      email: fullUser.email,
      phone: fullUser.phone,
      role: fullUser.role,
      emailVerified: fullUser.emailVerified,
      isActive: fullUser.isActive,
      image: fullUser.image
    })
  } catch (error) {
    return handleActionError(error)
  }
}

export const getCurrentUser = withAuth(_getCurrentUser)