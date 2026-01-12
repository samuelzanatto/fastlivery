import { NextRequest, NextResponse } from 'next/server'
import { logRateLimitExceeded } from './audit-trail'

// Configurações de rate limiting por tipo de endpoint
export const RATE_LIMIT_CONFIG = {
  // Autenticação crítica - mais restritiva
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxAttempts: process.env.NODE_ENV === 'development' ? 100 : 20, // 100 em dev, 20 em prod
    skipOnSuccess: false
  },
  // OTP/Verificação - moderadamente restritiva  
  otp: {
    windowMs: 10 * 60 * 1000, // 10 minutos
    maxAttempts: process.env.NODE_ENV === 'development' ? 50 : 5, // 50 em dev, 5 em prod
    skipOnSuccess: true
  },
  // APIs gerais - menos restritiva
  api: {
    windowMs: 1 * 60 * 1000, // 1 minuto
    maxAttempts: 60, // 60 requests por minuto
    skipOnSuccess: true
  }
} as const

interface RateLimitEntry {
  count: number
  resetTime: number
  blocked: boolean
}

// Cache em memória (em produção, usar Redis)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup automático de entradas expiradas
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime <= now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000) // Cleanup a cada 5 minutos

/**
 * Obtém identificador único para rate limiting
 */
function getRateLimitKey(request: NextRequest, prefix: string): string {
  // Prioridade: IP real > Forwarded > Remote Address > Fallback
  const ip = 
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.nextUrl.hostname ||
    'unknown'
  
  return `${prefix}:${ip}`
}

/**
 * Verifica se um IP está sob rate limit
 */
export function checkRateLimit(
  request: NextRequest, 
  type: keyof typeof RATE_LIMIT_CONFIG
): { 
  allowed: boolean
  remaining: number
  resetTime: number
  blocked: boolean
} {
  const config = RATE_LIMIT_CONFIG[type]
  const key = getRateLimitKey(request, type)
  const now = Date.now()
  
  // Buscar entrada existente ou criar nova
  let entry = rateLimitStore.get(key)
  
  if (!entry || entry.resetTime <= now) {
    // Primeira tentativa ou janela expirada - resetar
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
      blocked: false
    }
  }

  // Incrementar contador
  entry.count++
  
  // Verificar se excedeu limite
  if (entry.count > config.maxAttempts) {
    entry.blocked = true
  }

  // Salvar no cache
  rateLimitStore.set(key, entry)

  return {
    allowed: !entry.blocked,
    remaining: Math.max(0, config.maxAttempts - entry.count),
    resetTime: entry.resetTime,
    blocked: entry.blocked
  }
}

/**
 * Cria headers de rate limit para resposta
 */
export function createRateLimitHeaders(result: ReturnType<typeof checkRateLimit>) {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    'X-RateLimit-Blocked': result.blocked.toString()
  }
}

/**
 * Middleware wrapper para aplicar rate limiting
 */
export function withRateLimit(
  type: keyof typeof RATE_LIMIT_CONFIG,
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const result = checkRateLimit(request, type)
    
    if (!result.allowed) {
      const ip = request.headers.get('x-real-ip') || 
                 request.headers.get('x-forwarded-for') || 
                 'unknown'
      const userAgent = request.headers.get('user-agent') || undefined
      
      console.warn(`[RATE-LIMIT] ${type.toUpperCase()} blocked for IP: ${ip}`)
      
      // Log evento de auditoria
      await logRateLimitExceeded(ip, userAgent, `rate_limit_${type}`)
      
      return NextResponse.json(
        { 
          error: 'Muitas tentativas. Tente novamente em alguns minutos.',
          code: 'RATE_LIMIT_EXCEEDED',
          resetTime: result.resetTime
        },
        { 
          status: 429,
          headers: createRateLimitHeaders(result)
        }
      )
    }

    // Prosseguir com handler original
    const response = await handler(request)
    
    // Adicionar headers de rate limit na resposta
    const headers = createRateLimitHeaders(result)
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }
}

/**
 * Reseta rate limit para um IP específico (útil para testes)
 */
export function resetRateLimit(request: NextRequest, type: keyof typeof RATE_LIMIT_CONFIG) {
  const key = getRateLimitKey(request, type)
  rateLimitStore.delete(key)
}

/**
 * Obtém estatísticas do rate limiter
 */
export function getRateLimitStats() {
  const stats = {
    totalEntries: rateLimitStore.size,
    blockedIPs: 0,
    activeWindows: 0
  }
  
  const now = Date.now()
  for (const entry of rateLimitStore.values()) {
    if (entry.blocked) stats.blockedIPs++
    if (entry.resetTime > now) stats.activeWindows++
  }
  
  return stats
}