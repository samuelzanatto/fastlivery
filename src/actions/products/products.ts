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
  ProductSchema, 
  ProductFiltersSchema,
  validateData,
  validateId 
} from '@/lib/actions/validation-helpers'

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  categoryId: string
  businessId: string
  image: string | null
  isAvailable: boolean
  createdAt: Date
  updatedAt: Date
  category?: {
    id: string
    name: string
  }
  options?: Array<{
    id: string
    name: string
    options: Array<{
      id: string
      name: string
      price: number
    }>
  }>
}

export interface ProductFilters {
  categoryId?: string
  search?: string
  isAvailable?: boolean
}

export interface ProductCreateInput {
  name: string
  description?: string
  price: number
  categoryId: string
  image?: string
  isAvailable?: boolean
}

export interface ProductUpdateInput {
  name?: string
  description?: string
  price?: number
  categoryId?: string
  image?: string
  isAvailable?: boolean
}

/**
 * Buscar todos os produtos do negócio
 */
async function _getProducts(
  { business }: BusinessContext,
  filters?: ProductFilters
): Promise<ActionResult<Product[]>> {
  try {
    const validatedFilters = filters ? validateData(ProductFiltersSchema, filters) : {}
    
    const where: {
      businessId: string
      categoryId?: string
      isAvailable?: boolean
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' }
        description?: { contains: string; mode: 'insensitive' }
      }>
    } = {
      businessId: business.id
    }

    if (validatedFilters.categoryId) {
      where.categoryId = validatedFilters.categoryId
    }

    if (validatedFilters.search) {
      where.OR = [
        { name: { contains: validatedFilters.search, mode: 'insensitive' } },
        { description: { contains: validatedFilters.search, mode: 'insensitive' } }
      ]
    }

    if (validatedFilters.isAvailable !== undefined) {
      where.isAvailable = validatedFilters.isAvailable
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        options: {
          include: {
            options: true
          },
          orderBy: {
            name: 'asc'
          }
        }
      },
      orderBy: [
        { category: { order: 'asc' } },
        { name: 'asc' }
      ]
    })

    return createSuccessResult(products as Product[])
  } catch (error) {
    return handleActionError(error)
  }
}

export const getProducts = withBusiness(_getProducts)

/**
 * Buscar produto por ID
 */
async function _getProduct(
  { business }: BusinessContext,
  productId: string
): Promise<ActionResult<Product>> {
  try {
    const validatedId = validateId(productId, 'ID do produto')

    const product = await prisma.product.findFirst({
      where: {
        id: validatedId,
        businessId: business.id
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        options: {
          include: {
            options: true
          },
          orderBy: {
            name: 'asc'
          }
        }
      }
    })

    if (!product) {
      return {
        success: false,
        error: 'Produto não encontrado',
        code: 'PRODUCT_NOT_FOUND'
      }
    }

    return createSuccessResult(product as Product)
  } catch (error) {
    return handleActionError(error)
  }
}

export const getProduct = withBusiness(_getProduct)

/**
 * Criar novo produto
 */
