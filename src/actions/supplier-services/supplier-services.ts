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
  validateData,
  validateId 
} from '@/lib/actions/validation-helpers'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

export interface SupplierService {
  id: string
  supplierId: string
  name: string
  description: string | null
  category: string
  subCategory: string | null
  categoryId: string | null
  unitType: string
  minQuantity: number | null
  maxQuantity: number | null
  pricePerUnit: number | null
  priceType: string
  images: Prisma.JsonValue
  specifications: Prisma.JsonValue
  isActive: boolean
  trackStock: boolean
  stockQuantity: number
  reservedQuantity: number
  lowStockThreshold: number
  allowBackorder: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SupplierServiceFilters {
  category?: string
  search?: string
  isActive?: boolean
  priceType?: string
}

const SupplierServiceSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').transform(val => val.trim()),
  description: z.string().nullable().optional().transform(val => val && val.trim() ? val.trim() : null),
  category: z.string().min(1, 'Categoria é obrigatória'),
  subCategory: z.string().nullable().optional().transform(val => val && val.trim() ? val.trim() : null),
  categoryId: z.string().nullable().optional(), // ID da categoria de referência
  unitType: z.string().min(1, 'Tipo de unidade é obrigatório'),
  minQuantity: z.number().positive().nullable().optional(),
  maxQuantity: z.number().positive().nullable().optional(),
  pricePerUnit: z.number().positive().nullable().optional(),
  priceType: z.enum(['fixed', 'negotiable', 'quote']).default('fixed'),
  images: z.array(z.string()).default([]),
  specifications: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean().default(true),
  trackStock: z.boolean().default(true),
  stockQuantity: z.number().int().nonnegative().default(0),
  reservedQuantity: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().default(0),
  allowBackorder: z.boolean().default(false)
})

const SupplierServiceFiltersSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  priceType: z.string().optional()
})

/**
 * Buscar serviços do fornecedor
 */
async function _getSupplierServices(
  { company }: CompanyContext,
  filters: SupplierServiceFilters = {}
): Promise<ActionResult<SupplierService[]>> {
  try {
    // Validar filtros
    const validatedFilters = await validateData(SupplierServiceFiltersSchema, filters)
    
    // Buscar o supplier associado à company
    const supplier = await prisma.supplier.findUnique({
      where: { companyId: company.id }
    })

    if (!supplier) {
      return { success: false, error: 'Fornecedor não encontrado' }
    }

    // Construir where clause
    const where: Prisma.SupplierServiceWhereInput = {
      supplierId: supplier.id
    }

    if (validatedFilters.category) {
      where.category = validatedFilters.category
    }

    if (validatedFilters.search) {
      where.OR = [
        { name: { contains: validatedFilters.search, mode: 'insensitive' } },
        { description: { contains: validatedFilters.search, mode: 'insensitive' } }
      ]
    }

    if (typeof validatedFilters.isActive === 'boolean') {
      where.isActive = validatedFilters.isActive
    }

    if (validatedFilters.priceType) {
      where.priceType = validatedFilters.priceType
    }

    const services = await prisma.supplierService.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return createSuccessResult(services as SupplierService[])
  } catch (error) {
    return handleActionError(error)
  }
}

export const getSupplierServices = withCompany(_getSupplierServices)

/**
 * Buscar um serviço específico
 */
async function _getSupplierService(
  { company }: CompanyContext,
  serviceId: string
): Promise<ActionResult<SupplierService | null>> {
  try {
    await validateId(serviceId)
    
    // Buscar o supplier associado à company
    const supplier = await prisma.supplier.findUnique({
      where: { companyId: company.id }
    })

    if (!supplier) {
      return { success: false, error: 'Fornecedor não encontrado' }
    }

    const service = await prisma.supplierService.findFirst({
      where: {
        id: serviceId,
        supplierId: supplier.id
      }
    })

    return createSuccessResult(service as SupplierService | null)
  } catch (error) {
    return handleActionError(error)
  }
}

export const getSupplierService = withCompany(_getSupplierService)

/**
 * Criar novo serviço
 */
