'use client'

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { useSession } from '@/lib/auth/auth-client'
import { useAutoOpenClose } from '@/hooks/business/use-auto-open-close'
import { checkBootstrapCache, setBootstrapCache } from '@/lib/bootstrap-cache'
import { useBusinessStore } from '@/stores/business-store'

interface BusinessData {
  name: string
  isOpen: boolean
  plan: string
}

interface PrivateLayoutContextType {
  businessData: BusinessData
  setBusinessData: React.Dispatch<React.SetStateAction<BusinessData>>
  userProfileData: { image?: string | null }
  setUserProfileData: React.Dispatch<React.SetStateAction<{ image?: string | null }>>
  avatarKey: number
  bootstrapped: boolean
  fetchUserProfile: () => Promise<void>
}

const PrivateLayoutContext = createContext<PrivateLayoutContextType | null>(null)

export function usePrivateLayout() {
  const context = useContext(PrivateLayoutContext)
  if (!context) {
    throw new Error('usePrivateLayout deve ser usado dentro de PrivateLayoutProvider')
  }
  return context
}

interface PrivateLayoutProviderProps {
  children: React.ReactNode
}

export function PrivateLayoutProvider({ children }: PrivateLayoutProviderProps) {
  const [businessData, _setBusinessData] = useState<BusinessData>({
    name: '',
    isOpen: true,
    plan: 'pro'
  })
  const [userProfileData, _setUserProfileData] = useState<{ image?: string | null }>({})
  const [avatarKey] = useState(0)
  const [bootstrapped, setBootstrapped] = useState(false)
  const { data: session, isPending: _isPending } = useSession()
  const { business, loading: _isLoadingBusiness, fetchBusiness, initialized } = useBusinessStore()
  const bootstrapRef = useRef(false)
  
  // Memoizar os setters
  const setBusinessData = useCallback((data: BusinessData | ((prev: BusinessData) => BusinessData)) => {
    _setBusinessData(data)
  }, [])
  
  const setUserProfileData = useCallback((data: { image?: string | null } | ((prev: { image?: string | null }) => { image?: string | null })) => {
    _setUserProfileData(data)
  }, [])
  const mountCountRef = useRef(0)
  const lastBootstrapRef = useRef<string | null>(null) // Cache do último bootstrap por userId

  // Track mounts para detectar instabilidade
  useEffect(() => {
    mountCountRef.current += 1
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PROVIDER] Mount #${mountCountRef.current}`)
      if (mountCountRef.current > 3) {
        console.warn(`[PROVIDER] Mount count alta: ${mountCountRef.current} - possível instabilidade`)
      }
    }

    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[PROVIDER] Unmount #${mountCountRef.current}`)
      }
    }
  }, [])

    useEffect(() => {
    const logNavigation = () => {
      // Apenas log em desenvolvimento e de forma mais limpa
      if (process.env.NODE_ENV === 'development') {
        console.log(`[PROVIDER] Effect triggered`, {
          hasSession: !!session?.user,
          userId: session?.user?.id,
          bootstrapped,
          timestamp: Date.now()
        })
      }
    }

    logNavigation()

    if (!session?.user?.id) {
      return
    }

    // Cache por userId para evitar bootstrap desnecessário
    const currentUserId = session.user.id
    
    // Verificar cache global primeiro
    if (checkBootstrapCache(currentUserId)) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[PROVIDER] Usando cache global - já inicializado para userId: ${currentUserId}`)
      }
      setBootstrapped(true)
      return
    }

    // Cache local (fallback)
    if (lastBootstrapRef.current === currentUserId && initialized) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[PROVIDER] Usando cache local - já inicializado para userId: ${currentUserId}`)
      }
      setBootstrapped(true)
      setBootstrapCache(currentUserId) // Atualizar cache global
      return
    }

    if (bootstrapRef.current) {
      return
    }

    const initializeData = async () => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[PROVIDER] Starting bootstrap...`)
      }
      setBootstrapped(false)
      
      try {
        // Fetch business data using the store (handles deduplication)
        await fetchBusiness(session.user.id)
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[PROVIDER] Bootstrap completed successfully`)
        }
        bootstrapRef.current = true
        lastBootstrapRef.current = currentUserId // Cache local
        setBootstrapCache(currentUserId) // Cache global
        setBootstrapped(true)
      } catch (error) {
        console.error('[PROVIDER] Bootstrap failed:', error)
        setBootstrapped(true) // Set to true even on error to prevent infinite loading
      }
    }

    // Debounce initialization to prevent rapid successive calls
    const timeoutId = setTimeout(initializeData, 50)
    return () => clearTimeout(timeoutId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]) // Mantenha apenas session?.user?.id como dependência principal

  // Buscar dados do perfil do usuário (especialmente o avatar)
  const fetchUserProfile = useCallback(async () => {
    if (!session?.user?.id) return
    
    try {
      const { getUserProfile } = await import('@/actions/users/profile')
      const result = await getUserProfile()
      if (result.success) {
        setUserProfileData({
          image: result.data.business?.avatar || null
        })
      }
    } catch (error) {
      console.error('Erro ao carregar perfil do usuário:', error)
    }
  }, [session?.user?.id, setUserProfileData])

  // Auto abre/fecha com persistência no servidor
  useAutoOpenClose(business?.openingHours ?? null, {
    syncToServer: true,
    onStatusChange: (isOpen) => {
      setBusinessData(prev => ({ ...prev, isOpen }))
    }
  })

  // Controlar bootstrap apenas uma vez
  // Garantir que o negócio foi buscado (uma única vez) antes de bootstrapar
  useEffect(() => {
    if (session?.user?.id && !initialized) {
      fetchBusiness(session.user.id)
    }
  }, [session?.user?.id, initialized, fetchBusiness])

  useEffect(() => {
    // Só executar quando tiver todos os dados E ainda não foi bootstrapped
    if (session?.user?.id && business?.id && initialized && !bootstrapped && !bootstrapRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PrivateLayoutProvider] Setting business data - conditions met')
      }

      setBusinessData({
        name: business.name || (session.user?.name ? `Empresa do ${session.user.name.split(' ')[0]}` : 'Minha Empresa'),
        isOpen: business.isOpen ?? true,
        plan: business.subscription?.planId || 'pro'
      })
      setBootstrapped(true)
      bootstrapRef.current = true
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[PrivateLayoutProvider] Business data set - bootstrapped')
      }
    }
  }, [session?.user?.id, session?.user?.name, business?.id, business?.name, business?.isOpen, business?.subscription?.planId, initialized, bootstrapped, setBusinessData])

  // Carregar dados do perfil quando a sessão estiver disponível
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserProfile()
    }
  }, [session?.user?.id, fetchUserProfile])

  const value: PrivateLayoutContextType = {
    businessData,
    setBusinessData,
    userProfileData,
    setUserProfileData,
    avatarKey,
    bootstrapped,
    fetchUserProfile
  }

  return (
    <PrivateLayoutContext.Provider value={value}>
      {children}
    </PrivateLayoutContext.Provider>
  )
}

// Usar versão direta sem memo que pode causar instabilidade