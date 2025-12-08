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
  TableSchema,
  validateData,
  validateId 
} from '@/lib/actions/validation-helpers'

export interface Table {
  id: string
  number: string
  qrCode: string
  isOccupied: boolean
  isReserved: boolean
  businessId: string
  createdAt: Date
  updatedAt: Date
}

export interface TableCreateInput {
  number: string
  qrCode?: string
  isOccupied?: boolean
  isReserved?: boolean
}

export interface TableUpdateInput {
  number?: string
  qrCode?: string
  isOccupied?: boolean
  isReserved?: boolean
}

export interface TableFilters {
  search?: string
  isOccupied?: boolean
  isReserved?: boolean
}

// Função utilitária para gerar QR Code único
function generateQRCode(identifier: string): string {
  return `qr_${identifier}_${Date.now()}`
}

/**
 * Buscar todas as mesas do negócio
 */
async function _getTables(
  { business }: BusinessContext,
  filters?: TableFilters
): Promise<ActionResult<Table[]>> {
  try {
    const where: {
      businessId: string
      isOccupied?: boolean
      isReserved?: boolean
      OR?: Array<{
        number?: { contains: string; mode: 'insensitive' }
      }>
    } = {
      businessId: business.id
    }

    if (filters?.isOccupied !== undefined) {
      where.isOccupied = filters.isOccupied
    }

    if (filters?.isReserved !== undefined) {
      where.isReserved = filters.isReserved
    }

    if (filters?.search) {
      where.OR = [
        { number: { contains: filters.search, mode: 'insensitive' } }
      ]
    }

    const tables = await prisma.table.findMany({
      where,
      orderBy: { number: 'asc' }
    })

    return createSuccessResult(tables as Table[])
  } catch (error) {
    return handleActionError(error)
  }
}

export const getTables = withBusiness(_getTables)

/**
 * Buscar mesa por ID
 */
async function _getTable(
  { business }: BusinessContext,
  tableId: string
): Promise<ActionResult<Table>> {
  try {
    const validatedId = validateId(tableId, 'ID da mesa')

    const table = await prisma.table.findFirst({
      where: {
        id: validatedId,
        businessId: business.id
      }
    })

    if (!table) {
      return {
        success: false,
        error: 'Mesa não encontrada',
        code: 'TABLE_NOT_FOUND'
      }
    }

    return createSuccessResult(table as Table)
  } catch (error) {
    return handleActionError(error)
  }
}

export const getTable = withBusiness(_getTable)

/**
 * Criar nova mesa
 */
async function _createTable(
  { business }: BusinessContext,
  input: TableCreateInput
): Promise<ActionResult<Table>> {
  try {
    const validatedData = validateData(TableSchema, input)
    const businessId = business.id

    // Verificar se já existe uma mesa com o mesmo número
    const existingTable = await prisma.table.findFirst({
      where: {
        number: validatedData.number,
        businessId
      }
    })

    if (existingTable) {
      return {
        success: false,
        error: 'Já existe uma mesa com este número',
        code: 'TABLE_NUMBER_EXISTS'
      }
    }

    // Gerar QR Code único se não fornecido
    const qrCode = validatedData.qrCode || generateQRCode(`table-${businessId}-${validatedData.number}`)

    const table = await prisma.table.create({
      data: {
        number: validatedData.number,
        qrCode,
        isOccupied: validatedData.isOccupied ?? false,
        isReserved: validatedData.isReserved ?? false,
        businessId
      }
    })

    revalidatePath('/dashboard/tables')
    revalidatePath('/dashboard')
    
    return createSuccessResult(table as Table)
  } catch (error) {
    return handleActionError(error)
  }
}

export const createTable = withBusiness(_createTable)

/**
 * Atualizar mesa
 */