async function _createSupplierService(
  { company }: CompanyContext,
  serviceData: Omit<SupplierService, 'id' | 'supplierId' | 'createdAt' | 'updatedAt'>
): Promise<ActionResult<SupplierService>> {
  try {
    const validatedData = await validateData(SupplierServiceSchema, serviceData)
    
    // Buscar o supplier associado à company
    const supplier = await prisma.supplier.findUnique({
      where: { companyId: company.id }
    })

    if (!supplier) {
      return { success: false, error: 'Fornecedor não encontrado' }
    }

    const service = await prisma.supplierService.create({
      data: {
        ...validatedData,
        supplierId: supplier.id,
        images: validatedData.images as Prisma.InputJsonValue,
        specifications: validatedData.specifications as Prisma.InputJsonValue
      }
    })

    revalidatePath('/supplier-products')
    return createSuccessResult(service as SupplierService)
  } catch (error) {
    return handleActionError(error)
  }
}

export const createSupplierService = withCompany(_createSupplierService)

/**
 * Atualizar serviço
 */
async function _updateSupplierService(
  { company }: CompanyContext,
  serviceId: string,
  serviceData: Partial<Omit<SupplierService, 'id' | 'supplierId' | 'createdAt' | 'updatedAt'>>
): Promise<ActionResult<SupplierService>> {
  try {
    await validateId(serviceId)
    const validatedData = await validateData(SupplierServiceSchema.partial(), serviceData)
    
    // Buscar o supplier associado à company
    const supplier = await prisma.supplier.findUnique({
      where: { companyId: company.id }
    })

    if (!supplier) {
      return { success: false, error: 'Fornecedor não encontrado' }
    }

    // Verificar se o serviço pertence ao fornecedor
    const existingService = await prisma.supplierService.findFirst({
      where: {
        id: serviceId,
        supplierId: supplier.id
      }
    })

    if (!existingService) {
      return { success: false, error: 'Serviço não encontrado' }
    }

    const service = await prisma.supplierService.update({
      where: { id: serviceId },
      data: {
        ...validatedData,
        images: validatedData.images as Prisma.InputJsonValue,
        specifications: validatedData.specifications as Prisma.InputJsonValue
      }
    })

    revalidatePath('/supplier-products')
    return createSuccessResult(service as SupplierService)
  } catch (error) {
    return handleActionError(error)
  }
}

export const updateSupplierService = withCompany(_updateSupplierService)

/**
 * Deletar serviço
 */
async function _deleteSupplierService(
  { company }: CompanyContext,
  serviceId: string
): Promise<ActionResult<void>> {
  try {
    await validateId(serviceId)
    
    // Buscar o supplier associado à company
    const supplier = await prisma.supplier.findUnique({
      where: { companyId: company.id }
    })

    if (!supplier) {
      return { success: false, error: 'Fornecedor não encontrado' }
    }

    // Verificar se o serviço pertence ao fornecedor
    const existingService = await prisma.supplierService.findFirst({
      where: {
        id: serviceId,
        supplierId: supplier.id
      }
    })

    if (!existingService) {
      return { success: false, error: 'Serviço não encontrado' }
    }

    await prisma.supplierService.delete({
      where: { id: serviceId }
    })

    revalidatePath('/supplier-products')
    return createSuccessResult(undefined)
  } catch (error) {
    return handleActionError(error)
  }
}

export const deleteSupplierService = withCompany(_deleteSupplierService)

/**
 * Ativar/desativar serviço
 */
async function _toggleSupplierServiceStatus(
  { company }: CompanyContext,
  serviceId: string,
  isActive: boolean
): Promise<ActionResult<SupplierService>> {
  try {
    await validateId(serviceId)
    
    // Buscar o supplier associado à company
    const supplier = await prisma.supplier.findUnique({
      where: { companyId: company.id }
    })

    if (!supplier) {
      return { success: false, error: 'Fornecedor não encontrado' }
    }

    // Verificar se o serviço pertence ao fornecedor
    const existingService = await prisma.supplierService.findFirst({
      where: {
        id: serviceId,
        supplierId: supplier.id
      }
    })

    if (!existingService) {
      return { success: false, error: 'Serviço não encontrado' }
    }

    const service = await prisma.supplierService.update({
      where: { id: serviceId },
      data: { isActive }
    })

    revalidatePath('/supplier-products')
    return createSuccessResult(service as SupplierService)
  } catch (error) {
    return handleActionError(error)
  }
}

