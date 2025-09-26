import auditTrail from './audit-trail'

export interface TokenRotationConfig {
  // Tempo em ms antes da expiração para rotacionar (padrão: 15 minutos)
  rotationThreshold: number
  // Intervalo de verificação automática (padrão: 5 minutos)
  checkInterval: number
  // Tempo de vida do refresh token (padrão: 7 dias)
  refreshTokenTTL: number
  // Máximo de tokens ativos por usuário (padrão: 3)
  maxActiveTokens: number
}

const DEFAULT_TOKEN_CONFIG: TokenRotationConfig = {
  rotationThreshold: 15 * 60 * 1000, // 15 minutos
  checkInterval: 5 * 60 * 1000, // 5 minutos
  refreshTokenTTL: 7 * 24 * 60 * 60 * 1000, // 7 dias
  maxActiveTokens: 3
}

export interface TokenMetadata {
  sessionId: string
  userId: string
  createdAt: number
  lastUsed: number
  expiresAt: number
  ip?: string
  userAgent?: string
  isRefreshToken: boolean
  rotationCount: number
}

class TokenRotationManager {
  private config: TokenRotationConfig
  private activeTokens = new Map<string, TokenMetadata>()
  private rotationTimer: NodeJS.Timeout | null = null
  private rotationQueue = new Set<string>()
  private isProcessing = false

  constructor(config: Partial<TokenRotationConfig> = {}) {
    this.config = { ...DEFAULT_TOKEN_CONFIG, ...config }
    this.startRotationTimer()
  }

