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
  AddressSchema,
  CustomerFiltersSchema,
  validateData,
  validateId 
} from '@/lib/actions/validation-helpers'

export interface Address {
  id: string
  userId: string
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  zipCode: string
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Customer {
  id: string
  name: string | null
  email: string
  phone: string | null
  image: string | null
  isActive: boolean
  emailVerified: boolean
  createdAt: Date
  addresses: Address[]
  _count: {
    orders: number
  }
}

export interface AddressCreateInput {
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
  isDefault?: boolean
}

export interface AddressUpdateInput {
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  zipCode?: string
  isDefault?: boolean
}

export interface CustomerFilters {
  search?: string
  city?: string
  state?: string
  hasActiveOrders?: boolean
}

/**
 * Buscar todos os endereços do usuário autenticado
 */
async function _getMyAddresses(): Promise<ActionResult<Address[]>> {
  try {
    const user = await getAuthenticatedUser()
    
    const addresses = await prisma.address.findMany({
      where: {
        userId: user.id
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return createSuccessResult(addresses as Address[])
  } catch (error) {
    return handleActionError(error)
  }
}

export const getMyAddresses = withAuth(_getMyAddresses)

/**
 * Buscar endereço por ID
 */
async function _getMyAddress(addressId: string): Promise<ActionResult<Address>> {
  try {
    const user = await getAuthenticatedUser()
    const validatedId = validateId(addressId, 'ID do endereço')

    const address = await prisma.address.findFirst({
      where: {
        id: validatedId,
        userId: user.id
      }
    })

    if (!address) {
      return {
        success: false,
        error: 'Endereço não encontrado',
        code: 'ADDRESS_NOT_FOUND'
      }
    }

    return createSuccessResult(address as Address)
  } catch (error) {
    return handleActionError(error)
  }
}

export const getMyAddress = withAuth(_getMyAddress)

/**
 * Criar novo endereço
 */
async function _createAddress(input: AddressCreateInput): Promise<ActionResult<Address>> {
  try {
    const user = await getAuthenticatedUser()
    const validatedData = validateData(AddressSchema, input)

    // Limpar CEP (remover caracteres não numéricos)
    const cleanZipCode = validatedData.zipCode.replace(/\D/g, '')

    // Se este endereço for padrão, remover padrão dos outros
    if (validatedData.isDefault) {
      await prisma.address.updateMany({
        where: {
          userId: user.id,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })
    }

    // Criar o novo endereço
    const address = await prisma.address.create({
      data: {
        userId: user.id,
        street: validatedData.street,
        number: validatedData.number,
        complement: validatedData.complement,
        neighborhood: validatedData.neighborhood,
        city: validatedData.city,
        state: validatedData.state,
        zipCode: cleanZipCode,
        isDefault: validatedData.isDefault || false
      }
    })

    revalidatePath('/customer/addresses')
    
    return createSuccessResult(address as Address)
  } catch (error) {
    return handleActionError(error)
  }
}

export const createAddress = withAuth(_createAddress)

/**
 * Atualizar endereço
 */
async function _updateAddress(
  addressId: string,
  input: AddressUpdateInput
): Promise<ActionResult<Address>> {
  try {
    const user = await getAuthenticatedUser()
    const validatedId = validateId(addressId, 'ID do endereço')
    
    // Verificar se endereço existe e pertence ao usuário
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: validatedId,
        userId: user.id
      }
    })

    if (!existingAddress) {
      return {
        success: false,
        error: 'Endereço não encontrado',
        code: 'ADDRESS_NOT_FOUND'
      }
    }

    const updateData: Partial<AddressUpdateInput> = {}
    
    if (input.street !== undefined) updateData.street = input.street
    if (input.number !== undefined) updateData.number = input.number
    if (input.complement !== undefined) updateData.complement = input.complement
    if (input.neighborhood !== undefined) updateData.neighborhood = input.neighborhood
    if (input.city !== undefined) updateData.city = input.city
    if (input.state !== undefined) updateData.state = input.state
    if (input.zipCode !== undefined) updateData.zipCode = input.zipCode.replace(/\D/g, '')
    if (input.isDefault !== undefined) updateData.isDefault = input.isDefault

    // Se este endereço for definido como padrão, remover padrão dos outros
    if (input.isDefault) {
      await prisma.address.updateMany({
        where: {
          userId: user.id,
          isDefault: true,
          id: { not: validatedId }
        },
        data: {
          isDefault: false
        }
      })
    }

    const address = await prisma.address.update({
      where: { id: validatedId },
      data: updateData
    })

    revalidatePath('/customer/addresses')
    
    return createSuccessResult(address as Address)
  } catch (error) {
    return handleActionError(error)
  }
}

export const updateAddress = withAuth(_updateAddress)

/**
 * Deletar endereço
 */
async function _deleteAddress(addressId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getAuthenticatedUser()
    const validatedId = validateId(addressId, 'ID do endereço')

    // Verificar se endereço existe e pertence ao usuário
    const address = await prisma.address.findFirst({
      where: {
        id: validatedId,
        userId: user.id
      }
    })

    if (!address) {
      return {
        success: false,
        error: 'Endereço não encontrado',
        code: 'ADDRESS_NOT_FOUND'
      }
    }

    await prisma.address.delete({
      where: { id: validatedId }
    })

    revalidatePath('/customer/addresses')
    
    return createSuccessResult({ id: validatedId })
  } catch (error) {
    return handleActionError(error)
  }
}

export const deleteAddress = withAuth(_deleteAddress)

/**
 * Definir endereço como padrão
 */
async function _setDefaultAddress(addressId: string): Promise<ActionResult<Address>> {
  try {
    const user = await getAuthenticatedUser()
    const validatedId = validateId(addressId, 'ID do endereço')

    // Verificar se endereço existe e pertence ao usuário
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: validatedId,
        userId: user.id
      }
    })

    if (!existingAddress) {
      return {
        success: false,
        error: 'Endereço não encontrado',
        code: 'ADDRESS_NOT_FOUND'
      }
    }

    // Remover padrão de outros endereços
    await prisma.address.updateMany({
      where: {
        userId: user.id,
        isDefault: true
      },
      data: {
        isDefault: false
      }
    })

    // Definir este como padrão
    const address = await prisma.address.update({
      where: { id: validatedId },
      data: { isDefault: true }
    })

    revalidatePath('/customer/addresses')
    
    return createSuccessResult(address as Address)
  } catch (error) {
    return handleActionError(error)
  }
}

