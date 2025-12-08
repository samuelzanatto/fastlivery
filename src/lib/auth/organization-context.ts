/**
 * Sistema de Queries com Contexto Organizacional
 * 
 * Fornece funções que automaticamente filtram dados baseado na organização ativa
 * do usuário autenticado via Better Auth session.activeOrganizationId
 */

import { auth } from '@/lib/auth/auth'
import { headers as nextHeaders } from 'next/headers'
import { prisma } from '@/lib/database/prisma'
import type { PrismaClient } from '@prisma/client'

/**
 * Interface para opções de query com contexto organizacional
 */
export interface OrganizationQueryOptions {
  /** Headers customizados (opcional) */
  headers?: HeadersInit
  /** ID da organização específica (sobrescreve activeOrganizationId da sessão) */
  organizationId?: string
  /** Se deve incluir dados globais/sem organização (default: false) */
  includeGlobal?: boolean
}

/**
 * Resultado de query com contexto organizacional
 */
export interface OrganizationQueryResult<T> {
  /** Dados da query */
  data: T
  /** ID da organização usada no filtro */
  organizationId: string | null
  /** ID do usuário que fez a query */
  userId: string
}

/**
 * Classe utilitária para queries com contexto organizacional
 */
export class OrganizationContext {
  private prismaClient: typeof prisma

  constructor(prismaInstance?: typeof prisma) {
    this.prismaClient = prismaInstance || prisma
  }

  /**
   * Obter contexto organizacional da sessão atual
   */
  private async getOrganizationContext(options: OrganizationQueryOptions = {}) {
    const session = await auth.api.getSession({
      headers: new Headers(options.headers || await nextHeaders())
    })

    if (!session?.user) {
      throw new Error('Usuário não autenticado')
    }

    const organizationId = options.organizationId || session.session?.activeOrganizationId || null
    
    return {
      userId: session.user.id,
      organizationId,
      userRole: session.user.role
    }
  }

  /**
   * Buscar empresas do usuário autenticado (baseado em ownership)
   */
  async getBusinesses(options: OrganizationQueryOptions = {}) {
    const { userId, organizationId } = await this.getOrganizationContext(options)

    const businesses = await this.prismaClient.business.findMany({
      where: {
        ownerId: userId
      },
      include: {
        categories: {
          select: { id: true, name: true, isActive: true }
        },
        subscription: {
          select: { id: true, status: true, plan: true }
        }
      }
    })

    return {
      data: businesses,
      organizationId,
      userId
    }
  }