async function _createProduct(
  { business }: BusinessContext,
  input: ProductCreateInput
): Promise<ActionResult<Product>> {
  try {
    const validatedData = validateData(ProductSchema, input)
    const businessId = business.id

    // Verificar se a categoria existe e pertence ao negócio
    const category = await prisma.category.findFirst({
      where: {
        id: validatedData.categoryId,
        businessId
      }
    })

    if (!category) {
      return {
        success: false,
        error: 'Categoria não encontrada',
        code: 'CATEGORY_NOT_FOUND'
      }
    }

    const product = await prisma.product.create({
      data: {
        ...validatedData,
        businessId
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard')
    
    return createSuccessResult(product as Product)
  } catch (error) {
    return handleActionError(error)
  }
}

export const createProduct = withBusiness(_createProduct)

/**
 * Atualizar produto
 */
async function _updateProduct(
  { business }: BusinessContext,
  productId: string,
  input: ProductUpdateInput
): Promise<ActionResult<Product>> {
  try {
    const validatedId = validateId(productId, 'ID do produto')
    
    // Validar dados apenas se foram fornecidos
    const updateData: {
      name?: string
      description?: string | null
      price?: number
      categoryId?: string
      image?: string | null
      isAvailable?: boolean
    } = {}
    
    if (input.name !== undefined) {
      updateData.name = validateData(ProductSchema.pick({ name: true }), { name: input.name }).name
    }
    
    if (input.description !== undefined) {
      updateData.description = input.description
    }
    
    if (input.price !== undefined) {
      updateData.price = validateData(ProductSchema.pick({ price: true }), { price: input.price }).price
    }
    
    if (input.categoryId !== undefined) {
      // Verificar se a categoria existe e pertence ao negócio
      const category = await prisma.category.findFirst({
        where: {
          id: input.categoryId,
          businessId: business.id
        }
      })

      if (!category) {
        return {
          success: false,
          error: 'Categoria não encontrada',
          code: 'CATEGORY_NOT_FOUND'
        }
      }
      
      updateData.categoryId = input.categoryId
    }
    
    if (input.image !== undefined) {
      updateData.image = input.image
    }
    
    if (input.isAvailable !== undefined) {
      updateData.isAvailable = input.isAvailable
    }

    const product = await prisma.product.update({
      where: {
        id: validatedId,
        businessId: business.id
      },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard')
    
    return createSuccessResult(product as Product)
  } catch (error) {
    return handleActionError(error)
  }
}

export const updateProduct = withBusiness(_updateProduct)

/**
 * Excluir produto
 */
async function _deleteProduct(
  { business }: BusinessContext,
  productId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const validatedId = validateId(productId, 'ID do produto')

    // Verificar se o produto existe e pertence ao negócio
    const product = await prisma.product.findFirst({
      where: {
        id: validatedId,
        businessId: business.id
      }
    })

    if (!product) {
      return {
        success: false,
        error: 'Produto não encontrado',
        code: 'PRODUCT_NOT_FOUND'
      }
    }

    await prisma.product.delete({
      where: {
        id: validatedId
      }
    })

    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard')
    
    return createSuccessResult({ id: validatedId })
  } catch (error) {
    return handleActionError(error)
  }
}

export const deleteProduct = withBusiness(_deleteProduct)

/**
 * Ativar/Desativar produto
 */
export async function toggleProductAvailability(
  productId: string,
  isAvailable: boolean
): Promise<ActionResult<Product>> {
  return updateProduct(productId, { isAvailable })
}

// =====================================================================
// PRODUCT OPTIONS & ADDITIONALS MANAGEMENT
// =====================================================================

export interface ProductOptionInput {
  name: string
  description?: string
  price?: number
  isRequired?: boolean
  maxOptions?: number
  options: {
    name: string
    price?: number
  }[]
}

export interface ProductAdditionalIds {
  additionalIds: string[]
}

/**
 * Obter opções administrativas do produto
 */
async function _getProductAdminOptions(
  { business }: BusinessContext,
  productId: string
): Promise<ActionResult<{
  success: boolean
  options: Array<{
    id: string
    name: string
    description?: string
    price: number
    isRequired: boolean
    maxOptions: number
    options: Array<{
      id: string
      name: string
      price: number
    }>
  }>
}>> {
  try {
    const validatedId = validateId(productId, 'ID do produto')

    // Verificar se o produto existe e pertence ao negócio do usuário
    const product = await prisma.product.findFirst({
      where: {
        id: validatedId,
        businessId: business.id
      },
      include: {
        options: {
          include: {
            options: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })

    if (!product) {
      return {
        success: false,
        error: 'Produto não encontrado',
        code: 'PRODUCT_NOT_FOUND'
      }
    }

    const options = product.options.map(option => ({
      id: option.id,
      name: option.name,
      description: option.description || undefined,
      price: option.price,
      isRequired: option.isRequired,
      maxOptions: option.maxOptions,
      options: option.options.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price
      }))
    }))

    return createSuccessResult({
      success: true,
      options
    })
  } catch (error) {
    return handleActionError(error)
  }
}

export const getProductAdminOptions = withBusiness(_getProductAdminOptions)

/**
 * Salvar opções administrativas do produto
 */
async function _saveProductAdminOptions(
  { business }: BusinessContext,
  productId: string,
  options: ProductOptionInput[]
): Promise<ActionResult<{ success: boolean; message: string }>> {
  try {
    const validatedId = validateId(productId, 'ID do produto')

    // Verificar se o produto existe e pertence ao negócio do usuário
    const product = await prisma.product.findFirst({
      where: {
        id: validatedId,
        businessId: business.id
      }
    })

    if (!product) {
      return {
        success: false,
        error: 'Produto não encontrado',
        code: 'PRODUCT_NOT_FOUND'
      }
    }

    // Iniciar transação para salvar as opções
    await prisma.$transaction(async (tx) => {
      // Remover todas as opções existentes do produto
      await tx.productOptionItem.deleteMany({
        where: {
          productOption: {
            productId: validatedId
          }
        }
      })

      await tx.productOption.deleteMany({
        where: {
          productId: validatedId
        }
      })

      // Criar novas opções
      for (const option of options) {
        if (!option.name?.trim()) continue // Pular grupos sem nome

        const createdOption = await tx.productOption.create({
          data: {
            productId: validatedId,
            name: option.name,
            description: option.description || null,
            price: option.price || 0,
            isRequired: option.isRequired || false,
            maxOptions: option.maxOptions || 1
          }
        })

        // Criar itens da opção
        for (const item of option.options) {
          if (!item.name?.trim()) continue // Pular itens sem nome

          await tx.productOptionItem.create({
            data: {
              productOptionId: createdOption.id,
              name: item.name,
              price: item.price || 0
            }
          })
        }
      }
    })

    revalidatePath('/dashboard/products')
    revalidatePath(`/dashboard/products/${validatedId}`)

    return createSuccessResult({
      success: true,
      message: 'Opções do produto salvas com sucesso'
    })
  } catch (error) {
    return handleActionError(error)
  }
}

export const saveProductAdminOptions = withBusiness(_saveProductAdminOptions)

/**
 * Obter adicionais associados ao produto
 */
async function _getProductAdditionals(
  { business }: BusinessContext,
  productId: string
): Promise<ActionResult<{ additionalIds: string[] }>> {
  try {
    const validatedId = validateId(productId, 'ID do produto')

    // Verificar se o produto existe e se o usuário tem acesso
    const product = await prisma.product.findFirst({
      where: {
        id: validatedId,
        businessId: business.id
      }
    })

    if (!product) {
      return {
        success: false,
        error: 'Produto não encontrado',
        code: 'PRODUCT_NOT_FOUND'
      }
    }

    // Buscar adicionais associados ao produto
    const productAdditionals = await prisma.productAdditional.findMany({
      where: { productId: validatedId },
      select: {
        additionalId: true
      }
    })

    const additionalIds = productAdditionals.map(pa => pa.additionalId)

    return createSuccessResult({ additionalIds })
  } catch (error) {
    return handleActionError(error)
  }
}

export const getProductAdditionals = withBusiness(_getProductAdditionals)

/**
 * Atualizar adicionais do produto
 */
async function _updateProductAdditionals(
  { business }: BusinessContext,
  productId: string,
  { additionalIds }: ProductAdditionalIds
): Promise<ActionResult<{ message: string }>> {
  try {
    const validatedId = validateId(productId, 'ID do produto')

    if (!Array.isArray(additionalIds)) {
      return {
        success: false,
        error: 'additionalIds deve ser um array',
        code: 'INVALID_INPUT'
      }
    }

    // Verificar se todos os adicionais pertencem ao mesmo negócio do usuário
    const additionals = await prisma.businessAdditional.findMany({
      where: {
        id: { in: additionalIds },
        businessId: business.id
      }
    })

    if (additionals.length !== additionalIds.length) {
      return {
        success: false,
        error: 'Alguns adicionais não foram encontrados ou você não tem acesso',
        code: 'ADDITIONALS_NOT_FOUND'
      }
    }

    // Atualizar as associações
    await prisma.product.update({
      where: { id: validatedId },
      data: {
        additionals: {
          set: additionalIds.map(id => ({ id }))
        }
      }
    })

    revalidatePath('/dashboard/products')
    revalidatePath(`/dashboard/products/${validatedId}`)

    return createSuccessResult({ message: 'Adicionais atualizados com sucesso' })
  } catch (error) {
    return handleActionError(error)
  }
}

export const updateProductAdditionals = withBusiness(_updateProductAdditionals)

/**
 * Obter produto com opções para visualização pública (clientes)
 */
export async function getProductWithOptions(productId: string): Promise<ActionResult<{
  product: Product & {
    options: Array<{
      id: string
      name: string
      description?: string
      price: number
      isRequired: boolean
      maxOptions: number
      options: Array<{
        id: string
        name: string
        price: number
      }>
    }>
  }
}>> {
  try {
    const validatedId = validateId(productId, 'ID do produto')

    // Buscar o produto com seus adicionais (função pública para clientes)
    const product = await prisma.product.findUnique({
      where: { id: validatedId },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        additionals: {
          include: {
            additional: {
              include: {
                items: {
                  orderBy: { name: 'asc' }
                }
              }
            }
          }
        }
      }
    })

    if (!product) {
      return {
        success: false,
        error: 'Produto não encontrado',
        code: 'PRODUCT_NOT_FOUND'
      }
    }

    // Transformar adicionais para o formato esperado pelo modal
    const options = product.additionals.map(productAdditional => ({
      id: productAdditional.additional.id,
      name: productAdditional.additional.name,
      description: productAdditional.additional.description || undefined,
      price: productAdditional.additional.price,
      isRequired: productAdditional.additional.isRequired,
      maxOptions: productAdditional.additional.maxOptions,
      options: productAdditional.additional.items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price
      }))
    }))

    return createSuccessResult({
      product: {
        ...product,
        options
      } as Product & { options: typeof options }
    })
  } catch (error) {
    return handleActionError(error)
  }
}