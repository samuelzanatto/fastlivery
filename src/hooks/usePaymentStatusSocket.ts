"use client"

import { useEffect, useState } from 'react'
import { useSocket } from './use-socket'

export interface PaymentRealtimeUpdate {
  paymentId: string
  orderId?: string
  orderNumber?: string
  restaurantId: string
  status: string // APPROVED | REJECTED | CANCELLED | etc
  message?: string
  timestamp: string | Date
}

interface UsePaymentStatusSocketParams {
  restaurantId?: string
  orderId?: string
  autoJoinRestaurant?: boolean
  onUpdate?: (update: PaymentRealtimeUpdate) => void
  stopOnStatuses?: string[]
}

export function usePaymentStatusSocket({
  restaurantId,
  orderId,
  autoJoinRestaurant = true,
  onUpdate,
  stopOnStatuses = ['APPROVED','REJECTED','CANCELLED']
}: UsePaymentStatusSocketParams) {
  const { socket, isConnected, on, emit: _emit } = useSocket({ restaurantId: autoJoinRestaurant ? restaurantId : undefined, orderId })
  const [lastUpdate, setLastUpdate] = useState<PaymentRealtimeUpdate | null>(null)
  const [active, setActive] = useState(true)

  useEffect(() => {
    if (!isConnected || !active) return

    const unsubscribe = on('payment-update', (data: unknown) => {
      const update = data as PaymentRealtimeUpdate
      // Filtrar por restaurante ou pedido se fornecido
      if (restaurantId && update.restaurantId !== restaurantId) return
      if (orderId && update.orderId !== orderId) return

      setLastUpdate(update)
      onUpdate?.(update)

      if (stopOnStatuses.includes(update.status)) {
        setActive(false)
      }
    })

    return () => { unsubscribe() }
  }, [isConnected, active, on, restaurantId, orderId, stopOnStatuses, onUpdate])

  return { socket, isConnected, lastUpdate, active }
}
