'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'

interface RestaurantStatus {
  isOpen: boolean
  canAcceptOrders: boolean
  message?: string
  nextChange?: string
}

interface UseRestaurantStatusOptions {
  slug: string
  enabled?: boolean
  refreshInterval?: number // em ms, padrão 30 segundos
}

export function useRestaurantStatus({ 
  slug, 
  enabled = true, 
  refreshInterval = 30000 
}: UseRestaurantStatusOptions) {
  const [status, setStatus] = useState<RestaurantStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!enabled || !slug) {
      return
    }

    try {
      const response = await fetch(`/api/restaurant/${slug}/status`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`Status API error: ${response.status}`)
      }

      const data = await response.json()
      
      // Só atualizar o estado se houve mudança real
      setStatus(prevStatus => {
        if (!prevStatus || 
            prevStatus.isOpen !== data.isOpen ||
            prevStatus.canAcceptOrders !== data.canAcceptOrders ||
            prevStatus.message !== data.message ||
            prevStatus.nextChange !== data.nextChange) {
          return data
        }
        return prevStatus // Retornar o mesmo objeto para evitar re-render
      })
      setError(null)
    } catch (err) {
      console.error('Erro ao buscar status do restaurante:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      // Manter status anterior em caso de erro
    } finally {
      setIsLoading(false)
    }
  }, [slug, enabled])

  // Buscar status inicial
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Polling periódico com otimização de visibilidade
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) {
      return
    }

    const runPolling = () => {
      // Só fazer polling se a página estiver visível
      if (!document.hidden) {
        fetchStatus()
      }
    }

    // Primeira execução imediata
    const interval = setInterval(runPolling, refreshInterval)

    // Listener para visibilidade da página
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Quando a página ficar visível novamente, fazer fetch imediato
        fetchStatus()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, refreshInterval, fetchStatus])

  // Método para forçar atualização
  const refresh = useCallback(() => {
    setIsLoading(true)
    fetchStatus()
  }, [fetchStatus])

  // Memoizar o retorno para evitar re-renders desnecessários
  return useMemo(() => ({
    status,
    isLoading,
    error,
    refresh
  }), [status, isLoading, error, refresh])
}