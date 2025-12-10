// Authentication helpers para Server Actions
// Não é um arquivo de Server Actions - contém utilities

import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Types
 */
export interface AuthenticatedUser {
  id: string
  email: string
  name: string
}

export interface UserBusiness {
  id: string
  name: string
  slug: string | null
  avatar: string | null
  isOpen: boolean
  openingHours: string | null
  deliveryFee: number
  minimumOrder: number
  acceptsDelivery: boolean
  acceptsPickup: boolean
  acceptsDineIn: boolean
}

export interface BusinessContext {
  user: AuthenticatedUser
  business: UserBusiness
  isEmployee?: boolean
  employeeRole?: {
    id: string
    name: string
    permissions: Array<{
      id: string
      resource: string
      action: string
    }>
  } | null
}

/**
 * Error types para Server Actions
 */
export class AuthError extends Error {
  constructor(message: string = 'Não autorizado') {
    super(message)
    this.name = 'AuthError'
  }
}

export class BusinessNotFoundError extends Error {
  constructor(message: string = 'Negócio não encontrado') {
    super(message)
    this.name = 'BusinessNotFoundError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Helper para obter sessão autenticada
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const headersList = await headers()
  const sessionResponse = await auth.api.getSession({
    headers: headersList
  })
  
  if (!sessionResponse?.user) {
    throw new AuthError()
  }
  
  return sessionResponse.user as AuthenticatedUser
}

/**
 * Helper para obter negócio do usuário autenticado
 * Suporta tanto donos quanto funcionários
 */
export async function getAuthenticatedUserBusiness(): Promise<BusinessContext> {
  const user = await getAuthenticatedUser()

  // Primeiro, tentar encontrar como dono do negócio
  let business = await prisma.business.findFirst({
    where: { ownerId: user.id },
    select: { 
      id: true,
      name: true,
      slug: true,
      avatar: true,
      isOpen: true,
      openingHours: true,
      deliveryFee: true,
      minimumOrder: true,
      acceptsDelivery: true,
      acceptsPickup: true,
      acceptsDineIn: true
    }
  })

  let isEmployee = false
  let employeeRole = null

  // Se não é dono, verificar se é funcionário
  if (!business) {
    const employeeProfile = await prisma.employeeProfile.findFirst({
      where: {
        userId: user.id,
        isActive: true
      },
      include: {
        business: {
          select: { 
            id: true,
            name: true,
            slug: true,
            avatar: true,
            isOpen: true,
            openingHours: true,
            deliveryFee: true,
            minimumOrder: true,
            acceptsDelivery: true,
            acceptsPickup: true,
            acceptsDineIn: true
          }
        },
        role: {
          include: {
            permissions: {
              select: {
                id: true,
                resource: true,
                action: true
              }
            }
          }
        }
      }
    })

    if (employeeProfile) {
      business = employeeProfile.business
      isEmployee = true
      employeeRole = employeeProfile.role
    }
  }

  if (!business) {
    throw new BusinessNotFoundError()
  }

  return { user, business, isEmployee, employeeRole }
}

/**
 * Type-safe result type para Server Actions
 */
export type ActionResult<T = unknown> = 
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

/**
 * Helper para criar response de sucesso
 */
export function createSuccessResult<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

/**
 * Helper para criar response de erro
 */
export function createErrorResult(error: string, code?: string): ActionResult<never> {
  return { success: false, error, code }
}

/**
 * Helper para tratar erros em Server Actions
 */
export function handleActionError(error: unknown): ActionResult<never> {
  console.error('Server Action Error:', error)
  
  if (error instanceof AuthError) {
    return createErrorResult(error.message, 'AUTH_ERROR')
  }

  if (error instanceof BusinessNotFoundError) {
    return createErrorResult(error.message, 'BUSINESS_NOT_FOUND')
  }
  
  if (error instanceof ValidationError) {
    return createErrorResult(error.message, 'VALIDATION_ERROR')
  }
  
  // Erro genérico
  return createErrorResult('Erro interno do servidor', 'INTERNAL_ERROR')
}

/**
 * Decorator para Server Actions que precisam de autenticação
 */
export function withAuth<T extends unknown[], R>(
  action: (...args: T) => Promise<ActionResult<R>>
) {
  return async (...args: T): Promise<ActionResult<R>> => {
    try {
      await getAuthenticatedUser()
      return await action(...args)
    } catch (error) {
      return handleActionError(error) as ActionResult<R>
    }
  }
}

/**
 * Decorator para Server Actions que precisam de negócio
 */
export function withBusiness<T extends unknown[], R>(
  action: (businessData: BusinessContext, ...args: T) => Promise<ActionResult<R>>
) {
  return async (...args: T): Promise<ActionResult<R>> => {
    try {
      const businessData = await getAuthenticatedUserBusiness()
      return await action(businessData, ...args)
    } catch (error) {
      return handleActionError(error) as ActionResult<R>
    }
  }
}

/**
 * Helper para buscar negócio do usuário (dono ou funcionário)
 * Útil para APIs e rotas que precisam verificar acesso
 */
export async function findBusinessForUser(userId: string, options?: {
  requiredPermission?: { resource: string; action: string }
}): Promise<{
  business: UserBusiness & { id: string }
  isEmployee: boolean
  employeeRole?: {
    id: string
    name: string
    permissions: Array<{ resource: string; action: string }>
  } | null
} | null> {
  // Primeiro, tentar encontrar como dono
  const ownedBusiness = await prisma.business.findFirst({
    where: { ownerId: userId },
    select: { 
      id: true,
      name: true,
      slug: true,
      avatar: true,
      isOpen: true,
      openingHours: true,
      deliveryFee: true,
      minimumOrder: true,
      acceptsDelivery: true,
      acceptsPickup: true,
      acceptsDineIn: true
    }
  })

  if (ownedBusiness) {
    return {
      business: ownedBusiness,
      isEmployee: false,
      employeeRole: null
    }
  }

  // Se não é dono, verificar se é funcionário
  const employeeProfile = await prisma.employeeProfile.findFirst({
    where: {
      userId: userId,
      isActive: true
    },
    include: {
      business: {
        select: { 
          id: true,
          name: true,
          slug: true,
          avatar: true,
          isOpen: true,
          openingHours: true,
          deliveryFee: true,
          minimumOrder: true,
          acceptsDelivery: true,
          acceptsPickup: true,
          acceptsDineIn: true
        }
      },
      role: {
        include: {
          permissions: {
            select: {
              resource: true,
              action: true
            }
          }
        }
      }
    }
  })

  if (!employeeProfile) {
    return null
  }

  // Se requer permissão específica, verificar
  if (options?.requiredPermission) {
    const { resource, action } = options.requiredPermission
    const hasPermission = employeeProfile.role.permissions.some(
      p => (p.resource === resource || p.resource === '*') && 
           (p.action === action || p.action === 'manage' || p.action === '*')
    )
    if (!hasPermission) {
      return null
    }
  }

  return {
    business: employeeProfile.business,
    isEmployee: true,
    employeeRole: {
      id: employeeProfile.role.id,
      name: employeeProfile.role.name,
      permissions: employeeProfile.role.permissions
    }
  }
}

/**
 * Redirect helper para Server Actions
 */
export function redirectTo(path: string): never {
  redirect(path)
}