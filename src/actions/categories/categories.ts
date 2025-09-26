'use server'

import { prisma } from '@/lib/database/prisma'
import { revalidatePath } from 'next/cache'
import {
  ActionResult,
  createSuccessResult,
  handleActionError,
  withBusiness,
  BusinessContext
} from '@/lib/actions/auth-helpers'
import { 
  CategorySchema,
  validateData,
  validateId 
} from '@/lib/actions/validation-helpers'

export interface Category {
  id: string
  name: string
  description: string | null
  order: number
  isActive: boolean
  businessId: string
  createdAt: Date
  updatedAt: Date
  _count?: {
    products: number
  }
}

export interface CategoryCreateInput {
  name: string
  description?: string
  order?: number
  isActive?: boolean
}

export interface CategoryUpdateInput {
  name?: string
  description?: string
  order?: number
  isActive?: boolean
}

/**
 * Buscar todas as categorias da empresa
 */
async function _getCategories(
  { business }: BusinessContext,
  includeProductCount: boolean = false
): Promise<ActionResult<Category[]>> {
  try {
    const categories = await prisma.category.findMany({
      where: {
        businessId: business.id
      },
      include: includeProductCount ? {
        _count: {
          select: {
            products: true
          }
        }
      } : undefined,
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ]
    })

    return createSuccessResult(categories as Category[])
  } catch (error) {
    return handleActionError(error)
  }
}

export const getCategories = withBusiness(_getCategories)

/**
 * Buscar categoria por ID
 */
async function _getCategory(
  { business }: BusinessContext,
  categoryId: string
): Promise<ActionResult<Category>> {
  try {
    const validatedId = validateId(categoryId, 'ID da categoria')

    const category = await prisma.category.findFirst({
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

    if (!category) {
      return {
        success: false,
        error: 'Categoria não encontrada',
        code: 'CATEGORY_NOT_FOUND'
      }
    }

    return createSuccessResult(category as Category)
  } catch (error) {
    return handleActionError(error)
  }
}

export const getCategory = withBusiness(_getCategory)

/**
 * Criar nova categoria
 */
async function _createCategory(
  { business }: BusinessContext,
  input: CategoryCreateInput
): Promise<ActionResult<Category>> {
  try {
    const validatedData = validateData(CategorySchema, input)

    // Se não foi fornecida uma ordem, usar a próxima disponível
    if (validatedData.order === undefined) {
      const lastCategory = await prisma.category.findFirst({
        where: { businessId: business.id },
        orderBy: { order: 'desc' },
        select: { order: true }
      })
      
      validatedData.order = (lastCategory?.order || 0) + 1
    }

    const category = await prisma.category.create({
      data: {
        ...validatedData,
        businessId: business.id
      }
    })

    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/categories')
    revalidatePath('/dashboard')
    
    return createSuccessResult(category as Category)
  } catch (error) {
    return handleActionError(error)
  }
}

export const createCategory = withBusiness(_createCategory)

/**
 * Atualizar categoria
 */
async function _updateCategory(
  { business }: BusinessContext,
  categoryId: string,
  input: CategoryUpdateInput
): Promise<ActionResult<Category>> {
  try {
    const validatedId = validateId(categoryId, 'ID da categoria')
    
    // Validar dados apenas se foram fornecidos
    const updateData: {
      name?: string
      description?: string | null
      order?: number
      isActive?: boolean
    } = {}
    
    if (input.name !== undefined) {
      updateData.name = validateData(CategorySchema.pick({ name: true }), { name: input.name }).name
    }
    
    if (input.description !== undefined) {
      updateData.description = input.description
    }
    
    if (input.order !== undefined) {
      updateData.order = input.order
    }
    
    if (input.isActive !== undefined) {
      updateData.isActive = input.isActive
    }

    const category = await prisma.category.update({
      where: {
        id: validatedId,
        businessId: business.id
      },
      data: updateData
    })

    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/categories')
    revalidatePath('/dashboard')
    
    return createSuccessResult(category as Category)
  } catch (error) {
    return handleActionError(error)
  }
}

export const updateCategory = withBusiness(_updateCategory)

/**
 * Excluir categoria
 */
async function _deleteCategory(
  { business }: BusinessContext,
  categoryId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const validatedId = validateId(categoryId, 'ID da categoria')

    // Verificar se a categoria existe e pertence ao negócio
    const category = await prisma.category.findFirst({
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

    if (!category) {
      return {
        success: false,
        error: 'Categoria não encontrada',
        code: 'CATEGORY_NOT_FOUND'
      }
    }

    // Verificar se a categoria tem produtos
    if (category._count.products > 0) {
      return {
        success: false,
        error: 'Não é possível excluir categoria com produtos associados',
        code: 'CATEGORY_HAS_PRODUCTS'
      }
    }

    await prisma.category.delete({
      where: {
        id: validatedId
      }
    })

    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/categories')
    revalidatePath('/dashboard')
    
    return createSuccessResult({ id: validatedId })
  } catch (error) {
    return handleActionError(error)
  }
}

export const deleteCategory = withBusiness(_deleteCategory)

/**
 * Reordenar categorias
 */
async function _reorderCategories(
  { business }: BusinessContext,
  categoryOrders: Array<{ id: string; order: number }>
): Promise<ActionResult<Category[]>> {
  try {
    // Validar que todas as categorias pertencem ao negócio
    const categoryIds = categoryOrders.map(item => item.id)
    const categories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        businessId: business.id
      }
    })

    if (categories.length !== categoryIds.length) {
      return {
        success: false,
        error: 'Uma ou mais categorias não foram encontradas',
        code: 'CATEGORIES_NOT_FOUND'
      }
    }

    // Atualizar a ordem de cada categoria
    const updatePromises = categoryOrders.map(({ id, order }) =>
      prisma.category.update({
        where: { id },
        data: { order }
      })
    )

    await Promise.all(updatePromises)

    // Buscar categorias atualizadas
    const updatedCategories = await prisma.category.findMany({
      where: {
        businessId: business.id
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ]
    })

    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/categories')
    revalidatePath('/dashboard')
    
    return createSuccessResult(updatedCategories as Category[])
  } catch (error) {
    return handleActionError(error)
  }
}

export const reorderCategories = withBusiness(_reorderCategories)

/**
 * Ativar/Desativar categoria
 */
export async function toggleCategoryStatus(
  categoryId: string,
  isActive: boolean
): Promise<ActionResult<Category>> {
  return updateCategory(categoryId, { isActive })
}