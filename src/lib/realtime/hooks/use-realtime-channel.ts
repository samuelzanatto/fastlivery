'use client'

import { useEffect, useRef, useState } from 'react'
import { realtimeManager } from '../manager'
import type { RealtimeMessage } from '../types'

/**
 * Hook para gerenciar conexão com canal realtime
 */
export function useRealtimeChannel(
  channelName: string,
  onMessage: (message: RealtimeMessage) => void,
  options: { 
    enabled?: boolean
    private?: boolean
    table?: string
    schema?: string
  } = { enabled: true, private: true }
) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const callbackRef = useRef(onMessage)

  // Atualizar callback ref quando a função mudar
  useEffect(() => {
    callbackRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    if (!options.enabled || !channelName) {
      setIsConnected(false)
      setError(null)
      return
    }

    let mounted = true
    let statusInterval: NodeJS.Timeout

    const initializeConnection = async () => {
      try {
        // Aguardar um momento para evitar múltiplas inicializações simultâneas
        await new Promise(resolve => setTimeout(resolve, 100))
        
        if (!mounted) return

        realtimeManager.subscribe(
          channelName,
          (message) => {
            if (mounted) {
              callbackRef.current(message)
            }
          },
          { 
            private: options.private,
            table: options.table,
            schema: options.schema
          }
        )

        // Monitorar status da conexão
        const checkConnection = () => {
          if (!mounted) return
          
          const status = realtimeManager.getChannelStatus(channelName)
          const connected = status === 'joined'
          
          setIsConnected(connected)
          
          if (status === 'errored' || status === 'channel_error') {
            setError('Erro na conexão do canal')
          } else if (status === 'timed_out') {
            setError('Timeout na conexão')
          } else if (status === 'closed' && connected) {
            setError('Canal fechado inesperadamente')
          } else if (connected) {
            setError(null)
          }
        }

        // Verificar status inicial após um breve delay
        setTimeout(checkConnection, 1000)

        // Verificar status periodicamente com intervalo maior
        statusInterval = setInterval(checkConnection, 10000)

      } catch (err) {
        if (mounted) {
          console.error('[useRealtimeChannel] Erro ao conectar:', err)
          setError(err instanceof Error ? err.message : 'Erro desconhecido')
          setIsConnected(false)
        }
      }
    }

    initializeConnection()

    return () => {
      mounted = false
      if (statusInterval) {
        clearInterval(statusInterval)
      }
      realtimeManager.unsubscribe(channelName)
      setIsConnected(false)
      setError(null)
    }
  }, [channelName, options.enabled, options.private, options.table, options.schema])

  const sendMessage = async (message: RealtimeMessage) => {
    try {
      const result = await realtimeManager.sendMessage(channelName, message)
      if (result === 'error') {
        setError('Erro ao enviar mensagem')
      }
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar mensagem'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  return {
    isConnected,
    error,
    sendMessage
  }
}