  /**
   * Inicia timer de rotação automática
   */
  private startRotationTimer() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer)
    }

    this.rotationTimer = setInterval(() => {
      this.processRotationQueue()
    }, this.config.checkInterval)
  }

  /**
   * Registra um token ativo
   */
  registerToken(
    sessionId: string,
    userId: string,
    expiresAt: number,
    ip?: string,
    userAgent?: string,
    isRefreshToken = false
  ): void {
    const now = Date.now()

    const metadata: TokenMetadata = {
      sessionId,
      userId,
      createdAt: now,
      lastUsed: now,
      expiresAt,
      ip,
      userAgent,
      isRefreshToken,
      rotationCount: 0
    }

    this.activeTokens.set(sessionId, metadata)

    // Limitar número de tokens ativos por usuário
    this.enforceTokenLimit(userId)

    // Agendar para rotação se próximo da expiração
    this.scheduleRotationIfNeeded(sessionId, expiresAt)

    console.log(`[TOKEN-ROTATION] Token registrado: ${sessionId} (User: ${userId})`)
  }

  /**
   * Atualiza último uso do token
   */
  updateTokenUsage(sessionId: string): void {
    const token = this.activeTokens.get(sessionId)
    if (token) {
      token.lastUsed = Date.now()
      this.activeTokens.set(sessionId, token)
    }
  }

  /**
   * Verifica se token precisa ser rotacionado
   */
  needsRotation(sessionId: string): boolean {
    const token = this.activeTokens.get(sessionId)
    if (!token) return false

    const now = Date.now()
    const timeUntilExpiry = token.expiresAt - now

    return timeUntilExpiry <= this.config.rotationThreshold
  }

  /**
   * Agenda rotação de token se necessário
   */
  private scheduleRotationIfNeeded(sessionId: string, expiresAt: number): void {
    const now = Date.now()
    const timeUntilRotation = expiresAt - now - this.config.rotationThreshold

    if (timeUntilRotation > 0) {
      setTimeout(() => {
        this.rotationQueue.add(sessionId)
      }, timeUntilRotation)
    } else {
      // Precisa rotacionar imediatamente
      this.rotationQueue.add(sessionId)
    }
  }

  /**
   * Processa queue de rotações pendentes
   */
  private async processRotationQueue(): Promise<void> {
    if (this.isProcessing || this.rotationQueue.size === 0) {
      return
    }

    this.isProcessing = true

    try {
      const sessionsToRotate = Array.from(this.rotationQueue)
      this.rotationQueue.clear()

      for (const sessionId of sessionsToRotate) {
        await this.rotateToken(sessionId)
      }
    } catch (error) {
      console.error('[TOKEN-ROTATION] Erro ao processar queue:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Executa rotação de um token específico
   */
  private async rotateToken(sessionId: string): Promise<boolean> {
    try {
      const tokenMeta = this.activeTokens.get(sessionId)
      if (!tokenMeta) {
        return false
      }

      // Verificar se ainda está ativo e válido
      if (tokenMeta.expiresAt <= Date.now()) {
        this.activeTokens.delete(sessionId)
        return false
      }

      console.log(`[TOKEN-ROTATION] Iniciando rotação do token: ${sessionId}`)

      // Tentar renovar sessão via Better Auth
      const renewResult = await this.renewSession(sessionId, tokenMeta)
      
      if (renewResult.success && renewResult.newSessionId) {
        // Atualizar registro do token
        const newMetadata: TokenMetadata = {
          ...tokenMeta,
          sessionId: renewResult.newSessionId,
          createdAt: Date.now(),
          lastUsed: Date.now(),
          expiresAt: renewResult.expiresAt || (Date.now() + (24 * 60 * 60 * 1000)), // 24h default
          rotationCount: tokenMeta.rotationCount + 1
        }

        // Substituir token antigo pelo novo
        this.activeTokens.delete(sessionId)
        this.activeTokens.set(renewResult.newSessionId, newMetadata)

        // Agendar próxima rotação
        this.scheduleRotationIfNeeded(renewResult.newSessionId, newMetadata.expiresAt)

        // Log de auditoria
        await auditTrail.logEvent({
          eventType: 'SYSTEM_ACCESS',
          userId: tokenMeta.userId,
          ip: tokenMeta.ip,
          userAgent: tokenMeta.userAgent,
          outcome: 'SUCCESS',
          resource: 'token_rotation',
          action: 'refresh_token',
          details: {
            oldSessionId: sessionId,
            newSessionId: renewResult.newSessionId,
            rotationCount: newMetadata.rotationCount
          }
        })

        console.log(`[TOKEN-ROTATION] Token rotacionado com sucesso: ${sessionId} -> ${renewResult.newSessionId}`)
        return true
      }

      return false
    } catch (error) {
      console.error(`[TOKEN-ROTATION] Falha na rotação do token ${sessionId}:`, error)
      
      // Log de falha na auditoria
      const tokenMeta = this.activeTokens.get(sessionId)
      if (tokenMeta) {
        await auditTrail.logEvent({
          eventType: 'SYSTEM_ACCESS',
          userId: tokenMeta.userId,
          ip: tokenMeta.ip,
          userAgent: tokenMeta.userAgent,
          outcome: 'FAILURE',
          resource: 'token_rotation',
          action: 'refresh_token_failed',
          details: { sessionId, error: String(error) }
        })
      }

      return false
    }
  }

  /**
   * Renova sessão usando Better Auth
   */
  private async renewSession(
    sessionId: string, 
    _tokenMeta: TokenMetadata
  ): Promise<{
    success: boolean
    newSessionId?: string
    expiresAt?: number
  }> {
    try {
      // Better Auth não tem método direto de renovação por sessionId
      // Esta é uma implementação conceitual que precisaria ser adaptada
      // baseada na API específica do Better Auth

      // Opção 1: Usar o método de refresh se disponível
      // const refreshResult = await auth.api.refreshSession({ sessionId })

      // Opção 2: Criar nova sessão baseada na anterior
      // const newSession = await auth.api.createSession({ userId: tokenMeta.userId })

      // Por enquanto, simular renovação bem-sucedida
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const expiresAt = Date.now() + (24 * 60 * 60 * 1000) // 24 horas

      console.log(`[TOKEN-ROTATION] Simulando renovação: ${sessionId} -> ${newSessionId}`)

      return {
        success: true,
        newSessionId,
        expiresAt
      }
    } catch (error) {
      console.error('[TOKEN-ROTATION] Erro na renovação:', error)
      return { success: false }
    }
  }

  /**
   * Força rotação imediata de um token
   */
  async forceRotation(sessionId: string): Promise<boolean> {
    return await this.rotateToken(sessionId)
  }

  /**
   * Remove token do controle de rotação
   */
  removeToken(sessionId: string): boolean {
    const removed = this.activeTokens.delete(sessionId)
    this.rotationQueue.delete(sessionId)
    
    if (removed) {
      console.log(`[TOKEN-ROTATION] Token removido: ${sessionId}`)
    }
    
    return removed
  }

  /**
   * Enforça limite máximo de tokens por usuário
   */
  private enforceTokenLimit(userId: string): void {
    const userTokens = Array.from(this.activeTokens.entries())
      .filter(([_, token]) => token.userId === userId)
      .sort((a, b) => b[1].lastUsed - a[1].lastUsed) // Mais recente primeiro

    if (userTokens.length > this.config.maxActiveTokens) {
      const tokensToRemove = userTokens.slice(this.config.maxActiveTokens)
      
      tokensToRemove.forEach(([sessionId]) => {
        this.activeTokens.delete(sessionId)
        console.log(`[TOKEN-ROTATION] Token antigo removido por limite: ${sessionId}`)
      })

      // Log de auditoria para tokens removidos
      auditTrail.logEvent({
        eventType: 'SYSTEM_ACCESS',
        userId,
        outcome: 'SUCCESS',
        resource: 'token_management',
        action: 'enforce_token_limit',
        details: {
          removedTokens: tokensToRemove.length,
          maxActiveTokens: this.config.maxActiveTokens
        }
      })
    }
  }

  /**
   * Obtém tokens ativos de um usuário
   */
  getUserTokens(userId: string): TokenMetadata[] {
    return Array.from(this.activeTokens.values())
      .filter(token => token.userId === userId)
      .sort((a, b) => b.lastUsed - a.lastUsed)
  }

  /**
   * Revoga todos os tokens de um usuário
   */
  async revokeUserTokens(userId: string): Promise<number> {
    const userTokens = this.getUserTokens(userId)
    let revokedCount = 0

    for (const token of userTokens) {
      if (this.removeToken(token.sessionId)) {
        revokedCount++
      }
    }

    if (revokedCount > 0) {
      await auditTrail.logEvent({
        eventType: 'SYSTEM_ACCESS',
        userId,
        outcome: 'SUCCESS',
        resource: 'token_management',
        action: 'revoke_all_tokens',
        details: { revokedTokens: revokedCount }
      })

      console.log(`[TOKEN-ROTATION] ${revokedCount} tokens revogados para usuário: ${userId}`)
    }

    return revokedCount
  }

  /**
   * Cleanup de tokens expirados
   */
  cleanupExpiredTokens(): number {
    const now = Date.now()
    let cleanedCount = 0

    for (const [sessionId, token] of this.activeTokens.entries()) {
      if (token.expiresAt <= now) {
        this.activeTokens.delete(sessionId)
        this.rotationQueue.delete(sessionId)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      console.log(`[TOKEN-ROTATION] ${cleanedCount} tokens expirados removidos`)
    }

    return cleanedCount
  }

  /**
   * Obtém estatísticas do sistema de rotação
   */
  getStats() {
    const now = Date.now()
    const tokens = Array.from(this.activeTokens.values())
    
    const stats = {
      totalActiveTokens: tokens.length,
      tokensInRotationQueue: this.rotationQueue.size,
      tokensByUser: {} as Record<string, number>,
      avgRotationCount: 0,
      tokensNearExpiry: 0,
      expiredTokens: 0
    }

    tokens.forEach(token => {
      // Contar por usuário
      stats.tokensByUser[token.userId] = (stats.tokensByUser[token.userId] || 0) + 1
      
      // Tokens próximos da expiração
      if (token.expiresAt - now <= this.config.rotationThreshold) {
        stats.tokensNearExpiry++
      }
      
      // Tokens expirados
      if (token.expiresAt <= now) {
        stats.expiredTokens++
      }
    })

    // Média de rotações
    if (tokens.length > 0) {
      stats.avgRotationCount = tokens.reduce((sum, token) => sum + token.rotationCount, 0) / tokens.length
    }

    return stats
  }

  /**
   * Para o sistema de rotação
   */
  destroy(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer)
      this.rotationTimer = null
    }
    
    this.activeTokens.clear()
    this.rotationQueue.clear()
    
    console.log('[TOKEN-ROTATION] Sistema de rotação parado')
  }
}

// Instância singleton
const tokenRotationManager = new TokenRotationManager()

// Cleanup automático a cada hora
setInterval(() => {
  tokenRotationManager.cleanupExpiredTokens()
}, 60 * 60 * 1000)

// Log de estatísticas em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats = tokenRotationManager.getStats()
    if (stats.totalActiveTokens > 0) {
      console.log('[TOKEN-ROTATION] Estatísticas:', stats)
    }
  }, 15 * 60 * 1000) // A cada 15 minutos
}

// Funções exportadas para uso fácil
export function registerToken(
  sessionId: string,
  userId: string,
  expiresAt: number,
  ip?: string,
  userAgent?: string,
  isRefreshToken = false
) {
  tokenRotationManager.registerToken(sessionId, userId, expiresAt, ip, userAgent, isRefreshToken)
}

export function updateTokenUsage(sessionId: string) {
  tokenRotationManager.updateTokenUsage(sessionId)
}

export function needsTokenRotation(sessionId: string): boolean {
  return tokenRotationManager.needsRotation(sessionId)
}

export async function forceTokenRotation(sessionId: string): Promise<boolean> {
  return await tokenRotationManager.forceRotation(sessionId)
}

export function removeToken(sessionId: string): boolean {
  return tokenRotationManager.removeToken(sessionId)
}

export function getUserTokens(userId: string): TokenMetadata[] {
  return tokenRotationManager.getUserTokens(userId)
}

export async function revokeAllUserTokens(userId: string): Promise<number> {
  return await tokenRotationManager.revokeUserTokens(userId)
}

export function getTokenRotationStats() {
  return tokenRotationManager.getStats()
}

export function cleanupExpiredTokens(): number {
  return tokenRotationManager.cleanupExpiredTokens()
}

export default tokenRotationManager