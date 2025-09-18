'use client'

import { AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface PageTransitionProviderProps {
  children: ReactNode
}

export function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const pathname = usePathname()

  // Não aplicar AnimatePresence para rotas internas da dashboard
  // Isso evita recarregamentos desnecessários na navegação da sidebar
  const isDashboardRoute = pathname.startsWith('/dashboard') || 
                          pathname.startsWith('/orders') || 
                          pathname.startsWith('/products') ||
                          pathname.startsWith('/customers') ||
                          pathname.startsWith('/analytics') ||
                          pathname.startsWith('/tables') ||
                          pathname.startsWith('/settings') ||
                          pathname === '/' // Root dashboard

  if (isDashboardRoute) {
    // Para rotas internas da dashboard, retorna sem AnimatePresence
    return <>{children}</>
  }

  // Para outras rotas (landing, login, signup), usa AnimatePresence
  return (
    // Removido initial={false} para permitir animações de entrada nas páginas públicas (ex: /login)
    <AnimatePresence mode="wait">
      <div key={pathname}>
        {children}
      </div>
    </AnimatePresence>
  )
}
