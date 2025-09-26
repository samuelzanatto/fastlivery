/**
 * 🔒 Sistema de Sanitização de Dados Sensíveis
 * 
 * Implementa sanitização rigorosa para logs e respostas
 * prevenindo vazamento de dados sensíveis
 */

// Campos considerados sensíveis que devem ser mascarados
const SENSITIVE_FIELDS = [
  'password', 'token', 'secret', 'key', 'accessToken', 'refreshToken',
  'privateKey', 'signature', 'hash', 'salt', 'otp', 'code',
  'stripeCustomerId', 'mercadoPagoAccessToken', 'webhookSecret',
  'better_auth_secret', 'smtp_pass', 'credentials'
]

// Campos que devem ser parcialmente mascarados
const PARTIAL_MASK_FIELDS = [
  'email', 'phone', 'cpf', 'cnpj', 'cardNumber', 'document'
]

interface SanitizeOptions {
  maskEmails?: boolean
  maskPhones?: boolean
  deep?: boolean // Sanitizar objetos aninhados
  excludeFields?: string[]
}

/**
 * Sanitiza objeto removendo/mascarando dados sensíveis
 */
export function sanitizeForLog(data: unknown, options: SanitizeOptions = {}): unknown {
  const { 
    maskEmails = true, 
    maskPhones = true, 
    deep = true,
    excludeFields = []
  } = options

  if (data === null || data === undefined) return data
  
  // Tipos primitivos
  if (typeof data !== 'object') return data
  
  // Arrays
  if (Array.isArray(data)) {
    return deep ? data.map(item => sanitizeForLog(item, options)) : '[...Array]'
  }
  
  // Objetos
  const sanitized: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(data)) {
    // Pular campos excluídos
    if (excludeFields.includes(key)) {
      continue
    }
    
    // Campos completamente sensíveis - mascarar completamente
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '***MASKED***'
      continue
    }
    
    // Campos parcialmente sensíveis
    if (PARTIAL_MASK_FIELDS.includes(key.toLowerCase())) {
      if (key.toLowerCase() === 'email' && maskEmails) {
        sanitized[key] = maskEmail(String(value))
      } else if (key.toLowerCase() === 'phone' && maskPhones) {
        sanitized[key] = maskPhone(String(value))
      } else if (key.toLowerCase().includes('cpf')) {
        sanitized[key] = maskCPF(String(value))
      } else if (key.toLowerCase().includes('cnpj')) {
        sanitized[key] = maskCNPJ(String(value))
      } else {
        sanitized[key] = maskGeneric(String(value))
      }
      continue
    }
    
    // Recursão para objetos aninhados
    if (deep && typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLog(value, options)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

/**
 * Mascara email preservando domínio
 * exemplo@teste.com -> ex***@teste.com
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '***INVALID***'
  
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***INVALID***'
  
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`
  }
  
  return `${local.substring(0, 2)}***@${domain}`
}

/**
 * Mascara telefone preservando DDD
 * (11) 99999-9999 -> (11) 9****-****
 */
export function maskPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '***INVALID***'
  
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length < 8) return '***INVALID***'
  
  if (cleaned.length === 11) {
    // Celular: (11) 99999-9999 -> (11) 9****-****
    return `(${cleaned.substring(0, 2)}) ${cleaned[2]}****-****`
  } else if (cleaned.length === 10) {
    // Fixo: (11) 9999-9999 -> (11) 9***-****
    return `(${cleaned.substring(0, 2)}) ${cleaned[2]}***-****`
  }
  
  return '***MASKED***'
}

/**
 * Mascara CPF
 * 123.456.789-00 -> 123.***.**-00
 */
export function maskCPF(cpf: string): string {
  if (!cpf || typeof cpf !== 'string') return '***INVALID***'
  
  const cleaned = cpf.replace(/\D/g, '')
  if (cleaned.length !== 11) return '***INVALID***'
  
  return `${cleaned.substring(0, 3)}.***.**-${cleaned.substring(9)}`
}

/**
 * Mascara CNPJ  
 * Exemplo de uso para mascarar CNPJ
 */
