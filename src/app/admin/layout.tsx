'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from '@/lib/auth/auth-client'

interface AdminLayoutProps {
  children: React.ReactNode
}

// Loading skeleton para área admin
function AdminLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
    </div>
  )
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, isPending } = useSession()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  // Páginas públicas do admin (login)
  const isPublicPage = pathname === '/admin/login'

  useEffect(() => {
    // Não fazer nada enquanto carrega
    if (isPending) {
      return
    }

    // Se é página pública
    if (isPublicPage) {
      // Se já está logado como platformAdmin, redirecionar para dashboard
      const role = (session?.user as { role?: string } | undefined)?.role
      if (role === 'platformAdmin' || role === 'platformSupport') {
        router.replace('/admin/dashboard')
      } else {
        setIsAuthorized(true)
      }
      return
    }

    // Se não está logado, redirecionar para login
    if (!session) {
      setIsAuthorized(false)
      router.replace('/admin/login')
      return
    }

    // Verificar se tem role de plataforma
    const role = (session.user as { role?: string } | undefined)?.role
    if (role !== 'platformAdmin' && role !== 'platformSupport') {
      setIsAuthorized(false)
      router.replace('/admin/login?error=access_denied')
      return
    }

    setIsAuthorized(true)
  }, [session, isPending, router, isPublicPage])

  // Mostrar loading enquanto verifica auth
  if (isPending || isAuthorized === null) {
    return <AdminLoadingSkeleton />
  }

  return <>{children}</>
}
