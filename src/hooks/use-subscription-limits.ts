'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from '@/lib/auth-client'
import toast from 'react-hot-toast'

interface UsageData {
  planId: string
  limits: {
    orders: number
    products: number
    tables: number
    users: number
  }
  usage: {
    orders: number
    products: number
    tables: number
    users: number
  }
  features: {
    hasAdvancedAnalytics: boolean
    hasPrioritySupport: boolean
    hasCustomBranding: boolean
  }
}

export function useSubscriptionLimits() {
  const { data: session, isPending } = useSession()
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsageData = useCallback(async () => {
    if (!session?.user) {
      setUsageData(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/subscription/usage')
      
      if (!response.ok) {
        if (response.status === 401) {
          // Usuário não autenticado
          setUsageData(null)
          setError('Não autenticado')
          return
        }
        throw new Error('Erro ao carregar dados de uso')
      }
      
      const data = await response.json()
      setUsageData(data)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(message)
      console.error('Erro ao buscar dados de uso:', err)
    } finally {
      setIsLoading(false)
    }
  }, [session?.user])

  useEffect(() => {
    if (!isPending) {
      fetchUsageData()
    }
  }, [fetchUsageData, isPending])

  // Verificar se pode criar um novo item
  const canCreate = (type: 'order' | 'product' | 'table' | 'user'): boolean => {
    if (!usageData) return false

    const limit = usageData.limits[`${type}s` as keyof typeof usageData.limits]
    const current = usageData.usage[`${type}s` as keyof typeof usageData.usage]

    // -1 significa ilimitado
    if (limit === -1) return true

    return current < limit
  }

  // Obter porcentagem de uso
  const getUsagePercentage = (type: 'order' | 'product' | 'table' | 'user'): number => {
    if (!usageData) return 0

    const limit = usageData.limits[`${type}s` as keyof typeof usageData.limits]
    const current = usageData.usage[`${type}s` as keyof typeof usageData.usage]

    if (limit === -1) return 0 // Ilimitado
    
    return Math.min((current / limit) * 100, 100)
  }

  // Verificar se está próximo do limite (80% ou mais)
  const isNearLimit = (type: 'order' | 'product' | 'table' | 'user'): boolean => {
    return getUsagePercentage(type) >= 80
  }

  // Verificar se atingiu o limite
  const hasReachedLimit = (type: 'order' | 'product' | 'table' | 'user'): boolean => {
    return getUsagePercentage(type) >= 100
  }

  // Tentar criar um item e lidar com limites
  const tryCreate = async (
    type: 'order' | 'product' | 'table' | 'user',
    createFn: () => Promise<unknown>
  ) => {
    // Verificar limite no frontend primeiro
    if (!canCreate(type)) {
      const messages = {
        order: 'Limite mensal de pedidos atingido',
        product: 'Limite de produtos atingido',
        table: 'Limite de mesas atingido',
        user: 'Limite de usuários atingido',
      }
      
      toast.error(`${messages[type]}. Faça upgrade do seu plano para continuar.`)
      return { success: false, needsUpgrade: true }
    }

    try {
      const result = await createFn()
      
      // Atualizar dados de uso após criação bem-sucedida
      await fetchUsageData()
      
      return { success: true, data: result }
    } catch (error: unknown) {
      // Se o erro for de limite do backend, mostrar mensagem específica
      if (error && typeof error === 'object' && 'status' in error && 'needsUpgrade' in error) {
        const limitError = error as { status: number; needsUpgrade: boolean; message?: string }
        if (limitError.status === 403 && limitError.needsUpgrade) {
          toast.error(limitError.message || 'Limite atingido. Faça upgrade do seu plano.')
          return { success: false, needsUpgrade: true }
        }
      }
      
      throw error
    }
  }

  // Verificar se tem acesso a uma funcionalidade
  const hasFeature = (feature: 'analytics' | 'priority_support' | 'custom_branding'): boolean => {
    if (!usageData) return false

    const featureMap = {
      analytics: usageData.features.hasAdvancedAnalytics,
      priority_support: usageData.features.hasPrioritySupport,
      custom_branding: usageData.features.hasCustomBranding,
    }

    return featureMap[feature] || false
  }

  return {
    usageData,
    isLoading: isLoading || isPending,
    error,
    canCreate,
    getUsagePercentage,
    isNearLimit,
    hasReachedLimit,
    tryCreate,
    hasFeature,
    refreshUsage: fetchUsageData,
  }
}
