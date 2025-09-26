/**
 * Cache global para bootstrap do provider
 * Previne múltiplos bootstraps causados por Fast Refresh
 */

interface BootstrapCache {
  userId: string | null
  initialized: boolean
  timestamp: number
}

const CACHE_TIMEOUT = 30000 // 30 segundos

let globalBootstrapCache: BootstrapCache = {
  userId: null,
  initialized: false,
  timestamp: 0
}

export function checkBootstrapCache(userId: string): boolean {
  const now = Date.now()
  
  // Cache expirou
  if (now - globalBootstrapCache.timestamp > CACHE_TIMEOUT) {
    globalBootstrapCache = {
      userId: null,
      initialized: false,
      timestamp: 0
    }
    return false
  }

  // Mesmo usuário já inicializado
  return globalBootstrapCache.userId === userId && globalBootstrapCache.initialized
}

export function setBootstrapCache(userId: string): void {
  globalBootstrapCache = {
    userId,
    initialized: true,
    timestamp: Date.now()
  }
}

export function clearBootstrapCache(): void {
  globalBootstrapCache = {
    userId: null,
    initialized: false,
    timestamp: 0
  }
}