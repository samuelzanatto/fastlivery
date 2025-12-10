'use client'

import { useBusinessOrdersRealtime } from './use-business-orders'

interface BusinessOrder {
  id: string
  orderNumber: string
  status: string
  type: string
  tableId?: string | null
  tableNumber?: string | null
  customerName: string
  customerPhone: string
  total: number
  items: Array<{
    id: string
    productId: string
    name: string
    quantity: number
    price: number
  }>
  createdAt: string
  updatedAt: string
}

// Tipos para compatibilidade com código legado
interface LegacyOrder {
  id: string
  displayId?: string
  orderNumber?: string
  customer?: string
  customerName?: string
  items?: string[]
  tableId?: string | null
  tableNumber?: string | null
  status: string
  createdAt: string
  updatedAt: string
  total: number
  type: string
  [key: string]: unknown // Para outros campos extras
}

interface LegacyOrdersRealtimeOptions {
  onOrderCreate?: (order: LegacyOrder) => void
  onOrderUpdate?: (order: LegacyOrder) => void
  onOrderDelete?: (orderId: string) => void
}

/**
 * Hook de compatibilidade com o sistema realtime legado
 * Mapeia o novo sistema para a interface antiga
 */
export function useOrdersRealtime(
  businessId: string,
  options: LegacyOrdersRealtimeOptions = {}
) {
  // Converter callbacks do novo sistema para interface legada
  const convertToLegacyOrder = (businessOrder: BusinessOrder): LegacyOrder => {
    return {
      id: businessOrder.id,
      displayId: businessOrder.orderNumber,
      orderNumber: businessOrder.orderNumber,
      customer: businessOrder.customerName,
      customerName: businessOrder.customerName,
      items: businessOrder.items?.map((item) => 
        `${item.quantity}x ${item.name}`
      ) || [],
      status: businessOrder.status,
      tableId: businessOrder.tableId,
      tableNumber: businessOrder.tableNumber,
      createdAt: businessOrder.createdAt,
      updatedAt: businessOrder.updatedAt,
      total: businessOrder.total,
      type: businessOrder.type
    }
  }

  const { isConnected, orders, newOrderCount, error } = useBusinessOrdersRealtime({
    businessId,
    enabled: !!businessId,
    onOrderCreated: (order) => {
      const legacyOrder = convertToLegacyOrder(order)
      options.onOrderCreate?.(legacyOrder)
    },
    onOrderUpdated: (order) => {
      const legacyOrder = convertToLegacyOrder(order)
      options.onOrderUpdate?.(legacyOrder)
    },
    onOrderStatusChanged: (order) => {
      const legacyOrder = convertToLegacyOrder(order)
      options.onOrderUpdate?.(legacyOrder)
    }
  })

  return {
    ordersConnected: isConnected,
    orders: orders.map(convertToLegacyOrder),
    newOrderCount,
    error
  }
}