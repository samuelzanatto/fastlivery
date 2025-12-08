'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/auth/auth-client'
import { hasBusinessAccess } from '@/lib/auth/auth-client'
import { PasswordChangeProvider } from '@/components/auth/password-change-provider'
import { BusinessLayoutProvider } from '@/providers/business-layout-provider'
import { BusinessLayoutUI } from '@/components/layout/business-layout-ui'

interface LayoutProps {
  children: React.ReactNode
}

// Loading skeleton que mantém a estrutura do layout
function LayoutSkeleton() {
  return (
    <div className="h-screen bg-white flex overflow-hidden">
      {/* Sidebar skeleton */}
      <div className="hidden lg:flex w-64 bg-white shadow-lg flex-col h-full">
        <div className="flex items-center h-16 px-6">
          <div className="h-8 w-8 bg-orange-100 rounded animate-pulse" />
          <div className="ml-2 h-6 w-24 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="flex-1 px-4 py-6 space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-50 rounded animate-pulse" />
          ))}
        </div>
      </div>
      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="h-16 bg-white border-b px-6 flex items-center justify-between">
          <div className="h-6 w-32 bg-slate-100 rounded animate-pulse" />
          <div className="h-8 w-8 bg-slate-100 rounded-full animate-pulse" />
        </div>
        <div className="flex-1 p-6">
          <div className="h-8 w-48 bg-slate-100 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-50 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// O componente de proteção de rota com loading state visual
function AuthGuard({ children }: LayoutProps) {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  // Começar como true se já temos sessão (navegação entre páginas)
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(() => {
    // Se session já existe na montagem inicial, já estamos autorizados
    return null
  })

  useEffect(() => {
    if (isPending) return

    if (!session) {
      setIsAuthorized(false)
      router.replace('/login')
      return
    }

    if (session.user?.role) {
      if (!hasBusinessAccess(session.user.role)) {
        setIsAuthorized(false)
        router.replace('/login?error=access_denied')
        return
      }

      if (session.user.role === 'supplierOwner') {
        setIsAuthorized(false)
        router.replace('/supplier-dashboard')
        return
      }
    }

    // Usuário autorizado
    setIsAuthorized(true)
  }, [session, isPending, router])

  // Se temos sessão e não está pendente, renderizar children imediatamente
  // Isso evita o flash durante navegação entre páginas
  if (session?.user && !isPending) {
    return <>{children}</>
  }

  // Mostrar skeleton apenas no carregamento inicial
  if (isPending || isAuthorized === null) {
    return <LayoutSkeleton />
  }

  // Se não autorizado, ainda mostra skeleton enquanto redireciona
  if (!session || !session.user) {
    return <LayoutSkeleton />
  }

  return <>{children}</>
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