  /**
   * Buscar pedidos de empresas do usuário
   */
  async getOrders(options: OrganizationQueryOptions & {
    businessId?: string
    status?: string
    dateFrom?: Date
    dateTo?: Date
    limit?: number
  } = {}) {
    const { userId } = await this.getOrganizationContext(options)

    const whereClause: Record<string, unknown> = {
      business: {
        ownerId: userId
      }
    }

    // Filtros adicionais
    if (options.businessId) {
      whereClause.businessId = options.businessId
    }

    if (options.status) {
      whereClause.status = options.status
    }

    if (options.dateFrom || options.dateTo) {
      const createdAtFilter: Record<string, Date> = {}
      if (options.dateFrom) createdAtFilter.gte = options.dateFrom
      if (options.dateTo) createdAtFilter.lte = options.dateTo
      whereClause.createdAt = createdAtFilter
    }

    const orders = await this.prismaClient.order.findMany({
      where: whereClause,
      include: {
        business: {
          select: { id: true, name: true, slug: true }
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      ...(options.limit && { take: options.limit })
    })

    return {
      data: orders,
      organizationId: null,
      userId
    }
  }

  /**
   * Buscar produtos de empresas do usuário
   */
  async getProducts(options: OrganizationQueryOptions & {
    businessId?: string
    categoryId?: string
    isActive?: boolean
    searchTerm?: string
  } = {}) {
    const { userId } = await this.getOrganizationContext(options)

    const whereClause: Record<string, unknown> = {
      business: {
        ownerId: userId
      }
    }

    // Filtros adicionais
    if (options.businessId) {
      whereClause.businessId = options.businessId
    }

    if (options.categoryId) {
      whereClause.categoryId = options.categoryId  
    }

    if (typeof options.isActive === 'boolean') {
      whereClause.isActive = options.isActive
    }

    if (options.searchTerm) {
      whereClause.OR = [
        { name: { contains: options.searchTerm, mode: 'insensitive' } },
        { description: { contains: options.searchTerm, mode: 'insensitive' } }
      ]
    }

    const products = await this.prismaClient.product.findMany({
      where: whereClause,
      include: {
        category: {
          select: { id: true, name: true }
        },
        business: {
          select: { id: true, name: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    return {
      data: products,
      organizationId: null,
      userId
    }
  }

  /**
   * Buscar membros da organização (usando schema organizacional)
   */
  async getOrganizationMembers(options: OrganizationQueryOptions & {
    role?: string
    isActive?: boolean
  } = {}) {
    const { userId, organizationId } = await this.getOrganizationContext(options)

    if (!organizationId) {
      throw new Error('Contexto organizacional é obrigatório para buscar membros')
    }

    const whereClause: Record<string, unknown> = {
      organizationId
    }

    // Filtros adicionais
    if (options.role) {
      whereClause.role = options.role
    }

    if (typeof options.isActive === 'boolean') {
      whereClause.isActive = options.isActive
    }

    const members = await this.prismaClient.member.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return {
      data: members,
      organizationId,
      userId
    }
  }

  /**
   * Buscar analytics simplificados de pedidos
   */
  async getOrdersAnalytics(options: OrganizationQueryOptions & {
    businessId?: string
    dateFrom?: Date
    dateTo?: Date
  } = {}) {
    const { userId } = await this.getOrganizationContext(options)

    const baseWhere: Record<string, unknown> = {
      business: {
        ownerId: userId
      }
    }

    if (options.businessId) {
      baseWhere.businessId = options.businessId
    }

    if (options.dateFrom || options.dateTo) {
      const createdAtFilter: Record<string, Date> = {}
      if (options.dateFrom) createdAtFilter.gte = options.dateFrom
      if (options.dateTo) createdAtFilter.lte = options.dateTo
      baseWhere.createdAt = createdAtFilter
    }

    // Analytics básicos
    const [
      totalOrders,
      totalRevenue,
      averageOrderValue
    ] = await Promise.all([
      // Total de pedidos
      this.prismaClient.order.count({ where: baseWhere }),
      
      // Revenue total
      this.prismaClient.order.aggregate({
        where: baseWhere,
        _sum: { total: true }
      }),
      
      // Valor médio do pedido
      this.prismaClient.order.aggregate({
        where: baseWhere,
        _avg: { total: true }
      })
    ])

    const analytics = {
      summary: {
        totalOrders,
        totalRevenue: totalRevenue._sum.total || 0,
        averageOrderValue: averageOrderValue._avg.total || 0
      }
    }

    return {
      data: analytics,
      organizationId: null,
      userId
    }
  }

  /**
   * Executar query customizada com contexto organizacional automático
   */
  async executeWithContext<T>(
    queryFn: (prismaInstance: typeof prisma, context: { organizationId: string | null, userId: string }) => Promise<T>,
    options: OrganizationQueryOptions = {}
  ): Promise<OrganizationQueryResult<T>> {
    const { userId, organizationId } = await this.getOrganizationContext(options)

    const data = await queryFn(this.prismaClient, { organizationId, userId })

    return {
      data,
      organizationId,
      userId
    }
  }
}

/**
 * Instância global para uso em toda aplicação
 */
export const organizationContext = new OrganizationContext()

/**
 * Hook helper functions para uso direto
 */

/**
 * Buscar dados com contexto organizacional automático
 */
export async function withOrganizationContext<T>(
  queryFn: (prismaInstance: typeof prisma, context: { organizationId: string | null, userId: string }) => Promise<T>,
  options: OrganizationQueryOptions = {}
): Promise<OrganizationQueryResult<T>> {
  return organizationContext.executeWithContext(queryFn, options)
}

/**
 * Obter ID da organização ativa da sessão
 */
export async function getActiveOrganizationId(headers?: HeadersInit): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: new Headers(headers || await nextHeaders())
  })

  return session?.session?.activeOrganizationId || null
}

/**
 * Verificar se usuário tem acesso à organização
 */
export async function hasOrganizationAccess(
  organizationId: string,
  headers?: HeadersInit
): Promise<boolean> {
  const session = await auth.api.getSession({
    headers: new Headers(headers || await nextHeaders())
  })

  if (!session?.user) return false

  // Verificar se é a organização ativa
  if (session.session?.activeOrganizationId === organizationId) {
    return true
  }

  // Verificar se é membro da organização via Prisma compartilhado
  const member = await prisma.member.findFirst({
    where: {
      organizationId,
      userId: session.user.id,
      isActive: true
    }
  })
  return !!member
}
