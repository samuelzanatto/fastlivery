'use client'

import { useEffect, useState, useCallback } from 'react'

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
      setStatus(data)
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

  // Polling periódico
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) {
      return
    }

    const interval = setInterval(() => {
      fetchStatus()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [enabled, refreshInterval, fetchStatus])

  // Método para forçar atualização
  const refresh = useCallback(() => {
    setIsLoading(true)
    fetchStatus()
  }, [fetchStatus])

  return {
    status,
    isLoading,
    error,
    refresh
  }
}