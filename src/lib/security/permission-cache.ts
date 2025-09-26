import { hasBusinessAccess, hasPlatformAccess, isCustomer } from '@/lib/auth/auth-client'

export interface CachedPermission {
  userId: string
  role: string
  permissions: string[]
  resources: Record<string, string[]>
  cachedAt: number
  expiresAt: number
}

export interface PermissionCacheConfig {
  cacheTTL: number // 10 minutos por padrão
  maxSize: number // 500 usuários por padrão
  cleanupInterval: number // 5 minutos por padrão
}

const DEFAULT_PERMISSION_CONFIG: PermissionCacheConfig = {
  cacheTTL: 10 * 60 * 1000, // 10 minutos
  maxSize: 500,
  cleanupInterval: 5 * 60 * 1000 // 5 minutos
}

class PermissionCache {
  private cache = new Map<string, CachedPermission>()
  private config: PermissionCacheConfig
  private cleanupTimer: NodeJS.Timeout | null = null
  private hits = 0
  private misses = 0

  constructor(config: Partial<PermissionCacheConfig> = {}) {
    this.config = { ...DEFAULT_PERMISSION_CONFIG, ...config }
    this.startCleanupTimer()
  }

  private startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  private cleanup() {
    const now = Date.now()
    let removedCount = 0

    for (const [key, permission] of this.cache.entries()) {
      if (permission.expiresAt <= now) {
        this.cache.delete(key)
        removedCount++
      }
    }

    if (removedCount > 0) {
      console.log(`[PERMISSION-CACHE] Limpeza: ${removedCount} permissões expiradas removidas`)
    }

    // Controle de tamanho máximo
    if (this.cache.size > this.config.maxSize) {
      const entries = Array.from(this.cache.entries())
      entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt)
      
      const toRemove = entries.slice(0, entries.length - this.config.maxSize)
      toRemove.forEach(([key]) => this.cache.delete(key))
      
      console.log(`[PERMISSION-CACHE] Limite de tamanho: ${toRemove.length} permissões antigas removidas`)
    }
  }

  /**
   * Busca permissões no cache
   */
  getPermissions(userId: string): CachedPermission | null {
    const cached = this.cache.get(userId)

    if (!cached) {
      this.misses++
      return null
    }

    if (cached.expiresAt <= Date.now()) {
      this.cache.delete(userId)
      this.misses++
      return null
    }

    this.hits++
    return cached
  }

  /**
   * Adiciona permissões ao cache
   */
  setPermissions(userId: string, role: string, permissions: string[], resources: Record<string, string[]>) {
    const now = Date.now()

    const cachedPermission: CachedPermission = {
      userId,
      role,
      permissions,
      resources,
      cachedAt: now,
      expiresAt: now + this.config.cacheTTL
    }

    this.cache.set(userId, cachedPermission)
  }

  /**
   * Remove permissões do cache (útil quando papel do usuário muda)
   */
  invalidateUser(userId: string): boolean {
    return this.cache.delete(userId)
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
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

  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.clear()
  }
}

// Instância singleton
const permissionCache = new PermissionCache()

/**
 * Mapeamento otimizado de roles para permissões
 */
const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  // Platform Roles
  platformAdmin: [
    'platform:manage',
    'users:*',
    'businesses:*',
    'billing:*',
    'analytics:view',
    'logs:view',
    'system:admin'
  ],
  platformSupport: [
    'users:view',
    'users:support',
    'businesses:view',
    'billing:view',
    'analytics:view',
    'logs:view'
  ],

  // Business Roles
  businessOwner: [
    'business:manage',
    'products:*',
    'orders:*',
    'employees:*',
    'billing:view',
    'billing:manage',
    'analytics:view',
    'settings:*'
  ],
  businessAdmin: [
    'business:view',
    'business:update',
    'products:*',
    'orders:*',
    'employees:manage',
    'analytics:view',
    'settings:view'
  ],
  businessManager: [
    'business:view',
    'products:view',
    'products:update',
    'orders:*',
    'employees:view',
    'analytics:view'
  ],
  businessStaff: [
    'business:view',
    'products:view',
    'orders:view',
    'orders:update'
  ],

  // Supplier Roles
  supplierOwner: [
    'supplier:view',
    'supplier:manage',
    'partnerships:*',
    'services:*',
    'analytics:view',
    'settings:*'
  ],

  // Customer
  customer: [
    'orders:create',
    'orders:view_own',
    'profile:manage',
    'addresses:manage'
  ]
}

/**
 * Recursos específicos por contexto
 */
const ROLE_RESOURCE_MAP: Record<string, Record<string, string[]>> = {
  // Platform roles têm acesso global
  platformAdmin: {
    '*': ['*']
  },
  platformSupport: {
    'users': ['read', 'support'],
    'restaurants': ['read'],
    'billing': ['read']
  },

  // Business roles são limitadas ao contexto do negócio
  businessOwner: {
    'restaurant': ['create', 'read', 'update', 'delete'],
    'products': ['create', 'read', 'update', 'delete'],
    'orders': ['create', 'read', 'update', 'delete'],
    'employees': ['create', 'read', 'update', 'delete'],
    'billing': ['read', 'update'],
    'analytics': ['read'],
    'settings': ['create', 'read', 'update', 'delete']
  },
  businessAdmin: {
    'restaurant': ['read', 'update'],
    'products': ['create', 'read', 'update', 'delete'],
    'orders': ['create', 'read', 'update', 'delete'],
    'employees': ['create', 'read', 'update'],
    'analytics': ['read'],
    'settings': ['read']
  },
  businessManager: {
    'restaurant': ['read'],
    'products': ['read', 'update'],
    'orders': ['create', 'read', 'update'],
    'employees': ['read'],
    'analytics': ['read']
  },
  businessStaff: {
    'restaurant': ['read'],
    'products': ['read'],
    'orders': ['read', 'update']
  },

  customer: {
    'orders': ['create', 'read_own'],
    'profile': ['read', 'update'],
    'addresses': ['create', 'read', 'update', 'delete']
  }
}

