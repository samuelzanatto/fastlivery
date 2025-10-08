import { supabase, supabaseAdmin } from '@/lib/supabase'
import type { RealtimeMessage, RealtimeMessageType } from './types'

type RealtimeChannelType = ReturnType<typeof supabase.channel>

export class RealtimeManager {
  private channels: Map<string, RealtimeChannelType> = new Map()
  private subscriptions: Map<string, (message: RealtimeMessage) => void> = new Map()

  /**
   * Inscreve-se em um canal do Supabase Realtime (broadcast + database changes)
   */
  subscribe(
    channelName: string, 
    callback: (message: RealtimeMessage) => void,
    options: { private?: boolean; table?: string; schema?: string } = { private: true }
  ): RealtimeChannelType {
    // Remove canal existente se houver
    this.unsubscribe(channelName)

    // Configuração padrão com autenticação habilitada
    const requestedPrivate = options.private ?? true
    const channel = supabase.channel(channelName, {
      config: { 
        private: requestedPrivate, // Agora usa autenticação
        broadcast: { self: false },
        presence: { key: channelName }
      }
    })

    // Configurar listener para mensagens broadcast (custom events)
    channel.on('broadcast', { event: '*' }, (envelope: unknown) => {
      try {
        const envObj = envelope as { payload?: RealtimeMessage; event?: string }
        const message = envObj.payload
        
        if (!message || typeof message !== 'object') {
          console.debug('[RealtimeManager] Broadcast envelope sem payload válido:', envelope)
          return
        }
        
        // Validar se é uma RealtimeMessage válida
        if (!('type' in message) || !('timestamp' in message)) {
          console.debug('[RealtimeManager] Broadcast payload não é RealtimeMessage válida:', message)
          return
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[RealtimeManager] Broadcast no canal ${channelName}:`, {
            type: message.type,
            timestamp: message.timestamp,
            hasPayload: !!message.payload
          })
        }

        callback(message as RealtimeMessage)
      } catch (error) {
        console.error('[RealtimeManager] Erro ao processar broadcast:', error)
        console.error('[RealtimeManager] Envelope original:', envelope)
      }
    })

    // Configurar listener para mudanças do banco de dados (postgres_changes)
    if (options.table) {
      channel.on('postgres_changes', {
        event: '*',
        schema: options.schema || 'public',
        table: options.table
      }, (payload: unknown) => {
        try {
          console.log(`[RealtimeManager] ✅ Database change no canal ${channelName}:`, payload)
          
          // Converter evento do banco em RealtimeMessage
          const dbEvent = payload as {
            eventType: string
            new: Record<string, unknown>
            old: Record<string, unknown>
            schema: string
            table: string
            commit_timestamp: string
          }

          const messageType: RealtimeMessageType = dbEvent.eventType === 'INSERT' ? 'database_insert' :
                                          dbEvent.eventType === 'UPDATE' ? 'database_update' :
                                          dbEvent.eventType === 'DELETE' ? 'database_delete' : 'database_update'

          const realtimeMessage: RealtimeMessage = {
            id: crypto.randomUUID(),
            type: messageType,
            timestamp: new Date(dbEvent.commit_timestamp).getTime(),
            payload: {
              id: crypto.randomUUID(),
              eventType: dbEvent.eventType,
              schema: dbEvent.schema,
              table: dbEvent.table,
              new: dbEvent.new,
              old: dbEvent.old,
              commit_timestamp: dbEvent.commit_timestamp
            },
            metadata: {
              source: 'postgres_changes',
              table: dbEvent.table,
              schema: dbEvent.schema
            }
          }

          callback(realtimeMessage)
        } catch (error) {
          console.error('[RealtimeManager] Erro ao processar database change:', error)
          console.error('[RealtimeManager] Payload original:', payload)
        }
      })
    }

    // Subscrever ao canal com retry automático e backoff exponencial
    let retryCount = 0
    const maxRetries = 5
    const baseDelay = 1000
    
    const handleSubscription = (status: string) => {
      
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Conectado ao canal: ${channelName}`)
        retryCount = 0 // Reset contador em conexão bem-sucedida
      } else if (status === 'CHANNEL_ERROR') {
        const errorMsg = `Erro ao conectar ao canal: ${channelName}`
        console.error(`❌ ${errorMsg}`)
        this.scheduleReconnect(channelName, channel, retryCount++, maxRetries, baseDelay)
      } else if (status === 'TIMED_OUT') {
        const errorMsg = `Timeout ao conectar ao canal: ${channelName}`
        console.error(`⏱️ ${errorMsg}`)
        this.scheduleReconnect(channelName, channel, retryCount++, maxRetries, baseDelay * 2)
      } else if (status === 'CLOSED') {
        console.warn(`🔌 Canal fechado: ${channelName}`)
        this.scheduleReconnect(channelName, channel, retryCount++, maxRetries, baseDelay)
      }
    }
    
    channel.subscribe(handleSubscription)

    // Armazenar referências
    this.channels.set(channelName, channel)
    this.subscriptions.set(channelName, callback)

    return channel
  }

  /**
   * Remove inscrição de um canal
   */
  unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName)
    if (channel) {
      supabase.removeChannel(channel)
      this.channels.delete(channelName)
      this.subscriptions.delete(channelName)
      console.log(`🔌 Desconectado do canal: ${channelName}`)
    }
  }

  /**
   * Remove todas as inscrições
   */
  unsubscribeAll(): void {
    for (const channelName of this.channels.keys()) {
      this.unsubscribe(channelName)
    }
  }

  /**
   * Envia uma mensagem para um canal específico
   */
  async sendMessage(
    channelName: string, 
    message: RealtimeMessage
  ): Promise<'ok' | 'error' | 'timed_out'> {
    const channel = this.channels.get(channelName)
    if (!channel) {
      console.error(`Canal não encontrado: ${channelName}`)
      return 'error'
    }

    try {
      const response = await channel.send({
        type: 'broadcast',
        event: message.type,
        payload: message
      })
      
      // O response já é diretamente o status string
      return response as 'ok' | 'error' | 'timed_out'
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      return 'error'
    }
  }

  /**
   * Envia mensagem via API REST do Supabase
   */
  static async sendMessageViaREST(
    channelName: string,
    message: RealtimeMessage
  ): Promise<void> {
    try {
      const { error } = await supabaseAdmin.rpc('broadcast_message', {
        channel_name: channelName,
        event_name: message.type,
        payload: message
      })

      if (error) {
        console.error('Erro ao enviar mensagem via REST:', error)
        throw error
      }
    } catch (error) {
      console.error('Erro na função sendMessageViaREST:', error)
      throw error
    }
  }

  /**
   * Obtém status de conexão de um canal
   */
  getChannelStatus(channelName: string): string | null {
    const channel = this.channels.get(channelName)
    return channel ? channel.state : null
  }

  /**
   * Lista todos os canais ativos
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys())
  }

  /**
   * Agenda reconexão com backoff exponencial
   */
  private scheduleReconnect(
    channelName: string, 
    channel: RealtimeChannelType, 
    retryCount: number, 
    maxRetries: number, 
    baseDelay: number
  ): void {
    if (retryCount >= maxRetries) {
      console.error(`❌ Máximo de tentativas excedido para canal: ${channelName}`)
      return
    }
    
    if (!this.channels.has(channelName)) {
      console.debug(`🚫 Canal ${channelName} removido, cancelando reconexão`)
      return
    }
    
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), 30000) // Máximo 30s
    console.log(`🔄 Reconectando canal ${channelName} em ${delay}ms (tentativa ${retryCount + 1}/${maxRetries})`)
    
    setTimeout(() => {
      if (this.channels.has(channelName)) {
        channel.subscribe()
      }
    }, delay)
  }
}

// Instância singleton para uso global
export const realtimeManager = new RealtimeManager()

// Hook para cleanup automático
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    realtimeManager.unsubscribeAll()
  })
}