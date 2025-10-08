'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/auth/auth-client'
import { hasBusinessAccess } from '@/lib/auth/auth-client'
import { PasswordChangeProvider } from '@/components/auth/password-change-provider'
import { BusinessLayoutProvider } from '@/providers/business-layout-provider'
import { BusinessLayoutUI } from '@/components/layout/business-layout-ui'

interface LayoutProps {
  children: React.ReactNode
}

// O componente de proteção de rota agora é mais simples e eficiente
function AuthGuard({ children }: LayoutProps) {
  const router = useRouter()
  const { data: session, isPending } = useSession()

  useEffect(() => {
    if (!isPending && !session) {
      router.replace('/login')
      return
    }

    if (session?.user?.role) {
      if (!hasBusinessAccess(session.user.role)) {
        router.replace('/login?error=access_denied')
        return
      }

      if (session.user.role === 'supplierOwner') {
        router.replace('/supplier-dashboard')
        return
      }
    }
  }, [session, isPending, router])

  // Enquanto carrega, retorna null para evitar flash de conteúdo
  if (isPending || !session || !session.user) return null

  // Caso seja fornecedor ou não tenha acesso
  if (!session.user.role || 
    session.user.role === 'supplierOwner' || 
    !hasBusinessAccess(session.user.role)
  ) return null

  return children
}

export default function BusinessLayout({ children }: LayoutProps) {
  return (
    <AuthGuard>
      <PasswordChangeProvider>
        <BusinessLayoutProvider>
          <BusinessLayoutUI>{children}</BusinessLayoutUI>
        </BusinessLayoutProvider>
      </PasswordChangeProvider>
    </AuthGuard>
  )
}
