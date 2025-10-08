import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

// Singleton global mais robusto
const SUPABASE_SINGLETON_KEY = Symbol.for('__FASTLIVERY_SUPABASE_CLIENT__')
const SUPABASE_ADMIN_SINGLETON_KEY = Symbol.for('__FASTLIVERY_SUPABASE_ADMIN__')

type SupabaseGlobal = { 
  [SUPABASE_SINGLETON_KEY]?: SupabaseClient
  [SUPABASE_ADMIN_SINGLETON_KEY]?: SupabaseClient
}

const getGlobalThis = () => globalThis as SupabaseGlobal

// Criação lazy e cacheada do cliente
let _supabaseClient: SupabaseClient | null = null

function createSupabaseClient(): SupabaseClient {
  // Verificar cache local primeiro
  if (_supabaseClient) {
    return _supabaseClient
  }

  const g = getGlobalThis()
  
  // Verificar cache global
  if (g[SUPABASE_SINGLETON_KEY]) {
    _supabaseClient = g[SUPABASE_SINGLETON_KEY]
    return _supabaseClient
  }

  // Criar nova instância apenas se necessário
  const client = createClient(supabaseUrl, supabaseKey, {
    realtime: {
      params: { eventsPerSecond: 10 },
      timeout: 30000,
      heartbeatIntervalMs: 30000,
      reconnectAfterMs: (tries: number) => Math.min(1000 * Math.pow(2, tries), 30000)
    },
    global: { 
      headers: { 'X-Client-Info': 'fastlivery-v2' } 
    },
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      persistSession: true,
      detectSessionInUrl: false,
      storageKey: 'fastlivery-auth-token',
      autoRefreshToken: true
    }
  })
  
  // Cache em ambos os locais
  g[SUPABASE_SINGLETON_KEY] = client
  _supabaseClient = client
  
  if (process.env.NODE_ENV === 'development') {
    console.debug('[Supabase] Nova instância criada e cacheada')
  }
  
  return client
}

export const supabase: SupabaseClient = createSupabaseClient()

// Inicializar sincronização de autenticação em ambiente browser
if (typeof window !== 'undefined') {
  // Lazy import para evitar problemas de dependência circular
  import('./auth/supabase-auth-sync').then(({ supabaseAuthSync: _sync }) => {
    // A sincronização já é inicializada automaticamente no constructor
    console.debug('[Supabase] Sistema de sincronização de autenticação inicializado')
  }).catch(error => {
    console.error('[Supabase] Erro ao inicializar sincronização de autenticação:', error)
  })
}

// Cache local para cliente admin
let _supabaseAdminClient: SupabaseClient | null = null

function createSupabaseAdminClient(): SupabaseClient {
  // IMPORTANTE: Cliente admin só deve existir no servidor
  if (typeof window !== 'undefined') {
    throw new Error('[Supabase Admin] Cliente admin não deve ser usado no browser!')
  }

  if (_supabaseAdminClient) {
    return _supabaseAdminClient
  }

  const g = getGlobalThis()
  
  if (g[SUPABASE_ADMIN_SINGLETON_KEY]) {
    _supabaseAdminClient = g[SUPABASE_ADMIN_SINGLETON_KEY]
    return _supabaseAdminClient
  }

  const adminClient = createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key',
    {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: {
        params: { eventsPerSecond: 10 },
        timeout: 30000,
        heartbeatIntervalMs: 30000,
        reconnectAfterMs: (tries: number) => Math.min(1000 * Math.pow(2, tries), 30000)
      }
    }
  )
  
  g[SUPABASE_ADMIN_SINGLETON_KEY] = adminClient
  _supabaseAdminClient = adminClient
  return adminClient
}

// Cliente admin (server side). Lazy loading para evitar execução no browser.
let _supabaseAdminExport: SupabaseClient | null = null
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(target: SupabaseClient, prop: string | symbol): unknown {
    if (typeof window !== 'undefined') {
      console.warn('⚠️ Admin client access blocked in browser environment')
      return undefined
    }
    
    if (!_supabaseAdminExport) {
      _supabaseAdminExport = createSupabaseAdminClient()
    }
    
    return (_supabaseAdminExport as unknown as Record<string | symbol, unknown>)[prop]
  }
})

// Monitoramento de múltiplas instâncias em desenvolvimento
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const windowWithSupabase = window as Window & { supabase?: SupabaseClient }
  const existingSupabase = windowWithSupabase.supabase
  
  if (existingSupabase && existingSupabase !== supabase) {
    console.warn('[Supabase] ⚠️ Múltiplas instâncias detectadas no window object')
  }
  
  // Expor para debug
  windowWithSupabase.supabase = supabase
  
  // Hook para detectar uso excessivo do auth  
  const originalAuth = supabase.auth
  let authAccessCount = 0
  
  Object.defineProperty(supabase, 'auth', {
    get() {
      authAccessCount++
      if (authAccessCount > 100 && authAccessCount % 50 === 0) {
        console.debug(`[Supabase] Auth acessado ${authAccessCount} vezes`)
      }
      return originalAuth
    },
    configurable: true
  })
}