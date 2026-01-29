'use client'

import { useEffect, useCallback } from 'react'
import { registerClientSession, getClientSession, clearClientSession } from '@/actions/client-session'

/**
 * Hook para gerenciar a sessão do cliente baseado em deviceId
 * Persiste o estado através de reloads da página
 */
export function useClientSession() {
  // Gerar ou recuperar device ID do localStorage
  const getDeviceId = useCallback(() => {
    try {
      let deviceId = localStorage.getItem('fastlivery_device_id')
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem('fastlivery_device_id', deviceId)
      }
      return deviceId
    } catch (error) {
      // Se localStorage não está disponível, gerar no memory
      return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }, [])

  // Registrar sessão
  const registerSession = useCallback(async (orderId: string, businessSlug: string, tableNumber?: string) => {
    try {
      const deviceId = getDeviceId()
      const result = await registerClientSession({
        deviceId,
        orderId,
        businessSlug,
        tableNumber
      })

      if (result.success) {
        // Também guardar no localStorage como fallback
        try {
          localStorage.setItem('fastlivery_current_order', JSON.stringify({
            deviceId,
            orderId,
            businessSlug,
            tableNumber,
            timestamp: new Date().toISOString()
          }))
        } catch (e) {
          // Ignorar erros de localStorage
        }
      }

      return result
    } catch (error) {
      console.error('Erro ao registrar sessão:', error)
      return { success: false, error: 'Falha ao registrar sessão' }
    }
  }, [getDeviceId])

  // Recuperar sessão
  const getSession = useCallback(async () => {
    try {
      const deviceId = getDeviceId()
      const result = await getClientSession(deviceId)

      if (result.success && result.data) {
        return result.data
      }

      // Fallback para localStorage
      try {
        const stored = localStorage.getItem('fastlivery_current_order')
        if (stored) {
          const data = JSON.parse(stored)
          return data
        }
      } catch (e) {
        // Ignorar erros
      }

      return null
    } catch (error) {
      console.error('Erro ao recuperar sessão:', error)
      return null
    }
  }, [getDeviceId])

  // Limpar sessão
  const clearSession = useCallback(async () => {
    try {
      const deviceId = getDeviceId()
      await clearClientSession(deviceId)
      localStorage.removeItem('fastlivery_current_order')
      return true
    } catch (error) {
      console.error('Erro ao limpar sessão:', error)
      return false
    }
  }, [getDeviceId])

  return {
    getDeviceId,
    registerSession,
    getSession,
    clearSession
  }
}
