'use client'

import { usePasswordChangeStatus } from '@/hooks/use-password-change-status'
import { PasswordChangeDialog } from '@/components/password-change-dialog'

interface PasswordChangeProviderProps {
  children: React.ReactNode
}

export function PasswordChangeProvider({ children }: PasswordChangeProviderProps) {
  const { 
    requiresPasswordChange, 
    userEmail, 
    loading, 
    markPasswordChanged 
  } = usePasswordChangeStatus()

  // Não mostrar nada enquanto carrega
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    )
  }

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