export const toggleSupplierServiceStatus = withCompany(_toggleSupplierServiceStatus)

// ================== ESTOQUE =====================

interface AdjustStockParams {
  serviceId: string
  delta: number // positivo entrada, negativo saída
  reason?: string
  reference?: string
  metadata?: Record<string, unknown>
}

interface ReserveStockParams {
  serviceId: string
  quantity: number
  reference: string // ex: phone ou cart key
  metadata?: Record<string, unknown>
}

type ReleaseStockParams = ReserveStockParams

type StockMovementKind = 'ADJUSTMENT' | 'RESERVATION' | 'RELEASE' | 'CONSUMPTION' | 'CANCELLATION' | 'CORRECTION'

async function _recordStockMovement(serviceId: string, type: StockMovementKind, quantities: {
  stockBefore: number
  stockAfter: number
  reservedBefore: number
  reservedAfter: number
}, payload: { reason?: string; reference?: string; metadata?: Record<string, unknown> }) {
  await prisma.supplierServiceStockMovement.create({
    data: {
      serviceId,
  type,
      quantity: (quantities.stockAfter - quantities.stockBefore) + (quantities.reservedAfter - quantities.reservedBefore),
      stockBefore: quantities.stockBefore,
      stockAfter: quantities.stockAfter,
      reservedBefore: quantities.reservedBefore,
      reservedAfter: quantities.reservedAfter,
      reason: payload.reason,
      reference: payload.reference,
      metadata: payload.metadata as Prisma.InputJsonValue
    }
  })
}

async function _adjustStock({ company }: CompanyContext, params: AdjustStockParams): Promise<ActionResult<SupplierService>> {
  try {
    const { serviceId, delta, reason, reference, metadata } = params
    await validateId(serviceId)
    const supplier = await prisma.supplier.findUnique({ where: { companyId: company.id } })
    if (!supplier) return { success: false, error: 'Fornecedor não encontrado' }
    const service = await prisma.supplierService.findFirst({ where: { id: serviceId, supplierId: supplier.id } })
    if (!service) return { success: false, error: 'Serviço não encontrado' }
    if (!service.trackStock) return { success: false, error: 'Serviço não controla estoque' }
    const newStock = service.stockQuantity + delta
    if (newStock < 0) return { success: false, error: 'Estoque resultante negativo' }
    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.supplierService.update({
        where: { id: service.id },
        data: { stockQuantity: newStock }
      })
      await _recordStockMovement(service.id, 'ADJUSTMENT', {
        stockBefore: service.stockQuantity,
        stockAfter: newStock,
        reservedBefore: service.reservedQuantity,
        reservedAfter: service.reservedQuantity
      }, { reason, reference, metadata })
      return upd
    })
    return createSuccessResult(updated as SupplierService)
  } catch (error) {
    return handleActionError(error)
  }
}

async function _reserveStock({ company }: CompanyContext, params: ReserveStockParams): Promise<ActionResult<SupplierService>> {
  try {
    const { serviceId, quantity, reference, metadata } = params
    await validateId(serviceId)
    if (quantity <= 0) return { success: false, error: 'Quantidade inválida' }
    const supplier = await prisma.supplier.findUnique({ where: { companyId: company.id } })
    if (!supplier) return { success: false, error: 'Fornecedor não encontrado' }
    const service = await prisma.supplierService.findFirst({ where: { id: serviceId, supplierId: supplier.id } })
    if (!service) return { success: false, error: 'Serviço não encontrado' }
    if (!service.trackStock) return { success: false, error: 'Serviço não controla estoque' }
    const available = service.stockQuantity - service.reservedQuantity
    if (!service.allowBackorder && quantity > available) {
      return { success: false, error: 'Estoque insuficiente' }
    }
    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.supplierService.update({
        where: { id: service.id },
        data: { reservedQuantity: service.reservedQuantity + quantity }
      })
      await _recordStockMovement(service.id, 'RESERVATION', {
        stockBefore: service.stockQuantity,
        stockAfter: service.stockQuantity,
        reservedBefore: service.reservedQuantity,
        reservedAfter: service.reservedQuantity + quantity
      }, { reason: 'Reserva carrinho', reference, metadata })
      return upd
    })
    return createSuccessResult(updated as SupplierService)
  } catch (error) {
    return handleActionError(error)
  }
}

