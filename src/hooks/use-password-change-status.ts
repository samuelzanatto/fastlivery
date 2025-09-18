'use client'

import { useState, useEffect } from 'react'

interface PasswordChangeStatus {
  requiresPasswordChange: boolean
  isEmployee: boolean
  isEmailVerified: boolean
  userName: string
  userEmail: string
  loading: boolean
  error: string | null
}

export function usePasswordChangeStatus() {
  const [status, setStatus] = useState<PasswordChangeStatus>({
    requiresPasswordChange: false,
    isEmployee: false,
    isEmailVerified: true,
    userName: '',
    userEmail: '',
    loading: true,
    error: null
  })

  const checkPasswordStatus = async () => {
    try {
      setStatus(prev => ({ ...prev, loading: true, error: null }))
      
      const response = await fetch('/api/employees/password-change', {
        method: 'GET',
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Usuário não autenticado - não é erro
          setStatus(prev => ({ 
            ...prev, 
            loading: false, 
            requiresPasswordChange: false,
            isEmployee: false
          }))
          return
        }
        throw new Error('Erro ao verificar status da senha')
      }

      const data = await response.json()
      setStatus(prev => ({
        ...prev,
        ...data,
        loading: false,
        error: null
      }))

    } catch (error) {
      console.error('Erro ao verificar status da senha:', error)
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }))
    }
  }

  const markPasswordChanged = () => {
    setStatus(prev => ({
      ...prev,
      requiresPasswordChange: false,
      isEmailVerified: true
    }))
  }

  useEffect(() => {
    checkPasswordStatus()
  }, [])

  return {
    ...status,
    refreshStatus: checkPasswordStatus,
    markPasswordChanged
  }
}

export default usePasswordChangeStatus