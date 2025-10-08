'use server'

import { prisma } from '@/lib/database/prisma'
import { revalidatePath } from 'next/cache'
import {
  ActionResult,
  createSuccessResult,
  handleActionError,
  withCompany,
  CompanyContext
} from '@/lib/actions/auth-helpers'
import { 
  validateId 
} from '@/lib/actions/validation-helpers'
import { z } from 'zod'

const SupplierCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  description: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  order: z.number().min(0).optional(),
  isActive: z.boolean().default(true)
})

export interface SupplierCategory {
  id: string
  name: string
  description: string | null
  parentId: string | null
  order: number
  isActive: boolean
  companyId: string
  createdAt: Date
  updatedAt: Date
  _count?: {
    services: number
  }
  parent?: {
    id: string
    name: string
  } | null
  subcategories?: SupplierCategory[]
}

export interface SupplierCategoryCreateInput {
  name: string
  description?: string
  parentId?: string | null
  order?: number
  isActive?: boolean
}

export interface SupplierCategoryUpdateInput {
  name?: string
  description?: string
  parentId?: string | null
  order?: number
  isActive?: boolean
}

/**
 * Buscar todas as categorias do fornecedor
 */
async function _getSupplierCategories(
  { company }: CompanyContext,
  includeServiceCount: boolean = false
): Promise<ActionResult<SupplierCategory[]>> {
  try {
    const categories = await prisma.supplierServiceCategory.findMany({
      where: {
        companyId: company.id
      },
      include: {
        parent: true,
        subcategories: true,
        ...(includeServiceCount ? {
          _count: {
            select: {
              services: true
            }
          }
        } : {})
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ]
    })

    return createSuccessResult(categories as SupplierCategory[])
  } catch (error) {
    return handleActionError(error)
  }
}

export const getSupplierCategories = withCompany(_getSupplierCategories)

/**
 * Buscar categoria por ID
 */
async function _getSupplierCategory(
  { company }: CompanyContext,
  categoryId: string
): Promise<ActionResult<SupplierCategory>> {
  try {
    const validatedId = validateId(categoryId)

    const category = await prisma.supplierServiceCategory.findFirst({
      where: {
        id: validatedId,
        companyId: company.id
      },
      include: {
        parent: true,
        subcategories: true,
        _count: {
          select: {
            services: true
          }
        }
      }
    })

    if (!category) {
      return {
        success: false,
        error: 'Categoria não encontrada'
      }
    }

    return createSuccessResult(category as SupplierCategory)
  } catch (error) {
    return handleActionError(error)
  }
}

export const getSupplierCategory = withCompany(_getSupplierCategory)

/**
 * Criar nova categoria
 */
async function _createSupplierCategory(
  { company }: CompanyContext,
  input: SupplierCategoryCreateInput
): Promise<ActionResult<SupplierCategory>> {
  try {
    const parsed = SupplierCategorySchema.parse(input)

    // Se não foi fornecida uma ordem, usar a próxima disponível  
    if (parsed.order === undefined) {
      const lastCategory = await prisma.supplierServiceCategory.findFirst({
        where: { companyId: company.id },
        orderBy: { order: 'desc' },
        select: { order: true }
      })
      
      parsed.order = (lastCategory?.order || 0) + 1
    }

    // Verificar se categoria pai existe (se fornecida)
    if (parsed.parentId) {
      const parentCategory = await prisma.supplierServiceCategory.findFirst({
        where: {
          id: parsed.parentId,
          companyId: company.id
        }
      })

      if (!parentCategory) {
        return {
          success: false,
          error: 'Categoria pai não encontrada'
        }
      }
    }

    const category = await prisma.supplierServiceCategory.create({
      data: {
        ...parsed,
        companyId: company.id
      },
      include: {
        parent: true,
        subcategories: true
      }
    })

    revalidatePath('/supplier-products')
    revalidatePath('/supplier-categories')
    revalidatePath('/supplier-dashboard')
    
    return createSuccessResult(category as SupplierCategory)
  } catch (error) {
    return handleActionError(error)
  }
}

export const createSupplierCategory = withCompany(_createSupplierCategory)

/**
 * Atualizar categoria
 */
async function _updateSupplierCategory(
  { company }: CompanyContext,
  categoryId: string,
  input: SupplierCategoryUpdateInput
): Promise<ActionResult<SupplierCategory>> {
  try {
    const validatedId = validateId(categoryId)
    const parsed = SupplierCategorySchema.partial().parse(input)

    // Verificar se categoria existe
    const existingCategory = await prisma.supplierServiceCategory.findFirst({
      where: {
        id: validatedId,
        companyId: company.id
      }
    })

    if (!existingCategory) {
      return {
        success: false,
        error: 'Categoria não encontrada'
      }
    }

    // Verificar se categoria pai existe (se fornecida)
    if (parsed.parentId) {
      const parentCategory = await prisma.supplierServiceCategory.findFirst({
        where: {
          id: parsed.parentId,
          companyId: company.id
        }
      })

      if (!parentCategory) {
        return {
          success: false,
          error: 'Categoria pai não encontrada'
        }
      }

      // Não permitir que uma categoria seja pai de si mesma
      if (parsed.parentId === validatedId) {
        return {
          success: false,
          error: 'Uma categoria não pode ser pai de si mesma'
        }
      }
    }

    const category = await prisma.supplierServiceCategory.update({
      where: { id: validatedId },
      data: parsed,
      include: {
        parent: true,
        subcategories: true
      }
    })

    revalidatePath('/supplier-products')
    revalidatePath('/supplier-categories')
    revalidatePath('/supplier-dashboard')
    
    return createSuccessResult(category as SupplierCategory)
  } catch (error) {
    return handleActionError(error)
  }
}

