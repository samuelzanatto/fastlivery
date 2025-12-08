import { supabaseAdmin } from '@/lib/supabase'
import type {
  RealtimeMessage,
  RealtimeMessageType,
  OrderRealtimePayload,
  WhatsAppOrderRealtimePayload
} from './types'
import { getBusinessWhatsAppOrdersChannel } from './types'

export class RealtimeBroadcaster {
  /**
   * Envia uma mensagem para um canal específico
   */
  static async send(channel: string, message: RealtimeMessage): Promise<boolean> {
    try {
      console.debug('[RealtimeBroadcaster.send] sending', { channel, type: message.type })
      const { error } = await supabaseAdmin.rpc('send_realtime_message', {
        channel_name: channel,
        event_type: message.type,
        message_payload: message
      })
      if (error) {
        console.error('Erro ao enviar mensagem realtime:', error)
        return false
      }
      console.debug('[RealtimeBroadcaster.send] success', { channel })
      return true
    } catch (error) {
      console.error('Erro no RealtimeBroadcaster:', error)
      return false
    }
  }

  /**
   * Envia notificação de pedido de negócio
   */
  static async broadcastBusinessOrder(
    restaurantId: string,
    type: 'created' | 'updated' | 'status_changed',
    payload: OrderRealtimePayload
  ): Promise<boolean> {
    const channel = `business_orders:${restaurantId}`
    const message: RealtimeMessage = {
      id: crypto.randomUUID(),
      type: `business_order_${type}` as RealtimeMessageType,
      payload,
      timestamp: new Date().toISOString(),
      businessId: restaurantId
    }

    return this.send(channel, message)
  }

  /**
   * Envia notificação de pedido WhatsApp do negócio
   */
  static async broadcastWhatsAppOrder(
    businessId: string,
    type: 'created' | 'updated' | 'processed',
    payload: WhatsAppOrderRealtimePayload
  ): Promise<boolean> {
  // Nome padronizado definido em CHANNEL_TYPES (usa hífens)
  const channel = getBusinessWhatsAppOrdersChannel(businessId)
    const message: RealtimeMessage = {
      id: crypto.randomUUID(),
      type: `whatsapp_order_${type}` as RealtimeMessageType,
      payload,
      timestamp: new Date().toISOString(),
      businessId
    }

    return this.send(channel, message)
  }

  /**
   * Envia notificação para o painel da empresa
   */
  static async broadcastCompanyNotification(
    companyId: string,
    type: 'notification' | 'alert' | 'update',
    payload: Record<string, unknown>
  ): Promise<boolean> {
    const channel = `company_notifications:${companyId}`
    const message: RealtimeMessage = {
      id: crypto.randomUUID(),
      type: `company_${type}` as RealtimeMessageType,
      payload,
      timestamp: new Date().toISOString(),
      companyId
    }

    return this.send(channel, message)
  }

  /**
   * Envia atualização do dashboard
   */
  static async broadcastDashboardUpdate(
    userId: string,
    type: 'stats' | 'chart' | 'summary',
    payload: Record<string, unknown>
  ): Promise<boolean> {
    const channel = `dashboard_updates:${userId}`
    const message: RealtimeMessage = {
      id: crypto.randomUUID(),
      type: `dashboard_${type}` as RealtimeMessageType,
      payload,
      timestamp: new Date().toISOString()
    }

    return this.send(channel, message)
  }

  /**
   * Testa a conectividade do sistema realtime
   */
  static async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin.rpc('test_realtime_connection')
      
      if (error) {
        console.error('Erro ao testar conexão realtime:', error)
        return false
      }

      console.log('Teste de conectividade realtime:', data)
      return true
    } catch (error) {
      console.error('Erro no teste de conectividade:', error)
      return false
    }
  }

  /**
   * Obtém estatísticas do sistema realtime
   */
  static async getStats(): Promise<{
    timestamp: string
    uptime: number
    version: string
    realtime_ready: boolean
  } | null> {
    try {
      const { data, error } = await supabaseAdmin.rpc('get_realtime_stats')
      
      if (error) {
        console.error('Erro ao obter estatísticas realtime:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error)
      return null
    }
  }
}