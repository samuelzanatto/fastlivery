'use client'

import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

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
  const [socket, setSocketState] = useState<Socket | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const maxRetries = 5

  useEffect(() => {
    let cancelled = false

    async function init() {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const socketUrl = baseUrl.replace(':3000', ':3001')

      try {
        // Tentar ping para inicializar rota e servidor
        await fetch(`${baseUrl}/api/socket`).catch(() => {})
  } catch {
        // Ignorar erro de pre-flight
      }

      if (cancelled) return

      const socketInstance = io(socketUrl, {
        path: '/api/socketio',
        addTrailingSlash: false,
        reconnection: false, // controle manual
        timeout: 5000,
        transports: ['websocket', 'polling']
      })

  socketRef.current = socketInstance
  setSocketState(socketInstance)

      socketInstance.on('connect', () => {
        console.log('Conectado ao Socket.IO')
        setIsConnected(true)
        setAttempt(0)
        if (options.restaurantId) socketInstance.emit('join-restaurant', options.restaurantId)
        if (options.userId) socketInstance.emit('join-user', options.userId)
        if (options.orderId) socketInstance.emit('join-order', options.orderId)
      })

      socketInstance.on('connect_error', (err) => {
        console.warn('Erro conexão socket:', err.message)
        socketInstance.close()
        if (attempt < maxRetries) {
          const nextAttempt = attempt + 1
            setAttempt(nextAttempt)
          const delay = Math.min(1000 * 2 ** nextAttempt, 10000)
          setTimeout(() => {
            if (!cancelled) init()
          }, delay)
        }
      })

      socketInstance.on('disconnect', (reason) => {
        console.log('Desconectado do Socket.IO:', reason)
        setIsConnected(false)
        if (!cancelled && attempt < maxRetries) {
          const nextAttempt = attempt + 1
          setAttempt(nextAttempt)
          const delay = Math.min(1000 * 2 ** nextAttempt, 10000)
          setTimeout(() => {
            if (!cancelled) init()
          }, delay)
        }
      })
    }

    init()

    return () => { cancelled = true; socketRef.current?.close() }
  // Dependências controladas; 'attempt' força re-init; socketRef não precisa
  }, [options.restaurantId, options.userId, options.orderId, attempt])

  // Função para escutar eventos
  const on = (event: string, callback: SocketCallback) => {
    if (socket) {
      socket.on(event, callback)
      return () => socket.off(event, callback)
    }
    return () => {}
  }

  // Função para emitir eventos
  const emit = (event: string, ...args: unknown[]) => {
    if (socket) {
      socket.emit(event, ...args)
    }
  }

  return {
    socket,
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
