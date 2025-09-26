'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/auth/auth-client'
import { PasswordChangeProvider } from '@/components/auth/password-change-provider'
import { BusinessLayoutProvider } from '@/providers/business-layout-provider'
import { BusinessLayoutUI } from '@/components/layout/business-layout-ui'
import { hasBusinessAccess } from '@/lib/auth/auth-client'

interface LayoutProps {
  children: React.ReactNode
}

function BusinessLayoutContent({ children }: LayoutProps) {
  const router = useRouter()
  const { data: session, isPending } = useSession()

  useEffect(() => {
    // Aguardar um pouco mais para dar tempo da sessão ser estabelecida após auto-login
    const timeoutId = setTimeout(() => {
      if (!isPending && !session) {
        console.log('[BusinessLayout] sem sessão -> redirect /login')
        router.push('/login')
        return
      }

      // Verificar se o usuário tem acesso a rotas de negócio
      if (!isPending && session?.user?.role && !hasBusinessAccess(session.user.role)) {
        console.log('[BusinessLayout] sem acesso a business -> redirect /login')
        router.push('/login?error=access_denied')
        return
      }

      // Redirecionar fornecedores para o dashboard de fornecedor
      if (session?.user?.role === 'supplierOwner') {
        router.replace('/supplier-dashboard')
        return
      }
    }, isPending ? 0 : 500) // Aguardar 500ms se não estiver carregando

    return () => clearTimeout(timeoutId)
  }, [session, isPending, router])

  // Loading state
  if (isPending) {
    return null
  }

  // Sem sessão
  if (!session) {
    return null
  }

  // Fornecedor tentando acessar business dashboard
  if (session.user?.role === 'supplierOwner') {
    return null
  }

  // Sem acesso a rotas de negócio
  if (!hasBusinessAccess(session.user?.role || '')) {
    return null
  }

  return <BusinessLayoutUI>{children}</BusinessLayoutUI>
}

export default function BusinessLayout({ children }: LayoutProps) {
  return (
    <PasswordChangeProvider>
      <BusinessLayoutProvider>
        <BusinessLayoutContent>{children}</BusinessLayoutContent>
      </BusinessLayoutProvider>
    </PasswordChangeProvider>
  )
}