async function _releaseStock({ company }: CompanyContext, params: ReleaseStockParams): Promise<ActionResult<SupplierService>> {
  try {
    const { serviceId, quantity, reference, metadata } = params
    await validateId(serviceId)
    if (quantity <= 0) return { success: false, error: 'Quantidade inválida' }
    const supplier = await prisma.supplier.findUnique({ where: { companyId: company.id } })
    if (!supplier) return { success: false, error: 'Fornecedor não encontrado' }
    const service = await prisma.supplierService.findFirst({ where: { id: serviceId, supplierId: supplier.id } })
    if (!service) return { success: false, error: 'Serviço não encontrado' }
    if (!service.trackStock) return { success: false, error: 'Serviço não controla estoque' }
    if (quantity > service.reservedQuantity) return { success: false, error: 'Quantidade maior que reservado' }
    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.supplierService.update({
        where: { id: service.id },
        data: { reservedQuantity: service.reservedQuantity - quantity }
      })
      await _recordStockMovement(service.id, 'RELEASE', {
        stockBefore: service.stockQuantity,
        stockAfter: service.stockQuantity,
        reservedBefore: service.reservedQuantity,
        reservedAfter: service.reservedQuantity - quantity
      }, { reason: 'Liberação carrinho', reference, metadata })
      return upd
    })
    return createSuccessResult(updated as SupplierService)
  } catch (error) {
    return handleActionError(error)
  }
}

async function _consumeReservation({ company }: CompanyContext, params: ReleaseStockParams): Promise<ActionResult<SupplierService>> {
  try {
    const { serviceId, quantity, reference, metadata } = params
    await validateId(serviceId)
    if (quantity <= 0) return { success: false, error: 'Quantidade inválida' }
    const supplier = await prisma.supplier.findUnique({ where: { companyId: company.id } })
    if (!supplier) return { success: false, error: 'Fornecedor não encontrado' }
    const service = await prisma.supplierService.findFirst({ where: { id: serviceId, supplierId: supplier.id } })
    if (!service) return { success: false, error: 'Serviço não encontrado' }
    if (!service.trackStock) return { success: false, error: 'Serviço não controla estoque' }
    if (quantity > service.reservedQuantity) return { success: false, error: 'Quantidade maior que reservado' }
    const newStock = Math.max(0, service.stockQuantity - quantity)
    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.supplierService.update({
        where: { id: service.id },
        data: {
          stockQuantity: newStock,
          reservedQuantity: service.reservedQuantity - quantity
        }
      })
      await _recordStockMovement(service.id, 'CONSUMPTION', {
        stockBefore: service.stockQuantity,
        stockAfter: newStock,
        reservedBefore: service.reservedQuantity,
        reservedAfter: service.reservedQuantity - quantity
      }, { reason: 'Consumo pedido', reference, metadata })
      return upd
    })
    return createSuccessResult(updated as SupplierService)
  } catch (error) {
    return handleActionError(error)
  }
}

export const adjustStock = withCompany(_adjustStock)
export const reserveStock = withCompany(_reserveStock)
export const releaseStock = withCompany(_releaseStock)
export const consumeReservation = withCompany(_consumeReservation)

// Ajuste manual de estoque (entrada ou saída) com motivo
interface ManualAdjustParams {
  serviceId: string
  delta: number
  reason?: string
}

async function _manualAdjustStock(ctx: CompanyContext, params: ManualAdjustParams) {
  return _adjustStock(ctx, { serviceId: params.serviceId, delta: params.delta, reason: params.reason || 'Ajuste manual' })
}

export const manualAdjustStock = withCompany(_manualAdjustStock)