'use client'

import { useEffect } from 'react'
import { usePasswordChangeStore } from '@/stores/password-change-store'

export function usePasswordChangeStatus() {
  const store = usePasswordChangeStore()
  
  useEffect(() => {
    store.checkStatus()
  }, [store])

  const markPasswordChanged = () => {
    store.setStatus({
      requiresPasswordChange: false,
      isEmailVerified: true
    })
  }

  return {
    requiresPasswordChange: store.requiresPasswordChange,
    isEmployee: store.isEmployee,
    isEmailVerified: store.isEmailVerified,
    userName: store.userName,
    userEmail: store.userEmail,
    loading: store.loading,
    error: store.error,
    refreshStatus: store.checkStatus,
    markPasswordChanged
  }
}

export default usePasswordChangeStatus