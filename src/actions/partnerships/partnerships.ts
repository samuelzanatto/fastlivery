'use server'

import { prisma } from '@/lib/database/prisma'

import {
  ActionResult,
  createSuccessResult,
  handleActionError,
  withCompany,
  CompanyContext
} from '@/lib/actions/auth-helpers'
import { 
  validateData,
  validateId 
} from '@/lib/actions/validation-helpers'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

export interface Partnership {
  id: string
  companyId: string
  supplierId: string
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED'
  startDate: Date | null
  endDate: Date | null
  renewalDate: Date | null
  contractTerms: Prisma.JsonValue
  paymentTerms: string | null
  discount: number
  minimumOrder: number | null
  isAutoRenewal: boolean
  notes: string | null
  createdAt: Date
  updatedAt: Date
  createdById: string
  company?: {
    id: string
    name: string
    type: string
  }
  supplier?: {
    id: string
    category: string
    company?: {
      name: string
    }
  }
}

export interface PartnershipFilters {
  status?: string
  search?: string
}

const PartnershipFiltersSchema = z.object({
  status: z.string().optional(),
  search: z.string().optional()
})

/**
 * Buscar parcerias da empresa
 */
async function _getPartnerships(
  { company }: CompanyContext,
  filters: PartnershipFilters = {}
): Promise<ActionResult<Partnership[]>> {
  try {
    // Validar filtros
    const validatedFilters = await validateData(PartnershipFiltersSchema, filters)
    
    // Construir where clause
    const where: Prisma.PartnershipWhereInput = {
      companyId: company.id
    }

    if (validatedFilters.status) {
      where.status = validatedFilters.status as 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED'
    }

    if (validatedFilters.search) {
      where.supplier = {
        company: {
          name: { 
            contains: validatedFilters.search, 
            mode: 'insensitive' 
          }
        }
      }
    }

    const partnerships = await prisma.partnership.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        supplier: {
          select: {
            id: true,
            category: true,
            company: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return createSuccessResult(partnerships as Partnership[])
  } catch (error) {
    return handleActionError(error)
  }
}

export const getPartnerships = withCompany(_getPartnerships)

/**
 * Buscar uma parceria específica
 */
async function _getPartnership(
  { company }: CompanyContext,
  partnershipId: string
): Promise<ActionResult<Partnership | null>> {
  try {
    await validateId(partnershipId)

    const partnership = await prisma.partnership.findFirst({
      where: {
        id: partnershipId,
        companyId: company.id
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        supplier: {
          select: {
            id: true,
            category: true,
            company: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    return createSuccessResult(partnership as Partnership | null)
  } catch (error) {
    return handleActionError(error)
  }
}

export const getPartnership = withCompany(_getPartnership)

/**
 * Calcular estatísticas das parcerias
 */
async function _getPartnershipStats(
  { company }: CompanyContext
): Promise<ActionResult<{
  total: number
  active: number
  pending: number
  suspended: number
}>> {
  try {
    const [total, active, pending, suspended] = await Promise.all([
      prisma.partnership.count({
        where: { companyId: company.id }
      }),
      prisma.partnership.count({
        where: { 
          companyId: company.id,
          status: 'ACTIVE'
        }
      }),
      prisma.partnership.count({
        where: { 
          companyId: company.id,
          status: 'PENDING'
        }
      }),
      prisma.partnership.count({
        where: { 
          companyId: company.id,
          status: 'SUSPENDED'
        }
      })
    ])

    return createSuccessResult({
      total,
      active,
      pending,
      suspended
    })
  } catch (error) {
    return handleActionError(error)
  }
}

export const getPartnershipStats = withCompany(_getPartnershipStats)