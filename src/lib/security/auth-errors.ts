import { NextResponse } from 'next/server'

// Códigos padronizados de erro para autenticação
export const AUTH_ERROR_CODES = {
  // Autenticação
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  
  // Autorização
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ROLE_NOT_ALLOWED: 'ROLE_NOT_ALLOWED',
  RESOURCE_FORBIDDEN: 'RESOURCE_FORBIDDEN',
  
  // Validação
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_EMAIL_FORMAT: 'INVALID_EMAIL_FORMAT',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  
  // OTP/Verificação
  INVALID_OTP: 'INVALID_OTP',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_ALREADY_USED: 'OTP_ALREADY_USED',
  TOO_MANY_OTP_ATTEMPTS: 'TOO_MANY_OTP_ATTEMPTS',
  
  // Usuário
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_INACTIVE: 'USER_INACTIVE',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // Sistema
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR'
} as const

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES]

// Mapeamento de códigos para mensagens user-friendly
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  // Autenticação
  UNAUTHORIZED: 'Acesso não autorizado. Faça login novamente.',
  INVALID_CREDENTIALS: 'Email ou senha incorretos.',
  SESSION_EXPIRED: 'Sua sessão expirou. Faça login novamente.',
  SESSION_NOT_FOUND: 'Sessão não encontrada. Faça login novamente.',
  
  // Autorização
  INSUFFICIENT_PERMISSIONS: 'Você não tem permissão para realizar esta ação.',
  ROLE_NOT_ALLOWED: 'Seu perfil não tem acesso a este recurso.',
  RESOURCE_FORBIDDEN: 'Acesso negado a este recurso.',
  
  // Validação
  INVALID_INPUT: 'Dados inválidos fornecidos.',
  MISSING_REQUIRED_FIELD: 'Campos obrigatórios não preenchidos.',
  INVALID_EMAIL_FORMAT: 'Formato de email inválido.',
  WEAK_PASSWORD: 'A senha deve ter pelo menos 8 caracteres, incluindo letras e números.',
  
  // OTP/Verificação
  INVALID_OTP: 'Código de verificação inválido.',
  OTP_EXPIRED: 'Código de verificação expirado. Solicite um novo.',
  OTP_ALREADY_USED: 'Este código já foi utilizado.',
  TOO_MANY_OTP_ATTEMPTS: 'Muitas tentativas de verificação. Aguarde antes de tentar novamente.',
  
  // Usuário
  USER_NOT_FOUND: 'Usuário não encontrado.',
  USER_ALREADY_EXISTS: 'Usuário já existe com este email.',
  USER_INACTIVE: 'Conta inativa. Entre em contato com o suporte.',
  EMAIL_NOT_VERIFIED: 'Email não verificado. Verifique sua caixa de entrada.',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
  TOO_MANY_REQUESTS: 'Limite de requisições excedido. Tente novamente mais tarde.',
  
  // Sistema
  INTERNAL_ERROR: 'Erro interno do servidor. Tente novamente.',
  DATABASE_ERROR: 'Erro na base de dados. Tente novamente.',
  EXTERNAL_SERVICE_ERROR: 'Serviço temporariamente indisponível.',
  CONFIGURATION_ERROR: 'Erro de configuração do sistema.'
}

// Status HTTP para cada tipo de erro
export const AUTH_ERROR_STATUS: Record<AuthErrorCode, number> = {
  // Autenticação - 401
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  SESSION_EXPIRED: 401,
  SESSION_NOT_FOUND: 401,
  
  // Autorização - 403
  INSUFFICIENT_PERMISSIONS: 403,
  ROLE_NOT_ALLOWED: 403,
  RESOURCE_FORBIDDEN: 403,
  
  // Validação - 400
  INVALID_INPUT: 400,
  MISSING_REQUIRED_FIELD: 400,
  INVALID_EMAIL_FORMAT: 400,
  WEAK_PASSWORD: 400,
  
  // OTP/Verificação - 400
  INVALID_OTP: 400,
  OTP_EXPIRED: 400,
  OTP_ALREADY_USED: 400,
  TOO_MANY_OTP_ATTEMPTS: 429,
  
  // Usuário - 404/409
  USER_NOT_FOUND: 404,
  USER_ALREADY_EXISTS: 409,
  USER_INACTIVE: 403,
  EMAIL_NOT_VERIFIED: 403,
  
  // Rate Limiting - 429
  RATE_LIMIT_EXCEEDED: 429,
  TOO_MANY_REQUESTS: 429,
  
  // Sistema - 500
  INTERNAL_ERROR: 500,
  DATABASE_ERROR: 500,
  EXTERNAL_SERVICE_ERROR: 503,
  CONFIGURATION_ERROR: 500
}

export interface AuthError {
  code: AuthErrorCode
  message: string
  details?: unknown
  timestamp: string
  traceId?: string
}

