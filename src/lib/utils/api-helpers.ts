import { NextRequest, NextResponse } from 'next/server'

export type ApiHandler = (request: NextRequest) => Promise<NextResponse>

/**
 * Wrapper para endpoints de API que adiciona tratamento de erro padronizado
 * e logging consistente
 */
export function withErrorHandling(handler: ApiHandler, context: string): ApiHandler {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()
    
    try {
      console.log(`[${context}] Iniciando processamento da requisição`)
      
      const response = await handler(request)
      
      const duration = Date.now() - startTime
      const status = response.status
      
      console.log(`[${context}] Requisição finalizada em ${duration}ms com status ${status}`)
      
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      
      console.error(`[${context}] Erro após ${duration}ms:`, error)
      
      // Determinar tipo de erro e status apropriado
      let status = 500
      let message = 'Erro interno do servidor'
      let code = 'INTERNAL_ERROR'
      
      if (error instanceof Error) {
        // Erros específicos que podem ser expostos ao usuário
        if (error.message.includes('Prisma')) {
          message = 'Erro de banco de dados'
          code = 'DATABASE_ERROR'
        } else if (error.message.includes('validation')) {
          status = 400
          message = 'Dados inválidos'
          code = 'VALIDATION_ERROR'
        } else if (error.message.includes('authorization') || error.message.includes('permission')) {
          status = 403
          message = 'Acesso negado'
          code = 'AUTHORIZATION_ERROR'
        }
      }
      
      const errorResponse = {
        error: message,
        code,
        timestamp: new Date().toISOString(),
        context,
        ...(process.env.NODE_ENV === 'development' && error instanceof Error && {
          details: error.message,
          stack: error.stack
        })
      }
      
      return NextResponse.json(errorResponse, { status })
    }
  }
}

/**
 * Middleware específico para validação de entrada de APIs
 */
export function validateJsonBody(requiredFields: string[]) {
  return async (request: NextRequest) => {
    try {
      const body = await request.json()
      
      const missing = requiredFields.filter(field => !body[field])
      if (missing.length > 0) {
        throw new Error(`Campos obrigatórios faltando: ${missing.join(', ')}`)
      }
      
      return body
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('JSON inválido no corpo da requisição')
      }
      throw error
    }
  }
}

/**
 * Validador de email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validador de OTP (6 dígitos numéricos)
 */
export function validateOTP(otp: string): boolean {
  return /^\d{6}$/.test(otp)
}

/**
 * Rate limiting em memória simples
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(key)
  
  if (!record || now > record.resetTime) {
    // Nova janela de tempo
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (record.count >= maxRequests) {
    return false
  }
  
  record.count++
  return true
}