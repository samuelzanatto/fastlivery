'use client'

import { useState, useEffect, useCallback } from 'react'

interface PushNotificationState {
  isSupported: boolean
  permission: NotificationPermission | null
  subscription: PushSubscription | null
  isLoading: boolean
  error: string | null
}

interface UsePushNotificationsOptions {
  businessId: string
  userId?: string
  vapidPublicKey: string
  onSubscriptionChange?: (subscription: PushSubscription | null) => void
}

// Converte base64 URL-safe para Uint8Array (necessário para VAPID key)
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer as ArrayBuffer
}

export function usePushNotifications({
  businessId,
  userId,
  vapidPublicKey,
  onSubscriptionChange
}: UsePushNotificationsOptions) {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: null,
    subscription: null,
    isLoading: true,
    error: null
  })

  // Verifica suporte e status inicial
  useEffect(() => {
    const checkSupport = async () => {
      // Se não tem VAPID key, push não é suportado
      if (!vapidPublicKey) {
        setState(prev => ({
          ...prev,
          isSupported: false,
          isLoading: false,
          error: null // Não é erro, apenas não está configurado
        }))
        return
      }

      // Verifica suporte a Push API
      const isSupported = 
        'serviceWorker' in navigator && 
        'PushManager' in window &&
        'Notification' in window

      if (!isSupported) {
        setState(prev => ({
          ...prev,
          isSupported: false,
          isLoading: false,
          error: 'Push notifications não são suportadas neste navegador'
        }))
        return
      }

      try {
        // Obtém permissão atual
        const permission = Notification.permission

        // Verifica subscription existente
        const registration = await navigator.serviceWorker.ready
        const existingSubscription = await registration.pushManager.getSubscription()

        setState({
          isSupported: true,
          permission,
          subscription: existingSubscription,
          isLoading: false,
          error: null
        })
      } catch (error) {
        console.error('Erro ao verificar push notifications:', error)
        setState(prev => ({
          ...prev,
          isSupported: true,
          isLoading: false,
          error: 'Erro ao verificar status das notificações'
        }))
      }
    }

    checkSupport()
  }, [vapidPublicKey])

  // Registra Service Worker
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker não é suportado')
    }

    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })

    // Aguarda o Service Worker estar pronto
    await navigator.serviceWorker.ready
    return registration
  }, [])

  // Solicita permissão e cria subscription
  const subscribe = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Primeiro, registra/atualiza o Service Worker
      await registerServiceWorker()

      // Solicita permissão
      const permission = await Notification.requestPermission()
      
      if (permission !== 'granted') {
        setState(prev => ({
          ...prev,
          permission,
          isLoading: false,
          error: permission === 'denied' 
            ? 'Permissão de notificações foi negada. Altere nas configurações do navegador.'
            : 'Permissão de notificações não foi concedida'
        }))
        return null
      }

      // Obtém registration do Service Worker
      const registration = await navigator.serviceWorker.ready

      // Cria subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })

      // Extrai dados da subscription
      const subscriptionJson = subscription.toJSON()

      // Salva no servidor
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessId,
          userId,
          subscription: {
            endpoint: subscriptionJson.endpoint,
            keys: {
              p256dh: subscriptionJson.keys?.p256dh,
              auth: subscriptionJson.keys?.auth
            }
          }
        })
      })

      if (!response.ok) {
        throw new Error('Falha ao salvar subscription no servidor')
      }

      setState(prev => ({
        ...prev,
        permission: 'granted',
        subscription,
        isLoading: false,
        error: null
      }))

      onSubscriptionChange?.(subscription)
      return subscription

    } catch (error) {
      console.error('Erro ao criar push subscription:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro ao ativar notificações'
      }))
      return null
    }
  }, [businessId, userId, vapidPublicKey, registerServiceWorker, onSubscriptionChange])

  // Remove subscription
  const unsubscribe = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      if (state.subscription) {
        // Remove do browser
        await state.subscription.unsubscribe()

        // Remove do servidor
        const subscriptionJson = state.subscription.toJSON()
        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(subscriptionJson.endpoint || '')}&businessId=${businessId}`, {
          method: 'DELETE'
        })
      }

      setState(prev => ({
        ...prev,
        subscription: null,
        isLoading: false,
        error: null
      }))

      onSubscriptionChange?.(null)

    } catch (error) {
      console.error('Erro ao remover push subscription:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro ao desativar notificações'
      }))
    }
  }, [state.subscription, businessId, onSubscriptionChange])

  // Verifica se pode pedir permissão
  const canRequestPermission = state.isSupported && state.permission !== 'denied'

  // Verifica se está inscrito
  const isSubscribed = !!state.subscription

  return {
    ...state,
    canRequestPermission,
    isSubscribed,
    subscribe,
    unsubscribe
  }
}
