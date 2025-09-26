import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema } from 'zod'
import { createSanitizedLogger } from './sanitize'

const logger = createSanitizedLogger('VALIDATION')

/**
 * 🔒 Middleware de Validação Segura
 * 
 * Implementa validação rigorosa usando Zod e sanitização automática
 */

interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: ValidationError
}

interface ValidationError {
  message: string
  issues: Array<{
    field: string
    message: string
    code: string
  }>
}

/**
 * Valida request body usando schema Zod
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)
    
    if (result.success) {
      return {
        success: true,
        data: result.data
      }
    }
    
    const validationError: ValidationError = {
      message: 'Dados de entrada inválidos',
      issues: result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }))
    }
    
    logger.warn('Request validation failed', {
      url: request.url,
      method: request.method,
      issues: validationError.issues,
      userAgent: request.headers.get('user-agent'),
      ip: getClientIP(request)
    })
    
    return {
      success: false,
      error: validationError
    }
    
  } catch (error) {
    logger.error('Failed to parse request body', error)
    
    return {
      success: false,
      error: {
        message: 'Formato de dados inválido - JSON esperado',
        issues: [{
          field: 'body',
          message: 'Corpo da requisição deve ser um JSON válido',
          code: 'invalid_json'
        }]
      }
    }
  }
}

/**
 * Valida query parameters usando schema Zod
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams.entries())
    
    const result = schema.safeParse(params)
    
    if (result.success) {
      return {
        success: true,
        data: result.data
      }
    }
    
    const validationError: ValidationError = {
      message: 'Parâmetros de consulta inválidos',
      issues: result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }))
    }
    
    logger.warn('Query params validation failed', {
      url: request.url,
      method: request.method,
      issues: validationError.issues
    })
    
    return {
      success: false,
      error: validationError
    }
    
  } catch (error) {
    logger.error('Failed to validate query params', error)
    
    return {
      success: false,
      error: {
        message: 'Erro interno na validação',
        issues: [{
          field: 'query',
          message: 'Erro ao processar parâmetros de consulta',
          code: 'internal_error'
        }]
      }
    }
  }
}

/**
 * Valida route parameters (ex: /api/users/[id])
 */
export function validateRouteParams<T>(
  params: Record<string, string>,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const result = schema.safeParse(params)
    
    if (result.success) {
      return {
        success: true,
        data: result.data
      }
    }
    
    const validationError: ValidationError = {
      message: 'Parâmetros de rota inválidos',
      issues: result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }))
    }
    
    return {
      success: false,
      error: validationError
    }
    
  } catch {
    return {
      success: false,
      error: {
        message: 'Erro interno na validação',
        issues: [{
          field: 'params',
          message: 'Erro ao processar parâmetros de rota',
          code: 'internal_error'
        }]
      }
    }
  }
}

/**
 * Cria response de erro padronizado para validação
 */
export function createValidationErrorResponse(error: ValidationError): NextResponse {
  return NextResponse.json(
    {
      error: error.message,
      code: 'VALIDATION_ERROR',
      issues: error.issues,
      timestamp: new Date().toISOString()
    },
    { 
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'X-Validation-Error': 'true'
      }
    }
  )
}

/**
 * Wrapper para handlers de API com validação automática
 */
export function withValidation<TBody = unknown, TQuery = unknown, TParams = unknown>(
  handler: (
    request: NextRequest,
    validated: {
      body?: TBody
      query?: TQuery
      params?: TParams
    }
  ) => Promise<NextResponse>,
  schemas: {
    body?: ZodSchema<TBody>
    query?: ZodSchema<TQuery>
    params?: ZodSchema<TParams>
  } = {}
) {
  return async (
    request: NextRequest,
    context?: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    try {
      const validated: {
        body?: TBody
        query?: TQuery
        params?: TParams
      } = {}

      // Validar body se schema fornecido
      if (schemas.body && (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH')) {
        const bodyValidation = await validateRequestBody(request, schemas.body)
        if (!bodyValidation.success) {
          return createValidationErrorResponse(bodyValidation.error!)
        }
        validated.body = bodyValidation.data
      }

      // Validar query params se schema fornecido
      if (schemas.query) {
        const queryValidation = validateQueryParams(request, schemas.query)
        if (!queryValidation.success) {
          return createValidationErrorResponse(queryValidation.error!)
        }
        validated.query = queryValidation.data
      }

      // Validar route params se schema fornecido
      if (schemas.params && context?.params) {
        const params = await context.params
        const paramsValidation = validateRouteParams(params, schemas.params)
        if (!paramsValidation.success) {
          return createValidationErrorResponse(paramsValidation.error!)
        }
        validated.params = paramsValidation.data
      }

      // Executar handler com dados validados
      return await handler(request, validated)
      
    } catch (error) {
      logger.error('Handler execution failed', error)
      
      return NextResponse.json(
        {
          error: 'Erro interno do servidor',
          code: 'INTERNAL_SERVER_ERROR',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Validação de upload de arquivos
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSize?: number
    allowedTypes?: string[]
    maxFiles?: number
  } = {}
): ValidationResult<File> {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
    maxFiles: _maxFiles = 1
  } = options

  // Verificar tipo de arquivo
  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: {
        message: 'Tipo de arquivo não permitido',
        issues: [{
          field: 'file.type',
          message: `Tipos permitidos: ${allowedTypes.join(', ')}`,
          code: 'invalid_file_type'
        }]
      }
    }
  }

  // Verificar tamanho
  if (file.size > maxSize) {
    return {
      success: false,
      error: {
        message: 'Arquivo muito grande',
        issues: [{
          field: 'file.size',
          message: `Tamanho máximo: ${Math.round(maxSize / 1024 / 1024)}MB`,
          code: 'file_too_large'
        }]
      }
    }
  }

  // Verificar nome do arquivo
  if (!file.name || file.name.length > 255) {
    return {
      success: false,
      error: {
        message: 'Nome de arquivo inválido',
        issues: [{
          field: 'file.name',
          message: 'Nome deve ter entre 1 e 255 caracteres',
          code: 'invalid_filename'
        }]
      }
    }
  }

  return {
    success: true,
    data: file
  }
}

/**
 * Obtém IP do cliente de forma segura
 */
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('cf-connecting-ip') ||
    request.nextUrl.hostname ||
    'unknown'
  )
}

/**
 * Verifica se string contém apenas caracteres seguros
 */
export function isSafeString(str: string): boolean {
  // Permite apenas letras, números, espaços e alguns símbolos seguros
  const safePattern = /^[a-zA-Z0-9\s\-_.,!?()\[\]àáãâêéíóõôúçÀÁÃÂÊÉÍÓÕÔÚÇ]*$/
  return safePattern.test(str)
}

/**
 * Remove caracteres potencialmente perigosos
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>&"']/g, '') // Remove caracteres HTML/XML perigosos
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
}

/**
 * Validação de rate limiting por IP
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  request: NextRequest,
  limit: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutos
): { allowed: boolean; remaining: number } {
  const ip = getClientIP(request)
  const now = Date.now()
  const key = `${ip}:validation`
  
  let entry = rateLimitStore.get(key)
  
  // Resetar se janela expirou
  if (!entry || entry.resetTime <= now) {
    entry = { count: 0, resetTime: now + windowMs }
  }
  
  entry.count++
  rateLimitStore.set(key, entry)
  
  const allowed = entry.count <= limit
  const remaining = Math.max(0, limit - entry.count)
  
  return { allowed, remaining }
}