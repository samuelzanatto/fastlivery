import { z } from 'zod'

/**
 * 🔒 Schemas de Validação de Segurança
 * 
 * Implementa validação rigorosa para todos os inputs do sistema
 * seguindo as melhores práticas OWASP para prevenção de injeção
 */

// ==========================================
// VALIDADORES BASE
// ==========================================

const sanitizedString = (minLength = 1, maxLength = 100) => 
  z.string()
    .min(minLength, `Mínimo ${minLength} caracteres`)
    .max(maxLength, `Máximo ${maxLength} caracteres`)
    .trim()
    .transform(val => val.replace(/[<>'"&]/g, '')) // Remove caracteres potencialmente perigosos

const brazilianPhone = () =>
  z.string()
    .regex(/^\(?([0-9]{2})\)?[-. ]?([0-9]{4,5})[-. ]?([0-9]{4})$/, 'Formato de telefone inválido')
    .transform(val => val.replace(/\D/g, '')) // Remove formatação

const slug = () =>
  z.string()
    .min(3, 'Slug muito curto')
    .max(50, 'Slug muito longo')
    .regex(/^[a-z0-9\-]+$/, 'Slug pode conter apenas letras minúsculas, números e hífen')
    .transform(val => val.toLowerCase())

const currency = () =>
  z.number()
    .min(0, 'Valor não pode ser negativo')
    .max(999999.99, 'Valor muito alto')
    .transform(val => Math.round(val * 100) / 100) // Precisão de centavos

const businessName = () =>
  z.string()
    .min(2, 'Nome muito curto')
    .max(100, 'Nome muito longo')
    .regex(/^[a-zA-Z0-9\s\-\.àáãâêéíóõôúç]+$/, 'Nome contém caracteres inválidos')
    .trim()

// ==========================================
// SCHEMAS DE NEGÓCIO
// ==========================================

export const createBusinessSchema = z.object({
  businessName: businessName(),
  businessPhone: brazilianPhone(),
  businessAddress: sanitizedString(10, 200),
  category: z.enum(['restaurant', 'food', 'grocery', 'pharmacy', 'other']),
  businessEmail: z.string().email().optional(),
  deliveryFee: currency().optional(),
  minimumOrder: currency().optional()
})

export const updateBusinessSchema = z.object({
  name: businessName().optional(),
  description: sanitizedString(0, 500).optional(),
  phone: brazilianPhone().optional(),
  address: sanitizedString(10, 200).optional(),
  city: sanitizedString(2, 50).optional(),
  state: z.string().length(2, 'Estado deve ter 2 caracteres').optional(),
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido').optional(),
  slug: slug().optional(),
  deliveryFee: currency().optional(),
  minimumOrder: currency().optional(),
  deliveryTime: z.number().min(10).max(180).optional(),
  acceptsDelivery: z.boolean().optional(),
  acceptsPickup: z.boolean().optional(),
  acceptsDineIn: z.boolean().optional()
})

export const createProductSchema = z.object({
  name: sanitizedString(1, 100),
  description: sanitizedString(0, 1000).optional(),
  price: currency(),
  categoryId: z.string().uuid('ID de categoria inválido'),
  isAvailable: z.boolean().default(true),
  businessId: z.string().uuid('ID de negócio inválido')
})

export const createCategorySchema = z.object({
  name: sanitizedString(1, 50),
  description: sanitizedString(0, 200).optional(),
  businessId: z.string().uuid('ID de negócio inválido'),
  parentId: z.string().uuid().optional(),
  order: z.number().min(0).max(999).default(0),
  isActive: z.boolean().default(true)
})

export const createEmployeeSchema = z.object({
  businessId: z.string().uuid('ID de negócio inválido'),
  email: z.string().email('Email inválido'),
  roleId: z.string().uuid('ID de role inválido'),
  name: sanitizedString(2, 100),
  notes: sanitizedString(0, 500).optional()
})

export const createRoleSchema = z.object({
  businessId: z.string().uuid('ID de negócio inválido'),
  name: sanitizedString(1, 50),
  description: sanitizedString(0, 200).optional(),
  permissions: z.array(z.object({
    resource: z.string().min(1),
    action: z.string().min(1),
    conditions: z.record(z.string(), z.any()).optional()
  })).optional()
})

export const createTableSchema = z.object({
  number: z.string()
    .min(1, 'Número da mesa é obrigatório')
    .max(10, 'Número da mesa muito longo')
    .regex(/^[A-Z0-9\-]+$/, 'Número da mesa pode conter apenas letras maiúsculas, números e hífen'),
  capacity: z.number()
    .min(1, 'Capacidade mínima é 1')
    .max(20, 'Capacidade máxima é 20')
    .default(4)
})

export const updateTableSchema = z.object({
  number: z.string()
    .min(1, 'Número da mesa é obrigatório')
    .max(10, 'Número da mesa muito longo')
    .regex(/^[A-Z0-9\-]+$/, 'Número da mesa pode conter apenas letras maiúsculas, números e hífen')
    .optional(),
  capacity: z.number()
    .min(1, 'Capacidade mínima é 1')
    .max(20, 'Capacidade máxima é 20')
    .optional(),
  status: z.enum(['vacant', 'occupied', 'reserved']).optional()
})

// ==========================================
// SCHEMAS DE PAGAMENTO
// ==========================================

export const mercadoPagoConfigSchema = z.object({
  accessToken: z.string()
    .min(1, 'Access token é obrigatório')
    .regex(/^(TEST-|APP_USR-)[A-Za-z0-9\-_]+$/, 'Formato de access token inválido'),
  publicKey: z.string()
    .min(1, 'Public key é obrigatória')
    .regex(/^(TEST-|APP_USR-)[A-Za-z0-9\-_]+$/, 'Formato de public key inválido')
})

// ==========================================
// SCHEMAS DE AUTENTICAÇÃO
// ==========================================

export const signupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(128, 'Senha muito longa')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Senha deve conter pelo menos: 1 minúscula, 1 maiúscula, 1 número e 1 símbolo'),
  name: sanitizedString(2, 100),
  phone: brazilianPhone().optional()
})

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
})