export function maskCNPJ(cnpj: string): string {
  if (!cnpj || typeof cnpj !== 'string') return '***INVALID***'
  
  const cleaned = cnpj.replace(/\D/g, '')
  if (cleaned.length !== 14) return '***INVALID***'
  
  return `${cleaned.substring(0, 2)}.***.***/***1-${cleaned.substring(12)}`
}

/**
 * Mascara genérico para outros campos
 */
export function maskGeneric(value: string, showFirst = 2, showLast = 2): string {
  if (!value || typeof value !== 'string') return '***INVALID***'
  
  if (value.length <= showFirst + showLast) {
    return '*'.repeat(value.length)
  }
  
  const first = value.substring(0, showFirst)
  const last = value.substring(value.length - showLast)
  const middle = '*'.repeat(Math.max(3, value.length - showFirst - showLast))
  
  return `${first}${middle}${last}`
}

/**
 * Sanitiza URL removendo parâmetros sensíveis
 */
export function sanitizeURL(url: string): string {
  if (!url || typeof url !== 'string') return '***INVALID***'
  
  try {
    const urlObj = new URL(url)
    
    // Parâmetros sensíveis que devem ser removidos/mascarados
    const sensitiveParams = [
      'token', 'key', 'secret', 'password', 'auth', 'authorization',
      'access_token', 'refresh_token', 'api_key', 'signature'
    ]
    
    sensitiveParams.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '***MASKED***')
      }
    })
    
    return urlObj.toString()
  } catch {
    return '***INVALID_URL***'
  }
}

/**
 * Sanitiza headers HTTP removendo dados sensíveis
 */
export function sanitizeHeaders(headers: Record<string, string> | Headers): Record<string, string> {
  const result: Record<string, string> = {}
  
  const headerEntries = headers instanceof Headers 
    ? Array.from(headers.entries())
    : Object.entries(headers)
  
  for (const [key, value] of headerEntries) {
    const lowerKey = key.toLowerCase()
    
    // Headers sensíveis que devem ser mascarados
    if (
      lowerKey.includes('authorization') ||
      lowerKey.includes('cookie') ||
      lowerKey.includes('token') ||
      lowerKey.includes('key') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('signature')
    ) {
      result[key] = '***MASKED***'
    } else {
      result[key] = value
    }
  }
  
  return result
}

/**
 * Cria logger com sanitização automática
 */
export function createSanitizedLogger(namespace: string) {
  return {
    info: (message: string, data?: unknown) => {
      console.log(`[${namespace}] ${message}`, data ? sanitizeForLog(data) : '')
    },
    
    warn: (message: string, data?: unknown) => {
      console.warn(`[${namespace}] ${message}`, data ? sanitizeForLog(data) : '')
    },
    
    error: (message: string, error?: unknown) => {
      if (error instanceof Error) {
        console.error(`[${namespace}] ${message}`, {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : 'REDACTED'
        })
      } else {
        console.error(`[${namespace}] ${message}`, error ? sanitizeForLog(error) : '')
      }
    },
    
    debug: (message: string, data?: unknown) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[${namespace}] ${message}`, data ? sanitizeForLog(data) : '')
      }
    }
  }
}

/**
 * Sanitiza resposta de API removendo campos sensíveis
 */
export function sanitizeApiResponse(data: unknown): unknown {
  return sanitizeForLog(data, {
    maskEmails: false, // Emails podem ser mostrados em responses
    maskPhones: false, // Telefones podem ser mostrados em responses
    excludeFields: ['id', 'createdAt', 'updatedAt'] // Manter campos técnicos
  })
}

/**
 * Utilitário para mascarar dados em error responses
 */
export function createSafeErrorResponse(error: Error | string, additionalData?: Record<string, unknown>) {
  const baseError = {
    message: typeof error === 'string' ? error : error.message,
    timestamp: new Date().toISOString()
  }
  
  if (additionalData) {
    const sanitizedData = sanitizeForLog(additionalData) as Record<string, unknown>
    return {
      ...baseError,
      ...sanitizedData
    }
  }
  
  return baseError
}

// Instância global do logger sanitizado
export const secureLogger = createSanitizedLogger('SECURITY')