import { create } from 'zustand'

interface Business {
  id: string
  name: string
  isOpen?: boolean
  subscription?: { planId: string }
  slug?: string | null
  avatar?: string | null
  openingHours?: string | null
  description?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  banner?: string | null
  acceptsDelivery?: boolean
  acceptsPickup?: boolean
  acceptsDineIn?: boolean
  minimumOrder?: number | null
  deliveryFee?: number | null
  deliveryTime?: number | null
}

interface EmployeeRole {
  id: string
  name: string
  permissions: Array<{
    id: string
    resource: string
    action: string
  }>
}

interface BusinessState {
  business: Business | null
  membershipRole: string | null
  isEmployee: boolean
  employeeRole: EmployeeRole | null
  loading: boolean
  error: string | null
  initialized: boolean
  fetchCount: number
  fetchBusiness: (userId: string) => Promise<void>
  reset: () => void
  updateBusinessInStore: (data: Partial<Business>) => void
  refreshBusiness: () => Promise<void>
  // Helper para verificar permissões
  hasPermission: (resource: string, action: string) => boolean
}

// Singleton promise para deduplicar fetch em corrida
let inFlight: Promise<void> | null = null

export const useBusinessStore = create<BusinessState>((set, get) => ({
  business: null,
  membershipRole: null,
  isEmployee: false,
  employeeRole: null,
  loading: false,
  error: null,
  initialized: false,
  fetchCount: 0,
  
  // Função helper para verificar permissões
  hasPermission(resource: string, action: string) {
    const state = get()
    
    // Se é dono, tem todas as permissões
    if (!state.isEmployee) return true
    
    // Se não tem role, não tem permissão
    if (!state.employeeRole?.permissions) return false
    
    // Verificar nas permissões do cargo
    return state.employeeRole.permissions.some(p => 
      (p.resource === resource || p.resource === '*') && 
      (p.action === action || p.action === 'manage' || p.action === '*')
    )
  },
  
  updateBusinessInStore(data) {
    set(state => {
      if (!state.business) return state
      return { business: { ...state.business, ...data } }
    })
  },
  async refreshBusiness() {
    const current = get().business
    if (!current) return
    try {
      const response = await fetch('/api/business/me', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        set({ 
          business: data.business,
          isEmployee: data.isEmployee || false,
          employeeRole: data.employeeRole || null
        })
      }
    } catch {
      console.warn('[business-store] refresh falhou')
    }
  },
  async fetchBusiness(userId: string) {
    if (!userId) return

    // Já inicializado: não refaz
    if (get().initialized) return

    // Se já existe promise em voo, aguardar
    if (inFlight) {
      try { await inFlight } catch {};
      return
    }

    // Log apenas quando necessário
    const state = get()
    if (state.fetchCount === 0 && process.env.NODE_ENV === 'development') {
      console.log('[business-store] fetching /api/business/me')
    }
    
    set({ loading: true, error: null })
    inFlight = (async () => {
      try {
        const response = await fetch('/api/business/me', { credentials: 'include' })
        if (!response.ok) {
          if (response.status === 404) {
            set({ business: null, membershipRole: null, isEmployee: false, employeeRole: null, initialized: true })
            return
          }
          throw new Error('HTTP ' + response.status)
        }
        const data = await response.json()
        set(state => {
          const nextFetchCount = state.fetchCount + 1
          if (process.env.NODE_ENV === 'development') {
            console.log('[business-store] fetch ok (count=' + nextFetchCount + ', isEmployee=' + !!data.isEmployee + ')')
          }
          return {
            business: data.business,
            membershipRole: data.isEmployee ? 'employee' : 'owner',
            isEmployee: data.isEmployee || false,
            employeeRole: data.employeeRole || null,
            initialized: true,
            fetchCount: nextFetchCount
          }
        })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Erro desconhecido'
        console.error('[business-store] fetch error', e)
        set({ error: msg, initialized: true })
      } finally {
        set({ loading: false })
        inFlight = null
      }
    })()

    await inFlight
  },
  reset() {
    set({ business: null, membershipRole: null, isEmployee: false, employeeRole: null, initialized: false, fetchCount: 0 })
  }
}))

// Selectors helpers
export const useBusinessId = () => useBusinessStore((s: BusinessState) => s.business?.id)
export const useBusinessBasic = () => useBusinessStore((s: BusinessState) => ({ id: s.business?.id, name: s.business?.name }))
export const useIsOwner = () => useBusinessStore((s: BusinessState) => !s.isEmployee)
export const useBusinessFull = () => useBusinessStore((s: BusinessState) => s.business)
export const useEmployeeRole = () => useBusinessStore((s: BusinessState) => s.employeeRole)
export const useHasPermission = () => useBusinessStore((s: BusinessState) => s.hasPermission)