export interface AuthErrorContext {
  userId?: string
  email?: string
  ip?: string
  userAgent?: string
  route?: string
  action?: string
}

/**
 * Cria um erro padronizado de autenticação
 */
export function createAuthError(
  code: AuthErrorCode,
  details?: unknown,
  context?: AuthErrorContext
): AuthError {
  const error: AuthError = {
    code,
    message: AUTH_ERROR_MESSAGES[code],
    timestamp: new Date().toISOString(),
    traceId: generateTraceId()
  }
  
  if (details) {
    error.details = details
  }
  
  // Log estruturado do erro
  console.error('[AUTH-ERROR]', {
    ...error,
    context,
    severity: getErrorSeverity(code)
  })
  
  return error
}

/**
 * Cria uma resposta HTTP com erro padronizado
 */
export function createAuthErrorResponse(
  code: AuthErrorCode,
  details?: unknown,
  context?: AuthErrorContext,
  headers?: Record<string, string>
): NextResponse {
  const error = createAuthError(code, details, context)
  const status = AUTH_ERROR_STATUS[code]
  
  return NextResponse.json(
    {
      success: false,
      error: error.message,
      code: error.code,
      timestamp: error.timestamp,
      traceId: error.traceId
    },
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }
  )
}

/**
 * Determina a severidade do erro para logging
 */
function getErrorSeverity(code: AuthErrorCode): 'low' | 'medium' | 'high' | 'critical' {
  const criticalErrors = ['INTERNAL_ERROR', 'DATABASE_ERROR', 'CONFIGURATION_ERROR']
  const highErrors = ['UNAUTHORIZED', 'INSUFFICIENT_PERMISSIONS', 'USER_INACTIVE']
  const mediumErrors = ['INVALID_CREDENTIALS', 'SESSION_EXPIRED', 'RATE_LIMIT_EXCEEDED']
  
  if (criticalErrors.includes(code)) return 'critical'
  if (highErrors.includes(code)) return 'high'
  if (mediumErrors.includes(code)) return 'medium'
  return 'low'
}

/**
 * Gera um ID único para rastreamento de erros
 */
function generateTraceId(): string {
  return `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Wrapper para capturar e padronizar erros de banco de dados
 */
export function handleDatabaseError(error: unknown, context?: AuthErrorContext): AuthError {
  console.error('[DATABASE-ERROR]', error)
  
  // Detectar tipos específicos de erro do Prisma
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const prismaError = error as { code: string; meta?: unknown }
    
    switch (prismaError.code) {
      case 'P2002': // Unique constraint violation
        return createAuthError('USER_ALREADY_EXISTS', prismaError.meta, context)
      case 'P2025': // Record not found
        return createAuthError('USER_NOT_FOUND', prismaError.meta, context)
      default:
        return createAuthError('DATABASE_ERROR', prismaError, context)
    }
  }
  
  return createAuthError('DATABASE_ERROR', error, context)
}

/**
 * Wrapper para capturar erros do Better Auth
 */
export function handleBetterAuthError(error: unknown, context?: AuthErrorContext): AuthError {
  console.error('[BETTER-AUTH-ERROR]', error)
  
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: string }).message.toLowerCase()
    
    if (message.includes('invalid credentials') || message.includes('wrong password')) {
      return createAuthError('INVALID_CREDENTIALS', error, context)
    }
    
    if (message.includes('user not found')) {
      return createAuthError('USER_NOT_FOUND', error, context)
    }
    
    if (message.includes('invalid otp') || message.includes('wrong code')) {
      return createAuthError('INVALID_OTP', error, context)
    }
    
    if (message.includes('expired')) {
      return createAuthError('OTP_EXPIRED', error, context)
    }
  }
  
  return createAuthError('INTERNAL_ERROR', error, context)
}

/**
 * Valida formato de email
 */
export function validateEmail(email: string): { valid: boolean; error?: AuthError } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!email) {
    return { 
      valid: false, 
      error: createAuthError('MISSING_REQUIRED_FIELD', { field: 'email' })
    }
  }
  
  if (!emailRegex.test(email)) {
    return { 
      valid: false, 
      error: createAuthError('INVALID_EMAIL_FORMAT', { email })
    }
  }
  
  return { valid: true }
}

/**
 * Valida força da senha
 */
export function validatePassword(password: string): { valid: boolean; error?: AuthError } {
  if (!password) {
    return { 
      valid: false, 
      error: createAuthError('MISSING_REQUIRED_FIELD', { field: 'password' })
    }
  }
  
  if (password.length < 8) {
    return { 
      valid: false, 
      error: createAuthError('WEAK_PASSWORD', { reason: 'too_short', minLength: 8 })
    }
  }
  
  // Verificar se contém pelo menos uma letra e um número
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  
  if (!hasLetter || !hasNumber) {
    return { 
      valid: false, 
      error: createAuthError('WEAK_PASSWORD', { reason: 'missing_requirements' })
    }
  }
  
  return { valid: true }
}