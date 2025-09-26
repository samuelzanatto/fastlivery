import { prisma } from '@/lib/database/prisma'

// Tipos de eventos auditáveis
export const AUDIT_EVENT_TYPES = {
  // Autenticação
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Registro e verificação
  SIGNUP_SUCCESS: 'SIGNUP_SUCCESS',
  SIGNUP_FAILURE: 'SIGNUP_FAILURE',
  EMAIL_VERIFIED: 'EMAIL_VERIFIED',
  EMAIL_VERIFICATION_FAILED: 'EMAIL_VERIFICATION_FAILED',
  
  // Segurança
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS: 'PASSWORD_RESET_SUCCESS',
  OTP_SENT: 'OTP_SENT',
  OTP_VERIFIED: 'OTP_VERIFIED',
  OTP_FAILED: 'OTP_FAILED',
  
  // Autorização
  ACCESS_DENIED: 'ACCESS_DENIED',
  PERMISSION_ESCALATION: 'PERMISSION_ESCALATION',
  ROLE_CHANGED: 'ROLE_CHANGED',
  
  // Segurança Avançada
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  MULTIPLE_FAILED_ATTEMPTS: 'MULTIPLE_FAILED_ATTEMPTS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED',
  
  // Sistema
  SYSTEM_ACCESS: 'SYSTEM_ACCESS',
  DATA_EXPORT: 'DATA_EXPORT',
  ADMIN_ACTION: 'ADMIN_ACTION'
} as const

export type AuditEventType = typeof AUDIT_EVENT_TYPES[keyof typeof AUDIT_EVENT_TYPES]

// Níveis de severidade para eventos
export const AUDIT_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
} as const

export type AuditSeverity = typeof AUDIT_SEVERITY[keyof typeof AUDIT_SEVERITY]

// Mapeamento de eventos para severidade
const EVENT_SEVERITY_MAP: Record<AuditEventType, AuditSeverity> = {
  // Baixa
  LOGIN_SUCCESS: 'LOW',
  LOGOUT: 'LOW',
  EMAIL_VERIFIED: 'LOW',
  OTP_SENT: 'LOW',
  OTP_VERIFIED: 'LOW',
  SIGNUP_SUCCESS: 'LOW',
  
  // Média
  PASSWORD_CHANGE: 'MEDIUM',
  PASSWORD_RESET_REQUEST: 'MEDIUM',
  PASSWORD_RESET_SUCCESS: 'MEDIUM',
  SESSION_EXPIRED: 'MEDIUM',
  SYSTEM_ACCESS: 'MEDIUM',
  
  // Alta
  LOGIN_FAILURE: 'HIGH',
  SIGNUP_FAILURE: 'HIGH',
  EMAIL_VERIFICATION_FAILED: 'HIGH',
  OTP_FAILED: 'HIGH',
  ACCESS_DENIED: 'HIGH',
  RATE_LIMIT_EXCEEDED: 'HIGH',
  
  // Crítica
  MULTIPLE_FAILED_ATTEMPTS: 'CRITICAL',
  SUSPICIOUS_ACTIVITY: 'CRITICAL',
  PERMISSION_ESCALATION: 'CRITICAL',
  ROLE_CHANGED: 'CRITICAL',
  ACCOUNT_LOCKED: 'CRITICAL',
  ACCOUNT_UNLOCKED: 'CRITICAL',
  DATA_EXPORT: 'CRITICAL',
  ADMIN_ACTION: 'CRITICAL'
}

export interface AuditEventData {
  eventType: AuditEventType
  userId?: string
  email?: string
  ip?: string
  userAgent?: string
  details?: Record<string, unknown>
  resource?: string
  action?: string
  outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED'
  risk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export interface AuditLog {
  id: string
  eventType: AuditEventType
  severity: AuditSeverity
  userId?: string
  email?: string
  ip?: string
  userAgent?: string
  resource?: string
  action?: string
  outcome: string
  details: Record<string, unknown>
  timestamp: Date
  risk?: string
  sessionId?: string
  correlationId?: string
}

class AuditTrail {
  private eventQueue: AuditEventData[] = []
  private isProcessing = false
  private batchSize = 10
  private flushInterval = 5000 // 5 segundos

  constructor() {
    // Processar queue periodicamente
    setInterval(() => {
      this.flushQueue()
    }, this.flushInterval)

    // Flush na saída do processo
    process.on('beforeExit', () => {
      this.flushQueue()
    })
  }

