// Generic order event normalization utility
// This abstracts raw event types from any internal source into a canonical state transition.

import { OrderStatus } from '@prisma/client'

export type RawOrderEvent = {
  eventId: string
  type: string // e.g. ORDER_CREATED, ORDER_CONFIRMED, ORDER_STATUS_CHANGED, ORDER_CANCELLED
  orderNumber?: string
  payload: unknown
  createdAt?: string | Date
}

export interface NormalizedOrderTransition {
  transitionType: string
  fromStatus?: OrderStatus | null
  toStatus?: OrderStatus | null
  reason?: string | null
  metadata?: Record<string, unknown>
  isNoop?: boolean // true if event does not change effective status
  isTerminal?: boolean
}

// Mapping rules: add/extend as more event types or phases are added.
export function normalizeOrderEvent(event: RawOrderEvent, currentStatus?: OrderStatus | null): NormalizedOrderTransition {
  const base = { metadata: { rawType: event.type, rawPayload: event.payload } }

  switch (event.type) {
    case 'ORDER_CREATED':
      if (currentStatus) {
        return { ...base, transitionType: 'IGNORED_DUP_CREATE', fromStatus: currentStatus, toStatus: currentStatus, isNoop: true }
      }
      return { ...base, transitionType: 'CREATED', fromStatus: null, toStatus: OrderStatus.PENDING }
    case 'ORDER_CONFIRMED':
      if (currentStatus === OrderStatus.CONFIRMED) return { ...base, transitionType: 'ALREADY_CONFIRMED', fromStatus: currentStatus, toStatus: currentStatus, isNoop: true }
      return { ...base, transitionType: 'CONFIRMED', fromStatus: currentStatus, toStatus: OrderStatus.CONFIRMED }
    case 'ORDER_PREPARING':
      if (currentStatus === OrderStatus.PREPARING) return { ...base, transitionType: 'ALREADY_PREPARING', fromStatus: currentStatus, toStatus: currentStatus, isNoop: true }
      return { ...base, transitionType: 'PREPARING', fromStatus: currentStatus, toStatus: OrderStatus.PREPARING }
    case 'ORDER_READY':
      if (currentStatus === OrderStatus.READY) return { ...base, transitionType: 'ALREADY_READY', fromStatus: currentStatus, toStatus: currentStatus, isNoop: true }
      return { ...base, transitionType: 'READY', fromStatus: currentStatus, toStatus: OrderStatus.READY }
    case 'ORDER_OUT_FOR_DELIVERY':
      if (currentStatus === OrderStatus.OUT_FOR_DELIVERY) return { ...base, transitionType: 'ALREADY_OUT', fromStatus: currentStatus, toStatus: currentStatus, isNoop: true }
      return { ...base, transitionType: 'OUT_FOR_DELIVERY', fromStatus: currentStatus, toStatus: OrderStatus.OUT_FOR_DELIVERY }
    case 'ORDER_DELIVERED':
      if (currentStatus === OrderStatus.DELIVERED) return { ...base, transitionType: 'ALREADY_DELIVERED', fromStatus: currentStatus, toStatus: currentStatus, isNoop: true, isTerminal: true }
      return { ...base, transitionType: 'DELIVERED', fromStatus: currentStatus, toStatus: OrderStatus.DELIVERED, isTerminal: true }
    case 'ORDER_CANCELLED': {
      if (currentStatus === OrderStatus.CANCELLED) return { ...base, transitionType: 'ALREADY_CANCELLED', fromStatus: currentStatus, toStatus: currentStatus, isNoop: true, isTerminal: true }
      const payload = event.payload as Record<string, unknown> | undefined
      const reason = (payload?.reason as string) || (payload?.cancellationReason as string | undefined)
      return { ...base, transitionType: 'CANCELLED', fromStatus: currentStatus, toStatus: OrderStatus.CANCELLED, reason, isTerminal: true }
    }
    case 'ORDER_STATUS_SYNC': {
      // A synthetic reconciliation event: trust payload.toStatus
      const payload = event.payload as Record<string, unknown> | undefined
      const target = payload?.toStatus as OrderStatus | undefined
      if (!target || target === currentStatus) {
        return { ...base, transitionType: 'SYNC_NOOP', fromStatus: currentStatus, toStatus: currentStatus, isNoop: true }
      }
      const isTerminal = target === OrderStatus.CANCELLED || target === OrderStatus.DELIVERED
      return { ...base, transitionType: 'SYNC_CORRECTION', fromStatus: currentStatus, toStatus: target, isTerminal }
    }
    default:
      return { ...base, transitionType: 'UNMAPPED', fromStatus: currentStatus, toStatus: currentStatus, isNoop: true }
  }
}
