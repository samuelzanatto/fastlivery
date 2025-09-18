'use client'

import { useState, useEffect } from 'react'

export interface DynamicPlan {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: string
  limits: {
    maxOrders: number
    maxProducts: number
    maxTables: number
    maxUsers: number
    hasAdvancedAnalytics: boolean
    hasPrioritySupport: boolean
    hasCustomBranding: boolean
  }
  stripePriceId: string
}

export interface UseDynamicPlansReturn {
  plans: DynamicPlan[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useDynamicPlans(): UseDynamicPlansReturn {
  const [plans, setPlans] = useState<DynamicPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlans = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/subscription/plans')
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.plans) {
        // Ordenar planos por preço
        const sortedPlans = data.plans.sort((a: DynamicPlan, b: DynamicPlan) => a.price - b.price)
        setPlans(sortedPlans)
      } else {
        throw new Error('Formato de resposta inválido')
      }
    } catch (err) {
      console.error('Erro ao carregar planos:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }

  const refetch = async () => {
    await fetchPlans()
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  return {
    plans,
    isLoading,
    error,
    refetch
  }
}
