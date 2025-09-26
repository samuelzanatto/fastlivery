import { useEffect, useRef, useState } from 'react'

interface PaymentStatusData {
  order: { id: string; orderNumber: string; status: string; paymentStatus: string }
  payment: { id: string; gatewayId: string; status: string; type: string } | null
}

interface UsePaymentStatusPollingOptions {
  orderNumber?: string
  enabled?: boolean
  intervalMs?: number
  onUpdate?: (data: PaymentStatusData) => void
  stopOn?: (data: PaymentStatusData) => boolean
}

export function usePaymentStatusPolling({
  orderNumber,
  enabled = true,
  intervalMs = 5000,
  onUpdate,
  stopOn
}: UsePaymentStatusPollingOptions) {
  const [data, setData] = useState<PaymentStatusData | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled || !orderNumber) {
      return
    }

    let stopped = false

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/payments/status?order=${orderNumber}`)
        if (!res.ok) throw new Error('Falha ao buscar status')
        const json = await res.json()
        setData(json)
        onUpdate?.(json)
        if (stopOn?.(json)) {
          stopped = true
          setIsRunning(false)
          return
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
      if (!stopped) {
        timerRef.current = setTimeout(fetchStatus, intervalMs)
      }
    }

    setIsRunning(true)
    fetchStatus()

    return () => {
      stopped = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, orderNumber, intervalMs, onUpdate, stopOn])

  return { data, isRunning, error }
}