export const otpSchema = z.object({
  email: z.string().email('Email inválido'),
  otp: z.string()
    .length(6, 'OTP deve ter 6 dígitos')
    .regex(/^\d{6}$/, 'OTP deve conter apenas números')
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string()
    .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
    .max(128, 'Nova senha muito longa')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Nova senha deve conter pelo menos: 1 minúscula, 1 maiúscula, 1 número e 1 símbolo')
})

// ==========================================
// SCHEMAS DE CUSTOMER
// ==========================================

export const createAddressSchema = z.object({
  street: sanitizedString(5, 100),
  number: sanitizedString(1, 10),
  complement: sanitizedString(0, 50).optional(),
  neighborhood: sanitizedString(2, 50),
  city: sanitizedString(2, 50),
  state: z.string().length(2, 'Estado deve ter 2 caracteres'),
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
  isDefault: z.boolean().default(false)
})

// ==========================================
// VALIDADORES DE RUNTIME
// ==========================================

export function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

export function sanitizeFilename(filename: string): string {
  return filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9\-._]/g, '') // Remove caracteres especiais
    .substring(0, 100) // Limita tamanho
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024 // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de arquivo não permitido. Use JPEG, PNG ou WebP.' }
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'Arquivo muito grande. Máximo 5MB.' }
  }
  
  return { valid: true }
}

// ==========================================
// TIPOS TYPESCRIPT
// ==========================================

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>
export type CreateProductInput = z.infer<typeof createProductSchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>
export type CreateRoleInput = z.infer<typeof createRoleSchema>
export type CreateTableInput = z.infer<typeof createTableSchema>
export type UpdateTableInput = z.infer<typeof updateTableSchema>
export type MercadoPagoConfigInput = z.infer<typeof mercadoPagoConfigSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type OtpInput = z.infer<typeof otpSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type CreateAddressInput = z.infer<typeof createAddressSchema>