  /**
   * Registra um evento de auditoria
   */
  async logEvent(eventData: AuditEventData): Promise<void> {
    try {
      // Enriquecer dados do evento
      const enrichedEvent: AuditEventData = {
        ...eventData,
        risk: eventData.risk || this.calculateRisk(eventData),
        details: {
          timestamp: new Date().toISOString(),
          ...eventData.details
        }
      }

      // Adicionar à queue para processamento assíncrono
      this.eventQueue.push(enrichedEvent)

      // Se for crítico, processar imediatamente
      const severity = EVENT_SEVERITY_MAP[eventData.eventType]
      if (severity === 'CRITICAL') {
        await this.flushQueue()
      }

      // Log imediato para console em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AUDIT-${severity}] ${eventData.eventType}:`, {
          userId: eventData.userId,
          email: eventData.email,
          ip: eventData.ip,
          outcome: eventData.outcome,
          details: eventData.details
        })
      }

    } catch (error) {
      console.error('[AUDIT-ERROR] Falha ao registrar evento:', error)
      // Em caso de erro, pelo menos logar no console
      console.warn('[AUDIT-FALLBACK]', eventData)
    }
  }

  /**
   * Processa a queue de eventos
   */
  private async flushQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return
    }

    this.isProcessing = true

    try {
      // Processar em batches
      while (this.eventQueue.length > 0) {
        const batch = this.eventQueue.splice(0, this.batchSize)
        await this.persistBatch(batch)
      }
    } catch (error) {
      console.error('[AUDIT-ERROR] Falha ao processar queue:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Persiste batch de eventos no banco
   */
  private async persistBatch(events: AuditEventData[]): Promise<void> {
    try {
      const auditLogs = events.map(event => ({
        eventType: event.eventType,
        severity: EVENT_SEVERITY_MAP[event.eventType],
        userId: event.userId || null,
        email: event.email || null,
        ip: event.ip || null,
        userAgent: event.userAgent || null,
        resource: event.resource || null,
        action: event.action || null,
        outcome: event.outcome,
        details: event.details || {},
        risk: event.risk || null,
        timestamp: new Date(),
        correlationId: this.generateCorrelationId()
      }))

      // Inserir no banco (assumindo tabela audit_logs)
      await prisma.$executeRaw`
        INSERT INTO audit_logs 
        (event_type, severity, user_id, email, ip, user_agent, resource, action, outcome, details, risk, timestamp, correlation_id)
        VALUES ${auditLogs.map(log => 
          `(${[
            `'${log.eventType}'`,
            `'${log.severity}'`,
            log.userId ? `'${log.userId}'` : 'NULL',
            log.email ? `'${log.email}'` : 'NULL',
            log.ip ? `'${log.ip}'` : 'NULL',
            log.userAgent ? `'${log.userAgent}'` : 'NULL',
            log.resource ? `'${log.resource}'` : 'NULL',
            log.action ? `'${log.action}'` : 'NULL',
            `'${log.outcome}'`,
            `'${JSON.stringify(log.details)}'::jsonb`,
            log.risk ? `'${log.risk}'` : 'NULL',
            `'${log.timestamp.toISOString()}'`,
            `'${log.correlationId}'`
          ].join(', ')})`
        ).join(', ')}
      `

      console.log(`[AUDIT] Persistidos ${auditLogs.length} eventos de auditoria`)

    } catch (error) {
      console.error('[AUDIT-ERROR] Falha ao persistir eventos:', error)
      
      // Fallback: salvar em arquivo local em caso de falha do banco
      try {
        const fs = await import('fs/promises')
        const logFile = `/tmp/audit-fallback-${Date.now()}.json`
        await fs.writeFile(logFile, JSON.stringify(events, null, 2))
        console.log(`[AUDIT-FALLBACK] Eventos salvos em: ${logFile}`)
      } catch (fsError) {
        console.error('[AUDIT-CRITICAL] Falha total na auditoria:', fsError)
      }
    }
  }

  /**
   * Calcula nível de risco baseado no evento
   */
  private calculateRisk(event: AuditEventData): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const severity = EVENT_SEVERITY_MAP[event.eventType]
    
    // Fatores que aumentam o risco
    let riskScore = 0
    
    // Falhas aumentam risco
    if (event.outcome === 'FAILURE') riskScore += 2
    if (event.outcome === 'BLOCKED') riskScore += 3
    
    // IP suspeito (exemplo: muito diferente do usual)
    if (event.ip && this.isSuspiciousIP(event.ip)) riskScore += 2
    
    // Horário fora do padrão (noite/madrugada)
    const hour = new Date().getHours()
    if (hour < 6 || hour > 22) riskScore += 1
    
    // User-Agent suspeito ou ausente
    if (!event.userAgent || this.isSuspiciousUserAgent(event.userAgent)) riskScore += 1
    
    // Determinar risco final
    if (severity === 'CRITICAL' || riskScore >= 6) return 'CRITICAL'
    if (severity === 'HIGH' || riskScore >= 4) return 'HIGH'
    if (severity === 'MEDIUM' || riskScore >= 2) return 'MEDIUM'
    return 'LOW'
  }

  /**
   * Verifica se IP é suspeito (implementação básica)
   */
  private isSuspiciousIP(ip: string): boolean {
    // Lista básica de IPs suspeitos (em produção, usar serviços especializados)
    const suspiciousPatterns = [
      /^10\.0\.0\./, // Exemplo de rede interna suspeita
      /^192\.168\.1\.1$/, // Gateway comum
      /^127\.0\.0\.1$/ // Localhost
    ]
    
    return suspiciousPatterns.some(pattern => pattern.test(ip))
  }

  /**
   * Verifica se User-Agent é suspeito
   */
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousAgents = [
      'curl',
      'wget',
      'python',
      'bot',
      'crawler',
      'scanner'
    ]
    
    return suspiciousAgents.some(agent => 
      userAgent.toLowerCase().includes(agent)
    )
  }

  /**
   * Gera ID de correlação único
   */
  private generateCorrelationId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Busca eventos de auditoria com filtros
   */
  async searchEvents(filters: {
    userId?: string
    eventType?: AuditEventType
    severity?: AuditSeverity
    startDate?: Date
    endDate?: Date
    ip?: string
    outcome?: string
    limit?: number
    offset?: number
  }): Promise<AuditLog[]> {
    try {
      // Query básica com Prisma (adaptável)
      const where: Record<string, unknown> = {}
      
      if (filters.userId) where.userId = filters.userId
      if (filters.eventType) where.eventType = filters.eventType
      if (filters.severity) where.severity = filters.severity
      if (filters.ip) where.ip = filters.ip
      if (filters.outcome) where.outcome = filters.outcome
      
      if (filters.startDate || filters.endDate) {
        where.timestamp = {} as { gte?: Date; lte?: Date }
        const timestampFilter = where.timestamp as { gte?: Date; lte?: Date }
        if (filters.startDate) timestampFilter.gte = filters.startDate
        if (filters.endDate) timestampFilter.lte = filters.endDate
      }

      // Como não temos a tabela criada, retornar array vazio por enquanto
      console.log('[AUDIT-SEARCH] Filtros aplicados:', filters)
      return []

    } catch (error) {
      console.error('[AUDIT-ERROR] Falha na busca:', error)
      return []
    }
  }

  /**
   * Obtém estatísticas de auditoria
   */
  async getStats(timeframe: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<{
    totalEvents: number
    eventsByType: Record<string, number>
    eventsBySeverity: Record<string, number>
    failureRate: number
    riskDistribution: Record<string, number>
  }> {
    try {
      // Implementação básica - em produção usar queries otimizadas
      const now = new Date()
      const timeframes = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      }
      
      const _startDate = new Date(now.getTime() - timeframes[timeframe])
      
      console.log(`[AUDIT-STATS] Calculando estatísticas para: ${timeframe}`)
      
      // Retorno mock por enquanto
      return {
        totalEvents: 0,
        eventsByType: {},
        eventsBySeverity: {},
        failureRate: 0,
        riskDistribution: {}
      }

    } catch (error) {
      console.error('[AUDIT-ERROR] Falha ao calcular estatísticas:', error)
      return {
        totalEvents: 0,
        eventsByType: {},
        eventsBySeverity: {},
        failureRate: 0,
        riskDistribution: {}
      }
    }
  }
}

