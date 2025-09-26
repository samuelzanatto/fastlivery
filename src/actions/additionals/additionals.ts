'use server'

import { prisma } from '@/lib/database/prisma'
import { revalidatePath } from 'next/cache'
import {
  ActionResult,
  createSuccessResult,
  handleActionError
} from '@/lib/actions/auth-helpers'
import { 
  validateData,
  validateId 
} from '@/lib/actions/validation-helpers'
import { z } from 'zod'
import type { BusinessAdditional, BusinessAdditionalItem } from '@prisma/client'

// Type for additional with items
export type Additional = BusinessAdditional & {
  items?: BusinessAdditionalItem[]
}

export type AdditionalItem = BusinessAdditionalItem

export interface AdditionalCreateInput {
  name: string
  description?: string
  price: number
  isRequired: boolean
  maxOptions: number
  items?: Array<{
    name: string
    price: number
  }>
}

export interface AdditionalUpdateInput {
  name?: string
  description?: string
  price?: number
  isRequired?: boolean
  maxOptions?: number
  items?: Array<{
    id?: string
    name: string
    price: number
  }>
}

const AdditionalSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  description: z.string().max(500, 'Descrição muito longa').optional(),
  price: z.number().min(0, 'Preço deve ser positivo'),
  isRequired: z.boolean(),
  maxOptions: z.number().min(1, 'Deve permitir pelo menos 1 opção'),
  items: z.array(z.object({
    name: z.string().min(1, 'Nome do item é obrigatório'),
    price: z.number().min(0, 'Preço deve ser positivo')
  })).optional()
})

const AdditionalUpdateSchema = AdditionalSchema.partial()

/**
 * Get all additionals for a business
 */
export async function getAdditionals(
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<ActionResult<{ additionals: Additional[], total: number, totalPages: number }>> {
  try {
    const { business } = await import('@/lib/actions/auth-helpers').then(m => m.getAuthenticatedUserBusiness())
    
    const skip = (page - 1) * limit
    
    const where = {
      businessId: business.id,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } }
        ]
      })
    }

    const [additionals, total] = await Promise.all([
      prisma.businessAdditional.findMany({
        where,
        skip,
        take: limit,
        include: {
          items: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.businessAdditional.count({ where })
    ])

    return createSuccessResult({
      additionals: additionals as Additional[],
      total,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Get a single additional by ID
 */
export async function getAdditional(
  id: string
): Promise<ActionResult<Additional>> {
  try {
    const { business } = await import('@/lib/actions/auth-helpers').then(m => m.getAuthenticatedUserBusiness())
    const validatedId = validateId(id)

    const additional = await prisma.businessAdditional.findFirst({
      where: {
        id: validatedId,
        businessId: business.id
      },
      include: {
        items: true
      }
    })

    if (!additional) {
      return {
        success: false,
        error: 'Adicional não encontrado'
      }
    }

    return createSuccessResult(additional as Additional)
  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Create a new additional
 */
export async function createAdditional(
  data: AdditionalCreateInput
): Promise<ActionResult<Additional>> {
  try {
    const { business } = await import('@/lib/actions/auth-helpers').then(m => m.getAuthenticatedUserBusiness())
    const validatedData = validateData(AdditionalSchema, data)

    const additional = await prisma.businessAdditional.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        price: validatedData.price,
        isRequired: validatedData.isRequired,
        maxOptions: validatedData.maxOptions,
        businessId: business.id,
        items: validatedData.items ? {
          create: validatedData.items
        } : undefined
      },
      include: {
        items: true
      }
    })

    revalidatePath('/additionals')
    return createSuccessResult(additional as Additional)
  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Update an existing additional
 */
export async function updateAdditional(
  id: string,
  data: AdditionalUpdateInput
): Promise<ActionResult<Additional>> {
  try {
    const { business } = await import('@/lib/actions/auth-helpers').then(m => m.getAuthenticatedUserBusiness())
    const validatedId = validateId(id)
    const validatedData = validateData(AdditionalUpdateSchema, data)

    // Check if additional exists and belongs to business
    const existingAdditional = await prisma.businessAdditional.findFirst({
      where: {
        id: validatedId,
        businessId: business.id
      }
    })

    if (!existingAdditional) {
      return {
        success: false,
        error: 'Adicional não encontrado'
      }
    }

    // Handle items update if provided
    let itemsUpdate = undefined
    if (validatedData.items) {
      itemsUpdate = {
        deleteMany: {}, // Remove all existing items
        create: validatedData.items.map(item => ({
          name: item.name,
          price: item.price
        }))
      }
    }

    const additional = await prisma.businessAdditional.update({
      where: { id: validatedId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.price !== undefined && { price: validatedData.price }),
        ...(validatedData.isRequired !== undefined && { isRequired: validatedData.isRequired }),
        ...(validatedData.maxOptions !== undefined && { maxOptions: validatedData.maxOptions }),
        ...(itemsUpdate && { items: itemsUpdate })
      },
      include: {
        items: true
      }
    })

    revalidatePath('/additionals')
    return createSuccessResult(additional as Additional)
  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Delete an additional
 */
export async function deleteAdditional(
  id: string
): Promise<ActionResult<boolean>> {
  try {
    const { business } = await import('@/lib/actions/auth-helpers').then(m => m.getAuthenticatedUserBusiness())
    const validatedId = validateId(id)

    // Check if additional exists and belongs to business
    const existingAdditional = await prisma.businessAdditional.findFirst({
      where: {
        id: validatedId,
        businessId: business.id
      },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    })

    if (!existingAdditional) {
      return {
        success: false,
        error: 'Adicional não encontrado'
      }
    }

    // Check if additional is being used by products
    if (existingAdditional._count.products > 0) {
      return {
        success: false,
        error: 'Não é possível excluir um adicional que está sendo usado por produtos'
      }
    }

    await prisma.businessAdditional.delete({
      where: { id: validatedId }
    })

    revalidatePath('/additionals')
    return createSuccessResult(true)
  } catch (error) {
    return handleActionError(error)
  }
}