export const updateSupplierCategory = withCompany(_updateSupplierCategory)

/**
 * Excluir categoria
 */
async function _deleteSupplierCategory(
  { company }: CompanyContext,
  categoryId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const validatedId = validateId(categoryId)

    // Verificar se categoria existe
    const existingCategory = await prisma.supplierServiceCategory.findFirst({
      where: {
        id: validatedId,
        companyId: company.id
      },
      include: {
        _count: {
          select: {
            services: true,
            subcategories: true
          }
        }
      }
    })

    if (!existingCategory) {
      return {
        success: false,
        error: 'Categoria não encontrada'
      }
    }

    // Verificar se categoria tem produtos/serviços
    if (existingCategory._count.services > 0) {
      return {
        success: false,
        error: 'Não é possível deletar uma categoria que possui produtos/serviços'
      }
    }

    // Verificar se categoria tem subcategorias
    if (existingCategory._count.subcategories > 0) {
      return {
        success: false,
        error: 'Não é possível deletar uma categoria que possui subcategorias'
      }
    }

    await prisma.supplierServiceCategory.delete({
      where: { id: validatedId }
    })

    revalidatePath('/supplier-products')
    revalidatePath('/supplier-categories')
    revalidatePath('/supplier-dashboard')
    
    return createSuccessResult({ id: validatedId })
  } catch (error) {
    return handleActionError(error)
  }
}

export const deleteSupplierCategory = withCompany(_deleteSupplierCategory)

/**
 * Reordenar categorias
 */
async function _reorderSupplierCategories(
  { company }: CompanyContext,
  categoryOrders: Array<{ id: string; order: number }>
): Promise<ActionResult<SupplierCategory[]>> {
  try {
    // Validar dados
    const validatedOrders = categoryOrders.map(item => ({
      id: validateId(item.id),
      order: item.order
    }))

    // Atualizar em transação
    await prisma.$transaction(
      validatedOrders.map(({ id, order }) =>
        prisma.supplierServiceCategory.update({
          where: { 
            id,
            companyId: company.id // Garantir que só pode reordenar suas próprias categorias
          },
          data: { order }
        })
      )
    )

    // Buscar categorias atualizadas
    const updatedCategories = await prisma.supplierServiceCategory.findMany({
      where: {
        companyId: company.id
      },
      include: {
        parent: true,
        subcategories: true
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ]
    })

    revalidatePath('/supplier-products')
    revalidatePath('/supplier-categories')
    revalidatePath('/supplier-dashboard')
    
    return createSuccessResult(updatedCategories as SupplierCategory[])
  } catch (error) {
    return handleActionError(error)
  }
}

export const reorderSupplierCategories = withCompany(_reorderSupplierCategories)

/**
 * Buscar categorias hierárquicas (apenas categorias pai com suas subcategorias)
 */
async function _getSupplierCategoriesHierarchy(
  { company }: CompanyContext
): Promise<ActionResult<SupplierCategory[]>> {
  try {
    const categories = await prisma.supplierServiceCategory.findMany({
      where: {
        companyId: company.id,
        parentId: null, // Apenas categorias pai
        isActive: true
      },
      include: {
        subcategories: {
          where: {
            isActive: true
          },
          orderBy: [
            { order: 'asc' },
            { name: 'asc' }
          ]
        }
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ]
    })

    return createSuccessResult(categories as SupplierCategory[])
  } catch (error) {
    return handleActionError(error)
  }
}

export const getSupplierCategoriesHierarchy = withCompany(_getSupplierCategoriesHierarchy)

/**
 * Buscar todas as subcategorias de uma categoria específica
 */
async function _getSupplierSubcategories(
  { company }: CompanyContext,
  categoryId: string
): Promise<ActionResult<SupplierCategory[]>> {
  try {
    const validatedId = validateId(categoryId)

    const subcategories = await prisma.supplierServiceCategory.findMany({
      where: {
        companyId: company.id,
        parentId: validatedId,
        isActive: true
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ]
    })

    return createSuccessResult(subcategories as SupplierCategory[])
  } catch (error) {
    return handleActionError(error)
  }
}

export const getSupplierSubcategories = withCompany(_getSupplierSubcategories)

/**
 * Criar categorias padrão para o supplier
 */
async function _createDefaultSupplierCategories(
  { company }: CompanyContext
): Promise<ActionResult<{ message: string; count: number }>> {
  try {
    // Importar dinamicamente para evitar problemas de dependência circular
    const { createDefaultSupplierCategories } = await import('@/lib/supplier/default-categories')
    
    const result = await createDefaultSupplierCategories(company.id)
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Erro ao criar categorias padrão'
      }
    }

    revalidatePath('/supplier-products')
    revalidatePath('/supplier-categories')
    revalidatePath('/supplier-dashboard')
    
    return createSuccessResult({ 
      message: result.message || 'Categorias criadas com sucesso',
      count: 16 // Número de categorias padrão
    })
  } catch (error) {
    return handleActionError(error)
  }
}

export const createDefaultSupplierCategories = withCompany(_createDefaultSupplierCategories)

/**
 * Ativar/Desativar categoria
 */
export async function toggleSupplierCategoryStatus(
  categoryId: string,
  isActive: boolean
): Promise<ActionResult<SupplierCategory>> {
  try {
    const validatedId = validateId(categoryId)

    const category = await prisma.supplierServiceCategory.update({
      where: { id: validatedId },
      data: { isActive },
      include: {
        parent: true,
        subcategories: true
      }
    })

    revalidatePath('/supplier-products')
    revalidatePath('/supplier-categories')
    revalidatePath('/supplier-dashboard')
    
    return createSuccessResult(category as SupplierCategory)
  } catch (error) {
    return handleActionError(error)
  }
}