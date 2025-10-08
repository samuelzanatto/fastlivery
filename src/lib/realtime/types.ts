// Tipos de mensagens realtime
export type RealtimeMessageType = 
  | 'business_order_created'
  | 'business_order_updated' 
  | 'business_order_status_changed'
  | 'whatsapp_order_created'
  | 'whatsapp_order_updated'
  | 'whatsapp_order_processed'
  | 'company_notification'
  | 'company_alert'
  | 'company_update'
  | 'dashboard_stats'
  | 'dashboard_chart'
  | 'dashboard_summary'
  | 'database_insert'
  | 'database_update'
  | 'database_delete'

export interface RealtimeMessage {
  id?: string
  type: RealtimeMessageType
  payload: OrderRealtimePayload | WhatsAppOrderRealtimePayload | DatabaseChangePayload | Record<string, unknown>
  timestamp: string | number
  companyId?: string
  businessId?: string
  supplierId?: string
  orderId?: string
  metadata?: Record<string, unknown>
}

export interface DatabaseChangePayload {
  id?: string
  eventType: string
  schema: string
  table: string
  new: Record<string, unknown>
  old: Record<string, unknown>
  commit_timestamp: string
}

export interface OrderRealtimePayload {
  id: string
  orderNumber: string
  status: string
  type: string
  customerName: string
  customerPhone: string
  total: number
  businessId: string
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

export interface WhatsAppOrderRealtimePayload {
  id: string
  phone: string
  companyId: string
  supplierIds: string[]
  items: Array<{
    serviceId: string
    name: string
    quantity: number
    unitPrice: number
  }>
  totalEstimated: number
  status: string
  createdAt: string
}

export interface RealtimeChannel {
  name: string
  topic: string
  private: boolean
}

// Tipos de canal por contexto
export const CHANNEL_TYPES = {
  // Pedidos de negócios (restaurantes)
  BUSINESS_ORDERS: 'business-orders',
  
  // Pedidos do WhatsApp (suppliers)
  SUPPLIER_WHATSAPP_ORDERS: 'supplier-whatsapp-orders',
  
  // Notificações gerais da empresa
  COMPANY_NOTIFICATIONS: 'company-notifications',
  
  // Dashboard geral
  DASHBOARD_UPDATES: 'dashboard-updates'
} as const

export type ChannelType = typeof CHANNEL_TYPES[keyof typeof CHANNEL_TYPES]

// Funções para gerar nomes de canais
export function getBusinessOrdersChannel(businessId: string): string {
  return `${CHANNEL_TYPES.BUSINESS_ORDERS}:${businessId}`
}

export function getSupplierWhatsAppOrdersChannel(supplierId: string): string {
  return `${CHANNEL_TYPES.SUPPLIER_WHATSAPP_ORDERS}:${supplierId}`
}

export function getCompanyNotificationsChannel(companyId: string): string {
  return `${CHANNEL_TYPES.COMPANY_NOTIFICATIONS}:${companyId}`
}

export function getDashboardUpdatesChannel(entityId: string): string {
  return `${CHANNEL_TYPES.DASHBOARD_UPDATES}:${entityId}`
}