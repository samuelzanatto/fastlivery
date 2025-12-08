'use client'

import { createContext, useContext, useState } from 'react'
import useSWR from 'swr'
import { useSession } from '@/lib/auth/auth-client'

interface UserProfileData {
  name: string
  email: string
  image: string | undefined
  role: string | undefined
}

interface BusinessLayoutContextData {
  userProfileData: UserProfileData
  avatarKey: number
  isLoading: boolean
  error: Error | null
  refreshAvatar: () => void
  refreshUserProfile: () => void
}

const defaultProfileData: UserProfileData = {
  name: '',
  email: '',
  image: undefined,
  role: undefined
}

const BusinessLayoutContext = createContext<BusinessLayoutContextData>({
  userProfileData: defaultProfileData,
  avatarKey: 0,
  isLoading: true,
  error: null,
  refreshAvatar: () => {},
  refreshUserProfile: () => {}
})

async function fetchUserProfile(): Promise<UserProfileData> {
  const { getCurrentUser } = await import('@/actions/users/profile')
  const result = await getCurrentUser()
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch user profile')
  }

  return {
    name: result.data?.name || '',
    email: result.data?.email || '',
    image: result.data?.image || undefined,
    role: result.data?.role || undefined
  }
}

export function BusinessLayoutProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const [avatarKey, setAvatarKey] = useState(0)
  
  // Usar SWR para fazer cache dos dados do usuário
  const { 
    data: userProfileData, 
    error,
    isLoading,
    mutate
  } = useSWR<UserProfileData>(
    session ? '/api/profile' : null,
    () => fetchUserProfile(),
    {
      revalidateOnFocus: false, // Não revalidar ao focar a janela
      revalidateOnReconnect: false, // Não revalidar ao reconectar
      dedupingInterval: 60000, // Deduplicar requisições por 1 minuto
      fallbackData: defaultProfileData // Dados padrão enquanto carrega
    }
  )

  const refreshAvatar = () => {
    setAvatarKey(prev => prev + 1)
  }

  const refreshUserProfile = () => {
    mutate()
  }

  const value = {
    userProfileData: userProfileData || {
      name: '',
      email: '',
      image: undefined,
      role: undefined
    },
    avatarKey,
    isLoading,
    error,
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