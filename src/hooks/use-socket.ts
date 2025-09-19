'use client'

import { useEffect, useState, useRef } from 'react'

interface UseSocketOptions {
  restaurantId?: string
  userId?: string
  orderId?: string
}

interface OrderData {
  order: {
    id: string
    orderNumber: string
    customerName: string
    total: number
    type: string
    status: string
    items: Array<{
      id: string
      name: string
      quantity: number
      price: number
    }>
  }
  restaurantId: string
  timestamp: Date
}

interface OrderUpdate {
  orderId: string
  status: string
  message: string
  timestamp: Date
}

interface PaymentUpdate {
  paymentId: string
  status: string
  orderId?: string
  restaurantId: string
  message: string
  timestamp: Date
}

type SocketCallback = (...args: unknown[]) => void

export function useSocket(options: UseSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const listenersRef = useRef<Map<string, SocketCallback[]>>(new Map())
  const [attempt, setAttempt] = useState(0)
  const maxRetries = 5

  const emit = (event: string, ...args: unknown[]) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Se há apenas um argumento, enviá-lo diretamente
      // Caso contrário, enviar como array
      const data = args.length === 1 ? args[0] : args
      wsRef.current.send(JSON.stringify({ type: event, data }))
    }
  }

  const on = (event: string, callback: SocketCallback) => {
    const listeners = listenersRef.current.get(event) || []
    listeners.push(callback)
    listenersRef.current.set(event, listeners)

    return () => {
      const currentListeners = listenersRef.current.get(event) || []
      const index = currentListeners.indexOf(callback)
      if (index > -1) {
        currentListeners.splice(index, 1)
        listenersRef.current.set(event, currentListeners)
      }
    }
  }

  useEffect(() => {
    let cancelled = false
    let retryTimeout: NodeJS.Timeout

    function connect() {
      if (cancelled) return
      
      // Não tentar conectar se já há uma conexão ativa
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        return
      }
      
      // Fechar conexão anterior se existir
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/socket`

      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          console.log('WebSocket conectado')
          setIsConnected(true)
          setAttempt(0)

          // Join rooms after connection
          if (options.restaurantId) emit('join-restaurant', options.restaurantId)
          if (options.userId) emit('join-user', options.userId)
          if (options.orderId) emit('join-order', options.orderId)
        }

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            const { type, data } = message

            // Trigger listeners for this event type
            const listeners = listenersRef.current.get(type) || []
            listeners.forEach(callback => callback(data))
          } catch (error) {
            console.error('Erro ao processar mensagem WebSocket:', error)
          }
        }

        ws.onclose = (event) => {
          console.log('WebSocket desconectado:', event.code, event.reason)
          setIsConnected(false)
          wsRef.current = null

          // Só tentar reconectar se não foi cancelado e não foi um fechamento intencional
          if (!cancelled && event.code !== 1000 && attempt < maxRetries) {
            const nextAttempt = attempt + 1
            setAttempt(nextAttempt)
            const delay = Math.min(1000 * Math.pow(2, nextAttempt), 10000)
            retryTimeout = setTimeout(() => {
              if (!cancelled) connect()
            }, delay)
          }
        }

        ws.onerror = (error) => {
          console.error('Erro WebSocket:', error)
          // Não logar como erro se é apenas desenvolvimento
          if (process.env.NODE_ENV === 'development') {
            console.warn('WebSocket falhou (normal em desenvolvimento com hot reload)')
          }
        }
      } catch (error) {
        console.error('Erro ao criar WebSocket:', error)
        if (!cancelled && attempt < maxRetries) {
          const nextAttempt = attempt + 1
          setAttempt(nextAttempt)
          retryTimeout = setTimeout(() => {
            if (!cancelled) connect()
          }, 2000)
        }
      }
    }

    // Pequeno delay para evitar tentativas imediatas em desenvolvimento
    const initialDelay = process.env.NODE_ENV === 'development' ? 500 : 0
    const initialTimeout = setTimeout(connect, initialDelay)

    return () => {
      cancelled = true
      clearTimeout(initialTimeout)
      clearTimeout(retryTimeout)
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close(1000, 'Component unmounting')
        wsRef.current = null
      }
    }
  }, [options.restaurantId, options.userId, options.orderId, attempt])

  return {
    socket: wsRef.current,
    isConnected,
    on,
    emit
  }
}

// Hook específico para restaurantes
export function useRestaurantSocket(restaurantId: string) {
  const { socket, isConnected, on, emit } = useSocket({ restaurantId })
  const [newOrders, setNewOrders] = useState<OrderData[]>([])
  const [orderUpdates, setOrderUpdates] = useState<(OrderUpdate | PaymentUpdate)[]>([])

  useEffect(() => {
    const unsubscribeNewOrder = on('new-order', (data: unknown) => {
      const orderData = data as OrderData
      console.log('Novo pedido recebido:', orderData)
      setNewOrders(prev => [orderData, ...prev])
      
      // Notificação do navegador
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Novo Pedido!', {
          body: `Pedido #${orderData.order.orderNumber} - ${orderData.order.customerName}`,
          icon: '/favicon.ico'
        })
      }
    })

    const unsubscribePaymentUpdate = on('payment-update', (data: unknown) => {
      const paymentData = data as PaymentUpdate
      console.log('Atualização de pagamento:', paymentData)
      if (paymentData.status === 'APPROVED') {
        setOrderUpdates(prev => [{
          ...paymentData,
          message: 'Pagamento aprovado!'
        }, ...prev])
      }
    })

    return () => {
      unsubscribeNewOrder()
      unsubscribePaymentUpdate()
    }
  }, [on])

  return {
    socket,
    isConnected,
    newOrders,
    orderUpdates,
    clearNewOrders: () => setNewOrders([]),
    clearOrderUpdates: () => setOrderUpdates([]),
    emit
  }
}

// Hook específico para pedidos
export function useOrderSocket(orderId: string) {
  const { socket, isConnected, on, emit } = useSocket({ orderId })
  const [orderStatus, setOrderStatus] = useState<string>('')
  const [updates, setUpdates] = useState<(OrderUpdate | PaymentUpdate)[]>([])

  useEffect(() => {
    const unsubscribeOrderUpdate = on('order-update', (data: unknown) => {
      const orderUpdate = data as OrderUpdate
      console.log('Atualização do pedido:', orderUpdate)
      setOrderStatus(orderUpdate.status)
      setUpdates(prev => [orderUpdate, ...prev])
    })

    const unsubscribePaymentUpdate = on('payment-update', (data: unknown) => {
      const paymentUpdate = data as PaymentUpdate
      console.log('Atualização de pagamento do pedido:', paymentUpdate)
      setUpdates(prev => [paymentUpdate, ...prev])
    })

    return () => {
      unsubscribeOrderUpdate()
      unsubscribePaymentUpdate()
    }
  }, [on])

  return {
    socket,
    isConnected,
    orderStatus,
    updates,
    emit
  }
}