async function _updateTable(
  { business }: BusinessContext,
  tableId: string,
  input: TableUpdateInput
): Promise<ActionResult<Table>> {
  try {
    const validatedId = validateId(tableId, 'ID da mesa')
    
    // Validar dados apenas se foram fornecidos
    const updateData: {
      number?: string
      qrCode?: string
      isOccupied?: boolean
      isReserved?: boolean
    } = {}
    
    if (input.number !== undefined) {
      updateData.number = validateData(TableSchema.pick({ number: true }), { number: input.number }).number
      
      // Verificar se já existe outra mesa com o mesmo número
      const existingTable = await prisma.table.findFirst({
        where: {
          number: updateData.number,
          businessId: business.id,
          id: { not: validatedId }
        }
      })

      if (existingTable) {
        return {
          success: false,
          error: 'Já existe uma mesa com este número',
          code: 'TABLE_NUMBER_EXISTS'
        }
      }

      // Gerar novo QR Code se o número mudou
      updateData.qrCode = generateQRCode(`table-${business.id}-${updateData.number}`)
    }
    
    if (input.qrCode !== undefined) {
      updateData.qrCode = input.qrCode
    }
    
    if (input.isOccupied !== undefined) {
      updateData.isOccupied = input.isOccupied
    }
    
    if (input.isReserved !== undefined) {
      updateData.isReserved = input.isReserved
    }

    const table = await prisma.table.update({
      where: {
        id: validatedId,
        businessId: business.id
      },
      data: updateData
    })

    revalidatePath('/dashboard/tables')
    revalidatePath('/dashboard')
    
    return createSuccessResult(table as Table)
  } catch (error) {
    return handleActionError(error)
  }
}

export const updateTable = withBusiness(_updateTable)

/**
 * Excluir mesa
 */
async function _deleteTable(
  { business }: BusinessContext,
  tableId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const validatedId = validateId(tableId, 'ID da mesa')

    // Verificar se a mesa existe e pertence ao negócio
    const table = await prisma.table.findFirst({
      where: {
        id: validatedId,
        businessId: business.id
      }
    })

    if (!table) {
      return {
        success: false,
        error: 'Mesa não encontrada',
        code: 'TABLE_NOT_FOUND'
      }
    }

    // Verificar se a mesa tem pedidos ativos
    const activeOrders = await prisma.order.count({
      where: {
        tableId: validatedId,
        status: { in: ['PENDING', 'CONFIRMED', 'PREPARING'] }
      }
    })

    if (activeOrders > 0) {
      return {
        success: false,
        error: 'Não é possível excluir mesa com pedidos ativos',
        code: 'TABLE_HAS_ACTIVE_ORDERS'
      }
    }

    await prisma.table.delete({
      where: {
        id: validatedId
      }
    })

    revalidatePath('/dashboard/tables')
    revalidatePath('/dashboard')
    
    return createSuccessResult({ id: validatedId })
  } catch (error) {
    return handleActionError(error)
  }
}

export const deleteTable = withBusiness(_deleteTable)

/**
 * Atualizar status da mesa (ocupada/reservada)
 */
async function _updateTableStatus(
  { business }: BusinessContext,
  tableId: string,
  statusData: { isOccupied?: boolean; isReserved?: boolean }
): Promise<ActionResult<Table>> {
  try {
    const validatedId = validateId(tableId, 'ID da mesa')

    // Verificar se a mesa existe e pertence ao negócio
    const existingTable = await prisma.table.findFirst({
      where: {
        id: validatedId,
        businessId: business.id
      }
    })

    if (!existingTable) {
      return {
        success: false,
        error: 'Mesa não encontrada',
        code: 'TABLE_NOT_FOUND'
      }
    }

    const updateData: { isOccupied?: boolean; isReserved?: boolean } = {}
    if (statusData.isOccupied !== undefined) updateData.isOccupied = statusData.isOccupied
    if (statusData.isReserved !== undefined) updateData.isReserved = statusData.isReserved

    const table = await prisma.table.update({
      where: { id: validatedId },
      data: updateData
    })

    revalidatePath('/dashboard/tables')
    
    return createSuccessResult(table as Table)
  } catch (error) {
    return handleActionError(error)
  }
}

export const updateTableStatus = withBusiness(_updateTableStatus)

/**
 * Buscar mesas disponíveis
 */
async function _getAvailableTables(
  { business }: BusinessContext
): Promise<ActionResult<Table[]>> {
  try {
    const tables = await prisma.table.findMany({
      where: {
        businessId: business.id,
        isOccupied: false,
        isReserved: false
      },
      orderBy: { number: 'asc' }
    })

    return createSuccessResult(tables as Table[])
  } catch (error) {
    return handleActionError(error)
  }
}

export const getAvailableTables = withBusiness(_getAvailableTables)

/**
 * Reservar/Liberar mesa
 */
export async function toggleTableReservation(
  tableId: string,
  isReserved: boolean
): Promise<ActionResult<Table>> {
  return updateTableStatus(tableId, { isReserved })
}

/**
 * Marcar mesa como ocupada/livre
 */
export async function toggleTableOccupancy(
  tableId: string,
  isOccupied: boolean
): Promise<ActionResult<Table>> {
  return updateTableStatus(tableId, { isOccupied })
}