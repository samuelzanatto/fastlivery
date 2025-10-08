import { create } from 'zustand'

interface PasswordChangeState {
  requiresPasswordChange: boolean
  isEmployee: boolean
  isEmailVerified: boolean
  userName: string
  userEmail: string
  loading: boolean
  error: string | null
  initialized: boolean
  setStatus: (status: Partial<Omit<PasswordChangeState, 'setStatus' | 'checkStatus' | 'initialized'>>) => void
  checkStatus: () => Promise<void>
}

// Singleton promise para deduplicar fetch em corrida
let inFlight: Promise<void> | null = null

export const usePasswordChangeStore = create<PasswordChangeState>((set, get) => ({
  requiresPasswordChange: false,
  isEmployee: false,
  isEmailVerified: true,
  userName: '',
  userEmail: '',
  loading: false,
  error: null,
  initialized: false,
  setStatus: (status) => set((state) => ({ ...state, ...status })),
  async checkStatus() {
    // Já inicializado: não refaz
    if (get().initialized) return

    // Se já existe promise em voo, aguardar
    if (inFlight) {
      try { await inFlight } catch {};
      return
    }

    set({ loading: true, error: null })
    inFlight = (async () => {
      try {
        const response = await fetch('/api/employees/password-change', {
          method: 'GET',
          credentials: 'include'
        })

        if (!response.ok) {
          if (response.status === 401) {
            // Usuário não autenticado - não é erro
            set({ 
              loading: false, 
              requiresPasswordChange: false,
              isEmployee: false,
              initialized: true
            })
            return
          }
          throw new Error('Erro ao verificar status da senha')
        }

        const data = await response.json()
        set({
          ...data,
          loading: false,
          error: null,
          initialized: true
        })
      } catch (error) {
        set({ 
          loading: false, 
          error: error instanceof Error ? error.message : 'Erro ao verificar status',
          initialized: true
        })
      } finally {
        inFlight = null
      }
    })()

    await inFlight
  }
}))