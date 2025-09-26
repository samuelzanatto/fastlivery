'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useSession } from '@/lib/auth/auth-client'
import { useBusinessContext } from '@/hooks/business/use-business-context'

interface BusinessLayoutContextData {
  userProfileData: {
    name: string
    email: string
    image?: string
    role?: string
  }
  avatarKey: number
  bootstrapped: boolean
  refreshAvatar: () => void
  refreshUserProfile: () => Promise<void>
}

const BusinessLayoutContext = createContext<BusinessLayoutContextData>({
  userProfileData: {
    name: '',
    email: '',
    image: undefined,
    role: undefined
  },
  avatarKey: 0,
  bootstrapped: false,
  refreshAvatar: () => {},
  refreshUserProfile: async () => {}
})

export function BusinessLayoutProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const { loading: isLoadingBusiness } = useBusinessContext()
  
  const [avatarKey, setAvatarKey] = useState(0)
  const [bootstrapped, setBootstrapped] = useState(false)
  const [userProfileData, setUserProfileData] = useState({
    name: '',
    email: '',
    image: undefined as string | undefined,
    role: undefined as string | undefined
  })

  // Função para forçar atualização do avatar
  const refreshAvatar = useCallback(() => {
    setAvatarKey(prev => prev + 1)
  }, [])

  // Função para recarregar dados do perfil do usuário
  const refreshUserProfile = useCallback(async () => {
    if (!session) return

    try {
      const { getCurrentUser } = await import('@/actions/users/profile')
      const result = await getCurrentUser()
      
      if (result.success && result.data) {
        setUserProfileData({
          name: result.data.name || '',
          email: result.data.email || '',
          image: result.data.image || undefined,
          role: result.data.role || undefined
        })
        refreshAvatar()
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error)
    }
  }, [session, refreshAvatar])

  // Carregar dados iniciais
  useEffect(() => {
    if (session && !isLoadingBusiness) {
      // Usar dados da sessão como fallback inicial
      setUserProfileData({
        name: session.user?.name || '',
        email: session.user?.email || '',
        image: session.user?.image || undefined,
        role: session.user?.role || undefined
      })
      
      // Carregar dados atualizados do banco
      refreshUserProfile().then(() => {
        setBootstrapped(true)
      })
    }
  }, [session, isLoadingBusiness, refreshUserProfile])

  const value = {
    userProfileData,
    avatarKey,
    bootstrapped,
    refreshAvatar,
    refreshUserProfile
  }

  return (
    <BusinessLayoutContext.Provider value={value}>
      {children}
    </BusinessLayoutContext.Provider>
  )
}

export function useBusinessLayout() {
  const context = useContext(BusinessLayoutContext)
  if (!context) {
    throw new Error('useBusinessLayout must be used within BusinessLayoutProvider')
  }
  return context
}