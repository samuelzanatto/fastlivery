import { auth } from '@/lib/auth/auth'

export interface CachedSession {
  userId: string
  email: string
  name: string
  role: string
  isActive: boolean
  cachedAt: number
  expiresAt: number
}

export interface SessionCacheConfig {
  // Tempo de cache em milliseconds (padrão: 5 minutos)
  cacheTTL: number
  // Tamanho máximo do cache (padrão: 1000 sessões)
  maxSize: number
  // Intervalo de limpeza automática (padrão: 2 minutos)
  cleanupInterval: number
}

const DEFAULT_CONFIG: SessionCacheConfig = {
  cacheTTL: 5 * 60 * 1000, // 5 minutos
  maxSize: 1000,
  cleanupInterval: 2 * 60 * 1000 // 2 minutos
}

class SessionCache {
  private cache = new Map<string, CachedSession>()
  private config: SessionCacheConfig
  private cleanupTimer: NodeJS.Timeout | null = null
  private hits = 0
  private misses = 0

  constructor(config: Partial<SessionCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.startCleanupTimer()
  }

  /**
   * Inicia timer de limpeza automática
   */
  private startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  /**
   * Remove sessões expiradas do cache
   */
  private cleanup() {
    const now = Date.now()
    let removedCount = 0

    for (const [key, session] of this.cache.entries()) {
      if (session.expiresAt <= now) {
        this.cache.delete(key)
        removedCount++
      }
    }

    if (removedCount > 0) {
      console.log(`[SESSION-CACHE] Limpeza automática: ${removedCount} sessões expiradas removidas`)
    }

    // Se ainda estiver muito grande, remover as mais antigas
    if (this.cache.size > this.config.maxSize) {
      const entries = Array.from(this.cache.entries())
      entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt)
      
      const toRemove = entries.slice(0, entries.length - this.config.maxSize)
      toRemove.forEach(([key]) => this.cache.delete(key))
      
      console.log(`[SESSION-CACHE] Limite de tamanho: ${toRemove.length} sessões antigas removidas`)
    }
  }

  /**
   * Gera chave de cache para uma sessão
   */
  private getCacheKey(sessionToken: string): string {
    // Usar hash simples do token para economizar memória
    return `session:${this.simpleHash(sessionToken)}`
  }

  /**
   * Hash simples para reduzir tamanho das chaves
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Busca sessão no cache
   */
  get(sessionToken: string): CachedSession | null {
    const key = this.getCacheKey(sessionToken)
    const cached = this.cache.get(key)

    if (!cached) {
      this.misses++
      return null
    }

    // Verificar se expirou
    if (cached.expiresAt <= Date.now()) {
      this.cache.delete(key)
      this.misses++
      return null
    }

    this.hits++
    return cached
  }

  /**
   * Adiciona sessão ao cache
   */
  set(sessionToken: string, session: Omit<CachedSession, 'cachedAt' | 'expiresAt'>): void {
    const key = this.getCacheKey(sessionToken)
    const now = Date.now()

    const cachedSession: CachedSession = {
      ...session,
      cachedAt: now,
      expiresAt: now + this.config.cacheTTL
    }

    this.cache.set(key, cachedSession)

    // Verificar limite de tamanho imediatamente se necessário
    if (this.cache.size > this.config.maxSize * 1.1) {
      this.cleanup()
    }
  }

  /**
   * Remove sessão do cache
   */
  delete(sessionToken: string): boolean {
    const key = this.getCacheKey(sessionToken)
    return this.cache.delete(key)
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
    console.log('[SESSION-CACHE] Cache completamente limpo')
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats() {
    const totalRequests = this.hits + this.misses
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      config: this.config
    }
  }

  /**
   * Para o timer de limpeza (útil para testes)
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.clear()
  }
}

// Instância singleton do cache
const sessionCache = new SessionCache()

/**
 * Extrai token de sessão dos headers
 */
function extractSessionToken(headers: Headers): string | null {
  // Better Auth usa cookies para sessões
  const cookies = headers.get('cookie')
  if (!cookies) return null

  // Buscar cookie de sessão do Better Auth (nome padrão)
  const sessionCookieMatch = cookies.match(/better-auth\.session_token=([^;]+)/)
  if (sessionCookieMatch) {
    return sessionCookieMatch[1]
  }

  // Fallback para outros formatos possíveis
  const authCookieMatch = cookies.match(/auth-token=([^;]+)/)
  if (authCookieMatch) {
    return authCookieMatch[1]
  }

  return null
}

/**
 * Obtém sessão com cache automático
 */
export async function getCachedSession(headers: Headers): Promise<{
  user?: {
    id: string
    email: string
    name: string
    role?: string
    isActive?: boolean
  }
  session?: unknown
} | null> {
  try {
    const sessionToken = extractSessionToken(headers)
    if (!sessionToken) {
      return null
    }

    // Tentar buscar no cache primeiro
    const cached = sessionCache.get(sessionToken)
    if (cached) {
      return {
        user: {
          id: cached.userId,
          email: cached.email,
          name: cached.name,
          role: cached.role,
          isActive: cached.isActive
        }
      }
    }

    // Cache miss - buscar do Better Auth
    const session = await auth.api.getSession({ headers })
    if (!session?.user) {
      return null
    }

    // Cachear resultado
    sessionCache.set(sessionToken, {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role || 'customer',
      isActive: session.user.isActive ?? true
    })

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role || undefined,
        isActive: session.user.isActive || undefined
      },
      session: session.session
    }
  } catch (error) {
    console.error('[SESSION-CACHE] Erro ao obter sessão:', error)
    // Em caso de erro, tentar buscar diretamente sem cache
    try {
      const fallbackSession = await auth.api.getSession({ headers })
      if (!fallbackSession) return null
      
      return {
        user: {
          id: fallbackSession.user.id,
          email: fallbackSession.user.email,
          name: fallbackSession.user.name,
          role: fallbackSession.user.role || undefined,
          isActive: fallbackSession.user.isActive || undefined
        },
        session: fallbackSession.session
      }
    } catch (fallbackError) {
      console.error('[SESSION-CACHE] Erro no fallback:', fallbackError)
      return null
    }
  }
}

/**
 * Invalida sessão no cache (útil para logout)
 */
export function invalidateCachedSession(headers: Headers): boolean {
  const sessionToken = extractSessionToken(headers)
  if (!sessionToken) {
    return false
  }

  return sessionCache.delete(sessionToken)
}

/**
 * Obtém estatísticas do cache de sessões
 */
export function getSessionCacheStats() {
  return sessionCache.getStats()
}

/**
 * Limpa todo o cache de sessões
 */
export function clearSessionCache() {
  sessionCache.clear()
}

/**
 * Hook para monitoramento do cache (desenvolvimento)
 */
export function logCacheStats() {
  const stats = sessionCache.getStats()
  console.log('[SESSION-CACHE] Estatísticas:', {
    ...stats,
    memoryUsage: `${Math.round(stats.size * 0.5)} KB (estimado)` // Estimativa básica
  })
}

// Log automático de estatísticas a cada 10 minutos em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats = sessionCache.getStats()
    if (stats.hits > 0 || stats.misses > 0) {
      logCacheStats()
    }
  }, 10 * 60 * 1000)
}

export default sessionCache