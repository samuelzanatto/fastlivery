import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase Client Unificado
 * Consolida todas as funcionalidades: Admin, Realtime, Sync e Validation
 * Implementa autenticação híbrida: Better Auth (principal) + Supabase Auth (realtime)
 */

// ===== CONFIGURAÇÃO E VALIDAÇÃO =====

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Validação de configuração
export const validateSupabaseConfig = () => {
  console.group('🔍 Validação Configuração Supabase')
  
  // Validar URL
  if (!supabaseUrl) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL não configurada')
    return false
  }
  
  if (!supabaseUrl.includes('supabase.co')) {
    console.error('❌ URL do Supabase inválida:', supabaseUrl)
    return false
  }
  
  console.log('✅ URL válida:', supabaseUrl)
  
  // Validar chave anon
  if (!supabaseAnonKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY não configurada')
    return false
  }
  
  if (!supabaseAnonKey.startsWith('eyJ')) {
    console.error('❌ Chave Supabase inválida (deve ser JWT):', supabaseAnonKey.substring(0, 20) + '...')
    console.log('💡 Acesse: https://supabase.com/dashboard → Settings → API')
    return false
  }
  
  console.log('✅ Chave anon válida:', supabaseAnonKey.substring(0, 20) + '...')
  
  // Validar service role (opcional)
  if (supabaseServiceRoleKey) {
    console.log('✅ Service role key configurada')
  } else {
    console.warn('⚠️ Service role key não configurada (necessária para funções admin)')
  }
  
  console.groupEnd()
  return true
}

// Teste de conexão
export const testSupabaseConnection = async () => {
  if (!validateSupabaseConfig()) {
    return false
  }
  
  try {
    console.log('🔗 Testando conexão com Supabase...')
    
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    })
    
    if (response.ok) {
      console.log('✅ Conexão com Supabase funcionando!')
      return true
    } else {
      console.error('❌ Erro na conexão:', response.status, response.statusText)
      return false
    }
  } catch (error) {
    console.error('❌ Erro de rede:', error)
    return false
  }
}

// ===== CLIENTES SUPABASE =====

/**
 * Cliente Supabase padrão para operações gerais
 * Sem autenticação persistente, usa Better Auth para RLS
 */
export const createSupabaseClient = (): SupabaseClient => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
        log_level: 'info',
      },
    },
    db: {
      schema: 'public',
    },
  })
}

/**
 * Cliente Supabase Admin para operações administrativas
 * Usa SERVICE_ROLE_KEY para bypass de RLS e criação de usuários
 */
export const createSupabaseAdminClient = (): SupabaseClient => {
  if (!supabaseServiceRoleKey) {
    throw new Error('❌ SUPABASE_SERVICE_ROLE_KEY não configurada para operações admin')
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Cliente Supabase para Realtime otimizado
 * Configuração específica para subscriptions postgres_changes
 */
export const createRealtimeSupabaseClient = (): SupabaseClient => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
        log_level: 'info',
      },
    },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    db: {
      schema: 'public',
    },
  })
}

// ===== SINGLETONS =====

let supabaseClient: SupabaseClient | null = null
let supabaseAdminClient: SupabaseClient | null = null
let realtimeSupabaseClient: SupabaseClient | null = null

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient()
  }
  return supabaseClient
}

export const getSupabaseAdminClient = (): SupabaseClient => {
  if (!supabaseAdminClient) {
    supabaseAdminClient = createSupabaseAdminClient()
  }
  return supabaseAdminClient
}

export const getRealtimeSupabaseClient = (): SupabaseClient => {
  if (!realtimeSupabaseClient) {
    realtimeSupabaseClient = createRealtimeSupabaseClient()
  }
  return realtimeSupabaseClient
}

// ===== FUNÇÕES ADMIN =====

/**
 * Cria ou atualiza um usuário no Supabase Auth
 * Usado para sincronizar usuários do Better Auth
 */
export async function createOrUpdateSupabaseUser(userData: {
  id: string
  email: string
  name?: string
  metadata?: Record<string, unknown>
}) {
  try {
    console.log('🔄 Criando/atualizando usuário Supabase:', userData.email)

    const adminClient = getSupabaseAdminClient()

    // Tentar atualizar usuário existente primeiro
    const { data: existingUser } = await adminClient.auth.admin.getUserById(userData.id)

    if (existingUser?.user) {
      // Usuário existe, atualizar
      const { data, error } = await adminClient.auth.admin.updateUserById(userData.id, {
        email: userData.email,
        user_metadata: {
          name: userData.name,
          ...userData.metadata,
        },
      })

      if (error) {
        console.error('❌ Erro ao atualizar usuário Supabase:', error)
        return { success: false, error }
      }

      console.log('✅ Usuário Supabase atualizado:', userData.email)
      return { success: true, user: data.user }
    } else {
      // Usuário não existe, criar
      const { data, error } = await adminClient.auth.admin.createUser({
        email: userData.email,
        email_confirm: true, // Confirmar email automaticamente
        user_metadata: {
          name: userData.name,
          better_auth_id: userData.id, // Guardar ID do Better Auth
          ...userData.metadata,
        },
      })

      if (error) {
        console.error('❌ Erro ao criar usuário Supabase:', error)
        return { success: false, error }
      }

      console.log('✅ Usuário Supabase criado:', userData.email)
      return { success: true, user: data.user }
    }
  } catch (error) {
    console.error('❌ Erro geral ao sincronizar usuário:', error)
    return { success: false, error }
  }
}

