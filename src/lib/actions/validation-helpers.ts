// Validation helpers para Server Actions
// Não é um arquivo de Server Actions - contém utilities

import { z } from 'zod'
import { ValidationError } from './auth-helpers'

/**
 * Schemas de validação comuns
 */
export const ProductSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  description: z.string().optional(),
  price: z.number().positive('Preço deve ser positivo'),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  image: z.string().optional(),
  isAvailable: z.boolean().default(true)
})

export const CategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(50, 'Nome muito longo'),
  description: z.string().optional(),
  order: z.number().int().nonnegative().optional(),
  isActive: z.boolean().default(true)
})

export const OrderSchema = z.object({
  businessId: z.string().min(1, 'ID da empresa é obrigatório'),
  type: z.enum(['DELIVERY', 'PICKUP', 'DINE_IN']),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
    notes: z.string().optional()
  })).min(1, 'Pelo menos um item é obrigatório'),
  customerName: z.string().min(1, 'Nome do cliente é obrigatório'),
  customerPhone: z.string().min(1, 'Telefone do cliente é obrigatório'),
  customerEmail: z.string().email().optional(),
  deliveryAddress: z.string().optional(),
  tableId: z.string().optional(),
  notes: z.string().optional()
})

export const TableSchema = z.object({
  number: z.string().min(1, 'Número da mesa é obrigatório'),
  qrCode: z.string().optional(),
  isOccupied: z.boolean().default(false),
  isReserved: z.boolean().default(false)
})

export const EmployeeSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo').optional(),
  roleId: z.string().min(1, 'Cargo é obrigatório'),
  notes: z.string().optional(),
  salary: z.number().positive('Salário deve ser positivo').optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional()
})

export const BusinessSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  description: z.string().optional(),
  address: z.string().min(1, 'Endereço é obrigatório'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().email('Email inválido'),
  deliveryFee: z.number().nonnegative('Taxa de entrega deve ser não negativa'),
  minimumOrder: z.number().nonnegative('Pedido mínimo deve ser não negativo'),
  acceptsDelivery: z.boolean().default(true),
  acceptsPickup: z.boolean().default(true),
  acceptsDineIn: z.boolean().default(true),
  openingHours: z.string().optional()
})

/**
 * Helper para validar dados usando schemas Zod
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      throw new ValidationError(firstError.message)
    }
    throw new ValidationError('Dados inválidos')
  }
}

/**
 * Helper para validar dados com resultado opcional
 */
export function safeValidateData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  error?: string
} {
  try {
    const validatedData = validateData(schema, data)
    return { success: true, data: validatedData }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof ValidationError ? error.message : 'Dados inválidos'
    }
  }
}

/**
 * Schemas para filtros e paginação
 */
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10)
})

export const OrderFiltersSchema = z.object({
  status: z.enum(['pending', 'preparing', 'ready', 'delivered', 'cancelled', 'all']).default('all'),
  type: z.enum(['delivery', 'pickup', 'dine-in', 'all']).default('all'),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional()
})

export const ProductFiltersSchema = z.object({
  categoryId: z.string().optional(),
  search: z.string().optional(),
  isAvailable: z.boolean().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional()
})

export const AddressSchema = z.object({
  street: z.string().min(1, 'Rua é obrigatória').max(255, 'Rua muito longa'),
  number: z.string().min(1, 'Número é obrigatório').max(50, 'Número muito longo'),
  complement: z.string().max(255, 'Complemento muito longo').optional(),
  neighborhood: z.string().min(1, 'Bairro é obrigatório').max(100, 'Bairro muito longo'),
  city: z.string().min(1, 'Cidade é obrigatória').max(100, 'Cidade muito longa'),
  state: z.string().min(2, 'Estado é obrigatório').max(50, 'Estado muito longo'),
  zipCode: z.string().min(8, 'CEP deve ter 8 dígitos').max(10, 'CEP inválido'),
  isDefault: z.boolean().default(false)
})

export const CustomerFiltersSchema = z.object({
  search: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  hasActiveOrders: z.boolean().optional()
})

export const BusinessUpdateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  description: z.string().max(500, 'Descrição muito longa').optional(),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  address: z.string().min(1, 'Endereço é obrigatório').max(255, 'Endereço muito longo'),
  avatar: z.string().url('URL do avatar inválida').optional(),
  banner: z.string().url('URL do banner inválida').optional(),
  isOpen: z.boolean().default(true),
  openingHours: z.string().max(500, 'Horários muito longos').optional(),
  deliveryFee: z.number().min(0, 'Taxa de entrega deve ser positiva').default(0),
  minimumOrder: z.number().min(0, 'Pedido mínimo deve ser positivo').default(0),
  deliveryTime: z.number().int().min(1, 'Tempo de entrega deve ser pelo menos 1 minuto').default(30),
  acceptsDelivery: z.boolean().default(true),
  acceptsPickup: z.boolean().default(true),
  acceptsDineIn: z.boolean().default(true),
  mercadoPagoAccessToken: z.string().optional(),
  mercadoPagoPublicKey: z.string().optional(),
  mercadoPagoConfigured: z.boolean().default(false)
})

/**
 * Helper para validar e formatar preços
 */
export function validatePrice(price: unknown): number {
  const numPrice = Number(price)
  
  if (isNaN(numPrice) || numPrice < 0) {
    throw new ValidationError('Preço inválido')
  }
  
  // Arredondar para 2 casas decimais
  return Math.round(numPrice * 100) / 100
}

/**
 * Helper para validar IDs do MongoDB/Prisma
 */
export function validateId(id: unknown, fieldName: string = 'ID'): string {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new ValidationError(`${fieldName} inválido`)
  }
  return id.trim()
}

/**
 * Helper para sanitizar strings
 */
export function sanitizeString(value: unknown, maxLength: number = 255): string {
  if (typeof value !== 'string') {
    return ''
  }
  
  return value.trim().slice(0, maxLength)
}

/**
 * Helper para validar formato de telefone brasileiro
 */
export function validateBrazilianPhone(phone: string): boolean {
  // Remove tudo que não é número
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Verifica se tem 10 ou 11 dígitos (com DDD)
  return /^(\d{10}|\d{11})$/.test(cleanPhone)
}

/**
 * Helper para formatar telefone brasileiro
 */
export function formatBrazilianPhone(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '')
  
  if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  } else if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  
  return phone
}