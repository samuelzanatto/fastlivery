'use client'

import { useEffect, useState } from 'react'
import { useClientSession } from './use-client-session'

/**
 * Hook que retorna a sessão atual do cliente (pedido ativo)
 * Sincroniza com o servidor e localStorage
 */
export function useCurrentClientOrder() {
  const { getSession } = useClientSession()
  const [session, setSession] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadSession() {
      try {
        const currentSession = await getSession()
        setSession(currentSession)
      } catch (error) {
        console.error('Erro ao carregar sessão:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSession()
  }, [getSession])

  return {
    session,
    isLoading,
    hasActiveOrder: !!session
  }
}
