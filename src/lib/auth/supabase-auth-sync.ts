/**
 * Sistema de sincronização entre Better Auth e Supabase Auth
 * Permite que o Supabase Realtime funcione com autenticação Better Auth
 */

import { supabase } from '@/lib/supabase'
import { authClient } from './auth-client'

interface SupabaseAuthState {
  isSyncing: boolean
  lastSyncAt?: Date
  error?: string
}

class SupabaseAuthSync {
  private state: SupabaseAuthState = { isSyncing: false }
  private sessionCheckInterval?: NodeJS.Timeout

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeSync()
    }
  }

  private async initializeSync() {
    // Verificar e sincronizar sessão inicial
    await this.syncCurrentSession()

    // Configurar verificação periódica para manter sincronização
    this.sessionCheckInterval = setInterval(() => {
      this.periodicSync()
    }, 30000) // Verificar a cada 30 segundos
  }

  private async syncCurrentSession() {
    if (this.state.isSyncing) return

    this.state.isSyncing = true
    this.state.error = undefined

    try {
      // Obter sessão Better Auth
      const session = await authClient.getSession()
      
      if (session.data?.user) {
        // Criar token JWT personalizado para Supabase
        const customToken = await this.createSupabaseToken()
        
        if (customToken) {
          // Autenticar no Supabase com token personalizado
          const { error } = await supabase.auth.setSession({
            access_token: customToken,
            refresh_token: 'better-auth-managed' // Placeholder
          })

          if (error) {
            console.error('[SupabaseAuthSync] Erro ao definir sessão Supabase:', error)
            this.state.error = error.message
          } else {
            console.log('[SupabaseAuthSync] ✅ Sessão sincronizada com Supabase')
            this.state.lastSyncAt = new Date()
          }
        }
      } else {
        // Fazer logout no Supabase se não há sessão Better Auth
        const { data: { session: supabaseSession } } = await supabase.auth.getSession()
        if (supabaseSession) {
          await supabase.auth.signOut({ scope: 'local' })
          console.log('[SupabaseAuthSync] 🚪 Logout sincronizado com Supabase')
        }
      }
    } catch (error) {
      console.error('[SupabaseAuthSync] Erro na sincronização:', error)
      this.state.error = error instanceof Error ? error.message : 'Erro desconhecido'
    } finally {
      this.state.isSyncing = false
    }
  }

  private async createSupabaseToken(): Promise<string | null> {
    try {
      // Chamar API para gerar token JWT compatível com Supabase
      const response = await fetch('/api/auth/supabase-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Incluir cookies da sessão Better Auth
      })

      if (!response.ok) {
        if (response.status === 401) {
          console.log('[SupabaseAuthSync] Não autenticado no Better Auth')
          return null
        }
        throw new Error(`Erro ao gerar token: ${response.status}`)
      }

      const { token } = await response.json()
      return token
    } catch (error) {
      console.error('[SupabaseAuthSync] Erro ao criar token:', error)
      return null
    }
  }

  private async periodicSync() {
    try {
      const { data: { session: supabaseSession } } = await supabase.auth.getSession()
      const betterAuthSession = await authClient.getSession()

      // Verificar se as sessões estão desincronizadas
      const betterAuthActive = !!betterAuthSession.data
      const supabaseActive = !!supabaseSession

      if (betterAuthActive !== supabaseActive) {
        console.log('[SupabaseAuthSync] 🔄 Sessões desincronizadas, ressincronizando...')
        await this.syncCurrentSession()
      }
    } catch (error) {
      console.error('[SupabaseAuthSync] Erro na verificação periódica:', error)
    }
  }

  /**
   * Força uma nova sincronização
   */
  async forceSync(): Promise<void> {
    await this.syncCurrentSession()
  }

  /**
   * Obtém o estado atual da sincronização
   */
  getState(): SupabaseAuthState {
    return { ...this.state }
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