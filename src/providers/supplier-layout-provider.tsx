'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useSession } from '@/lib/auth/auth-client'

interface SupplierLayoutContextData {
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

const SupplierLayoutContext = createContext<SupplierLayoutContextData>({
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

export function SupplierLayoutProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  
  const [avatarKey, setAvatarKey] = useState(0)
  const [bootstrapped, setBootstrapped] = useState(false)

  // Função para forçar atualização do avatar
  const refreshAvatar = () => {
    setAvatarKey(prev => prev + 1)
  }

  useEffect(() => {
    if (session && !isPending) {
      setBootstrapped(true)
    }
  }, [session, isPending])

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
    <SupplierLayoutContext.Provider value={value}>
      {children}
    </SupplierLayoutContext.Provider>
  )
}

export function useSupplierLayout() {
  const context = useContext(SupplierLayoutContext)
  if (!context) {
    throw new Error('useSupplierLayout must be used within SupplierLayoutProvider')
  }
  return context
}