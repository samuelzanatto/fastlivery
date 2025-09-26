'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/auth/auth-client'
import { PasswordChangeProvider } from '@/components/auth/password-change-provider'
import { SupplierLayoutProvider } from '@/providers/supplier-layout-provider'
import { SupplierLayoutUI } from '@/components/layout/supplier-layout-ui'

interface LayoutProps {
  children: React.ReactNode
}

function SupplierLayoutContent({ children }: LayoutProps) {
  const router = useRouter()
  const { data: session, isPending } = useSession()

  useEffect(() => {
    if (!isPending && !session) {
      console.log('[SupplierLayout] sem sessão -> redirect /login')
      router.push('/login')
      return
    }

    // Verificar se o usuário é um fornecedor
    if (!isPending && session?.user?.role && session.user.role !== 'supplierOwner') {
      console.log('[SupplierLayout] não é fornecedor -> redirect /dashboard')
      router.push('/dashboard')
      return
    }
  }, [session, isPending, router])

  // Loading state
  if (isPending) {
    return null
  }

  // Sem sessão
  if (!session) {
    return null
  }

  // Não é fornecedor
  if (session.user?.role !== 'supplierOwner') {
    return null
  }

  return <SupplierLayoutUI>{children}</SupplierLayoutUI>
}

export default function SupplierLayout({ children }: LayoutProps) {
  return (
    <PasswordChangeProvider>
      <SupplierLayoutProvider>
        <SupplierLayoutContent>{children}</SupplierLayoutContent>
      </SupplierLayoutProvider>
    </PasswordChangeProvider>
  )
}