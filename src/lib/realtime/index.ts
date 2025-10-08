'use client'

// Core hooks
export { useRealtimeChannel } from './hooks/use-realtime-channel'

// Business hooks
export { useBusinessOrdersRealtime } from './hooks/use-business-orders'

// Supplier hooks
export { useSupplierWhatsAppOrders } from './hooks/use-supplier-whatsapp-orders'

// Legacy compatibility hooks
export { useOrdersRealtime } from './hooks/use-orders-legacy'

// Manager and types
export { realtimeManager, RealtimeManager } from './manager'
export type * from './types'

// Convenience re-exports
export { 
  getBusinessOrdersChannel,
  getSupplierWhatsAppOrdersChannel,
  getCompanyNotificationsChannel,
  getDashboardUpdatesChannel,
  CHANNEL_TYPES
} from './types'