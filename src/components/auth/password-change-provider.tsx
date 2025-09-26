'use client'

import { usePasswordChangeStatus } from '@/hooks/auth/use-password-change-status'
import { PasswordChangeDialog } from '@/components/auth/password-change-dialog'

interface PasswordChangeProviderProps {
  children: React.ReactNode
}

export function PasswordChangeProvider({ children }: PasswordChangeProviderProps) {
  const { 
    requiresPasswordChange, 
    userEmail, 
    loading: _loading, 
    markPasswordChanged 
  } = usePasswordChangeStatus()

  // Não mostrar loading - renderizar direto
  return (
    <>
      {children}
      
      {/* Dialog de troca de senha obrigatória */}
      <PasswordChangeDialog
        open={requiresPasswordChange}
        userEmail={userEmail}
        onPasswordChanged={markPasswordChanged}
      />
    </>
  )
}

export default PasswordChangeProvider