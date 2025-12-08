/**
 * Sistema de sincronização entre Better Auth e Supabase
 * 
 * NOTA: Como usamos Better Auth para autenticação e Supabase apenas para
 * Realtime e Database (via Prisma), não precisamos sincronizar sessões
 * com Supabase Auth. O Realtime funciona com canais públicos/privados
 * que são autenticados via JWT customizado.
 */

import { authClient } from './auth-client'

interface SupabaseAuthState {
  isAuthenticated: boolean
  userId?: string
  lastCheckAt?: Date
}

class SupabaseAuthSync {
  private state: SupabaseAuthState = { isAuthenticated: false }
  private sessionCheckInterval?: NodeJS.Timeout

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeSync()
    }
  }

  private async initializeSync() {
    // Verificar sessão inicial
    await this.checkSession()

    // Verificação periódica leve (apenas para manter estado local)
    this.sessionCheckInterval = setInterval(() => {
      this.checkSession()
    }, 60000) // Verificar a cada 60 segundos
  }

  private async checkSession() {
    try {
      const session = await authClient.getSession()
      
      this.state = {
        isAuthenticated: !!session.data?.user,
        userId: session.data?.user?.id,
        lastCheckAt: new Date()
      }

      if (process.env.NODE_ENV === 'development' && this.state.isAuthenticated) {
        console.debug('[SupabaseAuthSync] Sessão Better Auth ativa:', this.state.userId)
      }
    } catch (error) {
      console.debug('[SupabaseAuthSync] Erro ao verificar sessão:', error)
      this.state = { isAuthenticated: false }
    }
  }

  /**
   * Força uma nova verificação de sessão
   */
  async forceSync(): Promise<void> {
    await this.checkSession()
  }

  /**
   * Obtém o estado atual
   */
  getState(): SupabaseAuthState {
    return { ...this.state }
  }

  /**
   * Verifica se o usuário está autenticado
   */
  isAuthenticated(): boolean {
    return this.state.isAuthenticated
  }

  /**
   * Obtém o ID do usuário atual
   */
  getUserId(): string | undefined {
    return this.state.userId
  }

  /**
   * Cleanup ao destruir
   */
  destroy() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval)
      this.sessionCheckInterval = undefined
    }
  }
}

// Singleton para uso global
export const supabaseAuthSync = new SupabaseAuthSync()

// Cleanup automático
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    supabaseAuthSync.destroy()
  })
}