/**
 * Verifica se um usuário existe no Supabase Auth
 */
export async function checkSupabaseUserExists(userId: string) {
  try {
    const adminClient = getSupabaseAdminClient()
    const { data, error } = await adminClient.auth.admin.getUserById(userId)
    
    if (error && error.message !== 'User not found') {
      console.error('❌ Erro ao verificar usuário:', error)
      return { exists: false, error }
    }

    return { exists: !!data?.user, user: data?.user }
  } catch (error) {
    console.error('❌ Erro geral ao verificar usuário:', error)
    return { exists: false, error }
  }
}

// ===== SINCRONIZAÇÃO BETTER AUTH =====

// Importação dinâmica para evitar dependências circulares
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let authClient: any = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAuthClient = async (): Promise<any> => {
  if (!authClient) {
    const { authClient: client } = await import('@/lib/auth/auth-client')
    authClient = client
  }
  return authClient
}

export interface UserSyncResult {
  success: boolean
  supabaseUserId?: string
  error?: unknown
}

/**
 * Sincroniza um usuário do Better Auth com Supabase Auth
 */
export async function syncUserToSupabase(betterAuthUserId: string): Promise<UserSyncResult> {
  try {
    console.log('🔄 Iniciando sincronização de usuário:', betterAuthUserId)

    const client = await getAuthClient()
    const session = await client.getSession()
    
    if (!session?.data?.user || session.data.user.id !== betterAuthUserId) {
      console.error('❌ Usuário não encontrado ou não autorizado no Better Auth')
      return { success: false, error: 'Usuário não encontrado no Better Auth' }
    }

    const betterAuthUser = session.data.user
    
    // Verificar se usuário já existe no Supabase
    const existingCheck = await checkSupabaseUserExists(betterAuthUser.id)
    
    if (existingCheck.exists && existingCheck.user) {
      console.log('✅ Usuário já existe no Supabase:', existingCheck.user.id)
      return { 
        success: true, 
        supabaseUserId: existingCheck.user.id 
      }
    }

    // Criar/atualizar usuário no Supabase
    const syncResult = await createOrUpdateSupabaseUser({
      id: betterAuthUser.id,
      email: betterAuthUser.email,
      name: betterAuthUser.name,
      metadata: {
        better_auth_id: betterAuthUser.id,
        synced_at: new Date().toISOString(),
      },
    })

    if (!syncResult.success) {
      console.error('❌ Falha ao sincronizar usuário:', syncResult.error)
      return { success: false, error: syncResult.error }
    }

    console.log('✅ Usuário sincronizado com sucesso')
    return { 
      success: true, 
      supabaseUserId: syncResult.user?.id 
    }

  } catch (error) {
    console.error('❌ Erro geral na sincronização:', error)
    return { success: false, error }
  }
}

/**
 * Sincroniza automaticamente o usuário atual se estiver logado
 * DESABILITADO: Usando apenas RLS sem sincronização de usuários
 */
export async function ensureCurrentUserSynced(): Promise<UserSyncResult> {
  try {
    // Para sistemas que usam apenas RLS, retornamos sucesso sem sincronização
    console.log('ℹ️ Sincronização desabilitada - usando apenas RLS')
    return { success: true }
  } catch (error) {
    console.error('❌ Erro ao garantir sincronização do usuário atual:', error)
    return { success: false, error }
  }
}

/**
 * Cliente Supabase com autenticação simplificada
 * Usa apenas anon key com RLS para controle de acesso
 */
export const getAuthenticatedSupabaseClient = async (): Promise<SupabaseClient> => {
  const client = getRealtimeSupabaseClient()
  
  try {
    // Para sistemas que usam apenas RLS, não precisamos sincronizar usuários
    // O controle de acesso é feito via políticas de segurança no banco
    console.log('✅ Cliente Supabase criado para realtime com RLS')
    return client
    
  } catch (error) {
    console.error('❌ Erro ao criar cliente Supabase:', error)
    return client
  }
}

/**
 * Cliente Supabase com autenticação Better Auth (versão simplificada)
 * Para usar quando você tem um token JWT do Better Auth
 */
export const getSupabaseClientWithToken = async (token?: string): Promise<SupabaseClient> => {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
        log_level: 'info',
      },
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: token ? {
        'Authorization': `Bearer ${token}`,
      } : {},
    },
  })
  
  return client
}

// ===== ALIASES PARA COMPATIBILIDADE =====

// Mantém compatibilidade com código existente
export const getServerSupabaseClient = getSupabaseClient

// Types para Realtime
export type RealtimeChannel = ReturnType<SupabaseClient['channel']>
export type RealtimeSubscription = Awaited<ReturnType<RealtimeChannel['subscribe']>>

// ===== INICIALIZAÇÃO =====

// Validar configuração na importação (apenas no cliente)
if (typeof window !== 'undefined') {
  validateSupabaseConfig()
}