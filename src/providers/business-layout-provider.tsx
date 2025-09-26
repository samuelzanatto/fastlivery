'use client'

import { createContext, useContext, useEffect, useState } from 'react'
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
  refreshAvatar: () => {}
})

export function BusinessLayoutProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const { loading: isLoadingBusiness } = useBusinessContext()
  
  const [avatarKey, setAvatarKey] = useState(0)
  const [bootstrapped, setBootstrapped] = useState(false)

  // Função para forçar atualização do avatar
  const refreshAvatar = () => {
    setAvatarKey(prev => prev + 1)
  }

  useEffect(() => {
    if (session && !isLoadingBusiness) {
      setBootstrapped(true)
    }
  }, [session, isLoadingBusiness])

  const userProfileData = {
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    image: session?.user?.image || undefined,
    role: session?.user?.role || undefined
  }

  const value = {
    userProfileData,
    avatarKey,
    bootstrapped,
    refreshAvatar
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