/**
 * Função otimiza de verificação de permissões com cache
 */
export async function checkUserPermissions(
  userId: string, 
  role?: string,
  permission?: string,
  resource?: string,
  action?: string
): Promise<{
  hasAccess: boolean
  permissions: string[]
  resources: Record<string, string[]>
  cached: boolean
}> {
  try {
    // Tentar buscar no cache primeiro
    let cached = permissionCache.getPermissions(userId)
    
    if (!cached && role) {
      // Cache miss - calcular permissões
      const permissions = ROLE_PERMISSION_MAP[role] || []
      const resources = ROLE_RESOURCE_MAP[role] || {}
      
      // Adicionar ao cache
      permissionCache.setPermissions(userId, role, permissions, resources)
      
      cached = {
        userId,
        role,
        permissions,
        resources,
        cachedAt: Date.now(),
        expiresAt: Date.now() + DEFAULT_PERMISSION_CONFIG.cacheTTL
      }
    }

    if (!cached) {
      return {
        hasAccess: false,
        permissions: [],
        resources: {},
        cached: false
      }
    }

    // Verificar permissão específica se solicitada
    let hasAccess = true

    if (permission) {
      hasAccess = cached.permissions.includes(permission) || 
                 cached.permissions.includes('*') ||
                 cached.permissions.some(p => p.endsWith(':*') && permission.startsWith(p.split(':')[0]))
    }

    if (resource && action && hasAccess) {
      const resourceActions = cached.resources[resource] || []
      hasAccess = resourceActions.includes(action) || 
                 resourceActions.includes('*') ||
                 cached.resources['*']?.includes('*')
    }

    return {
      hasAccess,
      permissions: cached.permissions,
      resources: cached.resources,
      cached: true
    }

  } catch (error) {
    console.error('[PERMISSION-CHECK] Erro ao verificar permissões:', error)
    return {
      hasAccess: false,
      permissions: [],
      resources: {},
      cached: false
    }
  }
}

/**
 * Função helper para verificação rápida de acesso a rotas
 */
export function hasRouteAccess(role?: string, route?: string): boolean {
  if (!role || !route) return false

  // Mapear rotas para permissões
  const routePermissionMap: Record<string, string> = {
    '/dashboard': 'business:view',
    '/supplier-dashboard': 'supplier:view',
    '/supplier-products': 'supplier:view',
    '/supplier-orders': 'supplier:view',
    '/supplier-partnerships': 'supplier:view', 
    '/supplier-clients': 'supplier:view',
    '/supplier-analytics': 'supplier:view',
    '/supplier-billing': 'supplier:view',
    '/supplier-subscription-manage': 'supplier:view',
    '/supplier-settings': 'supplier:view',
    '/supplier-support': 'supplier:view',
    '/products': 'products:view',
    '/orders': 'orders:view',
    '/employees': 'employees:view',
    '/users': 'employees:view',
    '/analytics': 'analytics:view',
    '/settings': 'settings:view',
    '/billing': 'billing:view',
    '/permissions': 'employees:manage',
    '/categories': 'products:view',
    '/additionals': 'products:view',
    '/marketplace': 'products:view',
    '/partnership-requests': 'supplier:view',
    '/supplier-subscription': 'supplier:view'
  }

  const requiredPermission = routePermissionMap[route]
  if (!requiredPermission) return true // Rota não mapeada = acesso livre

  const userPermissions = ROLE_PERMISSION_MAP[role] || []
  
  return userPermissions.includes(requiredPermission) ||
         userPermissions.includes('*') ||
         userPermissions.some(p => p.endsWith(':*') && 
           requiredPermission.startsWith(p.split(':')[0]))
}

/**
 * Middleware helper otimizado para verificação de roles
 */
export function checkRoleAccess(role?: string): {
  isAdmin: boolean
  isBusiness: boolean
  isPlatform: boolean
  isCustomer: boolean
  hasAdminRoutes: boolean
} {
  if (!role) {
    return {
      isAdmin: false,
      isBusiness: false,
      isPlatform: false,
      isCustomer: false,
      hasAdminRoutes: false
    }
  }

  const isBusiness = hasBusinessAccess(role)
  const isPlatform = hasPlatformAccess(role)
  const isCustomerRole = isCustomer(role)
  const isAdmin = isBusiness || isPlatform
  const hasAdminRoutes = isAdmin

  return {
    isAdmin,
    isBusiness,
    isPlatform,
    isCustomer: isCustomerRole,
    hasAdminRoutes
  }
}

/**
 * Invalida cache de permissões quando papel do usuário muda
 */
export function invalidateUserPermissions(userId: string): boolean {
  return permissionCache.invalidateUser(userId)
}

/**
 * Obtém estatísticas do cache de permissões
 */
export function getPermissionCacheStats() {
  return permissionCache.getStats()
}

/**
 * Limpa cache de permissões
 */
export function clearPermissionCache() {
  permissionCache.clear()
}

// Log de estatísticas em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats = permissionCache.getStats()
    if (stats.hits > 0 || stats.misses > 0) {
      console.log('[PERMISSION-CACHE] Estatísticas:', stats)
    }
  }, 10 * 60 * 1000) // A cada 10 minutos
}

export default permissionCache