// Instância singleton
const auditTrail = new AuditTrail()

// Funções de conveniência para eventos comuns
export async function logLogin(userId: string, email: string, ip?: string, userAgent?: string, success = true) {
  await auditTrail.logEvent({
    eventType: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
    userId,
    email,
    ip,
    userAgent,
    outcome: success ? 'SUCCESS' : 'FAILURE',
    resource: 'auth',
    action: 'login'
  })
}

export async function logLogout(userId: string, email: string, ip?: string, userAgent?: string) {
  await auditTrail.logEvent({
    eventType: 'LOGOUT',
    userId,
    email,
    ip,
    userAgent,
    outcome: 'SUCCESS',
    resource: 'auth',
    action: 'logout'
  })
}

export async function logPasswordChange(userId: string, email: string, ip?: string, userAgent?: string, success = true) {
  await auditTrail.logEvent({
    eventType: 'PASSWORD_CHANGE',
    userId,
    email,
    ip,
    userAgent,
    outcome: success ? 'SUCCESS' : 'FAILURE',
    resource: 'auth',
    action: 'password_change'
  })
}

export async function logAccessDenied(userId?: string, email?: string, resource?: string, ip?: string, userAgent?: string) {
  await auditTrail.logEvent({
    eventType: 'ACCESS_DENIED',
    userId,
    email,
    ip,
    userAgent,
    outcome: 'BLOCKED',
    resource,
    action: 'access_attempt'
  })
}

export async function logRateLimitExceeded(ip?: string, userAgent?: string, resource?: string) {
  await auditTrail.logEvent({
    eventType: 'RATE_LIMIT_EXCEEDED',
    ip,
    userAgent,
    outcome: 'BLOCKED',
    resource,
    action: 'rate_limit_exceeded'
  })
}

// Exportar instância principal
export default auditTrail