export const setDefaultAddress = withAuth(_setDefaultAddress)

/**
 * Buscar clientes (para uso administrativo - apenas donos do negócio)
 * Esta função seria usada em um dashboard administrativo
 */
export async function getCustomers(
  businessId: string,
  filters?: CustomerFilters
): Promise<ActionResult<unknown[]>> {
  try {
    const validatedFilters = filters ? validateData(CustomerFiltersSchema, filters) : {}

    // Buscar usuários que fizeram pedidos neste negócio
    const customers = await prisma.user.findMany({
      where: {
        orders: {
          some: {
            businessId: businessId,
            ...(validatedFilters.hasActiveOrders && {
              status: { in: ['PENDING', 'CONFIRMED', 'PREPARING'] }
            })
          }
        },
        ...(validatedFilters.search && {
          OR: [
            { name: { contains: validatedFilters.search, mode: 'insensitive' } },
            { email: { contains: validatedFilters.search, mode: 'insensitive' } },
            { phone: { contains: validatedFilters.search, mode: 'insensitive' } }
          ]
        }),
        ...(validatedFilters.city || validatedFilters.state ? {
          addresses: {
            some: {
              ...(validatedFilters.city && { city: { contains: validatedFilters.city, mode: 'insensitive' } }),
              ...(validatedFilters.state && { state: { contains: validatedFilters.state, mode: 'insensitive' } })
            }
          }
        } : {})
      },
      include: {
        addresses: {
          orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'desc' }
          ]
        },
        _count: {
          select: {
            orders: {
              where: { businessId }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return createSuccessResult(customers)
  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Buscar cliente por ID (para uso administrativo)
 */
export async function getCustomer(
  customerId: string,
  businessId: string
): Promise<ActionResult<unknown>> {
  try {
    const validatedId = validateId(customerId, 'ID do cliente')

    const customer = await prisma.user.findFirst({
      where: {
        id: validatedId,
        orders: {
          some: {
            businessId: businessId
          }
        }
      },
      include: {
        addresses: {
          orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'desc' }
          ]
        },
        _count: {
          select: {
            orders: {
              where: { businessId }
            }
          }
        }
      }
    })

    if (!customer) {
      return {
        success: false,
        error: 'Cliente não encontrado',
        code: 'CUSTOMER_NOT_FOUND'
      }
    }

    return createSuccessResult(customer)
  } catch (error) {
    return handleActionError(error)
  }
}