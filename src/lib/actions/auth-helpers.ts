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
 */
export async function getAuthenticatedUserBusiness(): Promise<BusinessContext> {
  const user = await getAuthenticatedUser()

  const business = await prisma.business.findFirst({
    where: { ownerId: user.id },
    select: { 
      id: true,
      name: true,
      slug: true,
      isOpen: true,
      openingHours: true,
      deliveryFee: true,
      minimumOrder: true,
      acceptsDelivery: true,
      acceptsPickup: true,
      acceptsDineIn: true
    }
  })

  if (!business) {
    throw new BusinessNotFoundError()
  }

  return { user, business }
}

export interface UserCompany {
  id: string
  name: string
  slug: string | null
  isActive: boolean
  type: string
}

export interface CompanyContext {
  user: AuthenticatedUser
  company: UserCompany
}

/**
 * Helper para obter empresa/fornecedor do usuário autenticado
 */
export async function getAuthenticatedUserCompany(): Promise<CompanyContext> {
  const user = await getAuthenticatedUser()

  const company = await prisma.company.findFirst({
    where: { ownerId: user.id },
    select: { 
      id: true,
      name: true,
      slug: true,
      isActive: true,
      type: true
    }
  })

  if (!company) {
    throw new BusinessNotFoundError('Empresa não encontrada')
  }

  return { user, company }
}

/**
 * Helper para obter dados baseado no tipo de usuário (Business ou Company)
 */
export async function getAuthenticatedUserContext(): Promise<BusinessContext | CompanyContext> {
  const user = await getAuthenticatedUser()

  // Tentar buscar Business primeiro (para empresas de delivery tradicionais)
  const business = await prisma.business.findFirst({
    where: { ownerId: user.id },
    select: { 
      id: true,
      name: true,
      slug: true,
      isOpen: true,
      openingHours: true,
      deliveryFee: true,
      minimumOrder: true,
      acceptsDelivery: true,
      acceptsPickup: true,
      acceptsDineIn: true
    }
  })

  if (business) {
    return { user, business }
  }

  // Se não encontrar Business, buscar Company (para fornecedores)
  const company = await prisma.company.findFirst({
    where: { ownerId: user.id },
    select: { 
      id: true,
      name: true,
      slug: true,
      isActive: true,
      type: true
    }
  })

  if (company) {
    return { user, company }
  }

  throw new BusinessNotFoundError('Negócio ou empresa não encontrada')
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
 * Redirect helper para Server Actions
 */
export function redirectTo(path: string): never {
  redirect(path)
}