"use client"

import { useEffect, useRef } from 'react'
import { computeIsOpenNow, parseOpeningHours } from '@/lib/utils/business-hours'

type Options = {
  syncToServer?: boolean
  onStatusChange?: (isOpen: boolean) => void
  intervalMs?: number
}

export function useAutoOpenClose(openingHours?: string | null, opts: Options = {}) {
  const { syncToServer = true, onStatusChange, intervalMs = 60_000 } = opts
  const lastValue = useRef<boolean | null>(null)

  useEffect(() => {
    if (!openingHours) return
    const tick = async () => {
      try {
        const weekly = parseOpeningHours(openingHours)
        const current = computeIsOpenNow(weekly)
        if (lastValue.current === null) {
          lastValue.current = current
          onStatusChange?.(current)
          return
        }
        if (current !== lastValue.current) {
          lastValue.current = current
          onStatusChange?.(current)
          if (syncToServer) {
            await fetch('/api/business/update', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isOpen: current })
            })
          }
        }
      } catch {
        // silencioso
      }
    }

    // primeira avaliação imediata
    tick()
    const id = setInterval(tick, intervalMs)
    return () => clearInterval(id)
  }, [openingHours, intervalMs, onStatusChange, syncToServer])
}
