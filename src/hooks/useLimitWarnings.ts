'use client'

import { useEffect, useState, useCallback } from 'react'
import { checkSupplierLimitWarnings } from '@/actions/limit-check-actions'

interface LimitWarning {
  type: 'warning' | 'critical'
  resource: string
  message: string
  percentage: number
}

interface UseLimitWarningsReturn {
  warnings: LimitWarning[]
  hasWarnings: boolean
  loading: boolean
  refresh: () => Promise<void>
}

/**
 * Hook para verificar e gerenciar notificações de limites
 */
export function useLimitWarnings(): UseLimitWarningsReturn {
  const [warnings, setWarnings] = useState<LimitWarning[]>([])
  const [hasWarnings, setHasWarnings] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkWarnings = useCallback(async () => {
    setLoading(true)
    try {
      const result = await checkSupplierLimitWarnings()
      setWarnings((result.warnings as LimitWarning[]) || [])
      setHasWarnings(result.hasWarnings || false)
    } catch (error) {
      console.error('Error checking limit warnings:', error)
      setWarnings([])
      setHasWarnings(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkWarnings()
  }, [checkWarnings])

  return {
    warnings,
    hasWarnings,
    loading,
    refresh: checkWarnings
  }
}

/**
 * Hook para verificar se pode executar uma ação antes de tentar
 */
export function useCanPerformAction() {
  const checkAndExecute = async <T>(
    checkFunction: () => Promise<{ canProceed: boolean; error?: string; needsUpgrade?: boolean }>,
    action: () => Promise<T>,
    onLimitReached?: (error: string) => void
  ): Promise<T | { success: false; error: string; needsUpgrade?: boolean }> => {
    try {
      const canProceed = await checkFunction()
      
      if (!canProceed.canProceed) {
        const errorMessage = canProceed.error || 'Limite atingido'
        onLimitReached?.(errorMessage)
        return { success: false, error: errorMessage, needsUpgrade: canProceed.needsUpgrade }
      }

      const result = await action()
      return result
    } catch (error) {
      console.error('Error in checkAndExecute:', error)
      return { success: false, error: 'Erro inesperado' }
    }
  }

  return { checkAndExecute }
}