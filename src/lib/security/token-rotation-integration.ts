import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { 
  registerToken, 
  updateTokenUsage, 
  needsTokenRotation, 
  forceTokenRotation,
  removeToken
} from '@/lib/security/token-rotation'
import { createAuthErrorResponse, AUTH_ERROR_CODES } from '@/lib/security/auth-errors'
import auditTrail from '@/lib/security/audit-trail'

/**
 * Middleware de rotação automática de tokens
 * Aplica rotação transparente quando tokens estão próximos da expiração
 */
export function withTokenRotation(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Extrair sessão atual
      const session = await auth.api.getSession({
        headers: req.headers
      })

      if (!session?.session?.id) {
        return handler(req)
      }

      const sessionId = session.session.id
      const userId = session.user?.id || 'unknown'

      // Atualizar último uso do token
      updateTokenUsage(sessionId)

      // Verificar se precisa rotacionar
      if (needsTokenRotation(sessionId)) {
        console.log(`[TOKEN-ROTATION] Iniciando rotação automática para sessão: ${sessionId}`)

        const rotationSuccess = await forceTokenRotation(sessionId)
        
        if (rotationSuccess) {
          // Log de rotação bem-sucedida
          await auditTrail.logEvent({
            eventType: 'SYSTEM_ACCESS',
            userId,
            ip: req.headers.get('x-forwarded-for') || 'unknown',
            userAgent: req.headers.get('user-agent') || undefined,
            outcome: 'SUCCESS',
            resource: 'auth_token',
            action: 'automatic_rotation',
            details: { sessionId }
          })
        } else {
          console.warn(`[TOKEN-ROTATION] Falha na rotação automática: ${sessionId}`)
        }
      }

      return handler(req)
    } catch (error) {
      console.error('[TOKEN-ROTATION] Erro no middleware de rotação:', error)
      return handler(req)
    }
  }
}

/**
 * Hook para APIs de autenticação registrarem novos tokens
 */
export function withTokenRegistration(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const response = await handler(req)

    // Verificar se foi uma autenticação bem-sucedida
    if (response.status === 200) {
      try {
        // Tentar extrair nova sessão dos cookies ou headers
        const responseHeaders = response.headers
        const setCookieHeader = responseHeaders.get('set-cookie')
        
        if (setCookieHeader) {
          // Extrair session ID do cookie (isso pode variar baseado na implementação do Better Auth)
          const sessionMatch = setCookieHeader.match(/session[^=]*=([^;]+)/)
          
          if (sessionMatch) {
            // Tentar obter informações da sessão
            const session = await auth.api.getSession({
              headers: req.headers
            })

            if (session?.session?.id && session?.user?.id) {
              const expiresAt = session.session.expiresAt 
                ? new Date(session.session.expiresAt).getTime()
                : Date.now() + (24 * 60 * 60 * 1000) // 24h padrão

              // Registrar token para rotação
              registerToken(
                session.session.id,
                session.user.id,
                expiresAt,
                req.headers.get('x-forwarded-for') || undefined,
                req.headers.get('user-agent') || undefined
              )

              console.log(`[TOKEN-ROTATION] Novo token registrado: ${session.session.id}`)
            }
          }
        }
      } catch (error) {
        console.error('[TOKEN-ROTATION] Erro ao registrar novo token:', error)
      }
    }

    return response
  }
}

/**
 * Hook para logout remover tokens do sistema de rotação
 */
export function withTokenCleanup(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Capturar sessão antes do logout
      const session = await auth.api.getSession({
        headers: req.headers
      })

      const response = await handler(req)

      // Se logout foi bem-sucedido, remover token
      if (response.status === 200 && session?.session?.id) {
        const removed = removeToken(session.session.id)
        
        if (removed) {
          console.log(`[TOKEN-ROTATION] Token removido após logout: ${session.session.id}`)
          
          await auditTrail.logEvent({
            eventType: 'SYSTEM_ACCESS',
            userId: session.user?.id || 'unknown',
            ip: req.headers.get('x-forwarded-for') || 'unknown',
            userAgent: req.headers.get('user-agent') || undefined,
            outcome: 'SUCCESS',
            resource: 'auth_token',
            action: 'token_cleanup',
            details: { sessionId: session.session.id }
          })
        }
      }

      return response
    } catch (error) {
      console.error('[TOKEN-ROTATION] Erro no cleanup de token:', error)
      return handler(req)
    }
  }
}

/**
 * Função para criar endpoint de rotação manual de token
 */
export function createTokenRotationPOST() {
  return async (req: NextRequest) => {
    try {
      const session = await auth.api.getSession({
        headers: req.headers
      })

      if (!session?.session?.id || !session?.user?.id) {
        return createAuthErrorResponse(
          AUTH_ERROR_CODES.SESSION_NOT_FOUND,
          'Sessão não encontrada'
        )
      }

      const { force = false } = await req.json().catch(() => ({}))

      // Verificar se rotação é necessária ou forçada
      const needsRotation = needsTokenRotation(session.session.id)
      
      if (!needsRotation && !force) {
        return NextResponse.json({
          success: true,
          message: 'Token não precisa ser rotacionado ainda',
          needsRotation: false
        })
      }

      // Executar rotação
      const rotationSuccess = await forceTokenRotation(session.session.id)

      if (rotationSuccess) {
        await auditTrail.logEvent({
          eventType: 'SYSTEM_ACCESS',
          userId: session.user.id,
          ip: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || undefined,
          outcome: 'SUCCESS',
          resource: 'auth_token',
          action: 'manual_rotation',
          details: { 
            sessionId: session.session.id,
            forced: force
          }
        })

        return NextResponse.json({
          success: true,
          message: 'Token rotacionado com sucesso',
          rotated: true
        })
      } else {
        return createAuthErrorResponse(
          AUTH_ERROR_CODES.SESSION_EXPIRED,
          'Falha na rotação do token'
        )
      }
    } catch (error) {
      console.error('[TOKEN-ROTATION] Erro na rotação manual:', error)
      return createAuthErrorResponse(
        AUTH_ERROR_CODES.INTERNAL_ERROR,
        'Erro interno do servidor'
      )
    }
  }
}

/**
 * Função para criar endpoint de informações de tokens
 */
export function createTokenInfoGET() {
  return async (req: NextRequest) => {
    try {
      const session = await auth.api.getSession({
        headers: req.headers
      })

      if (!session?.session?.id || !session?.user?.id) {
        return createAuthErrorResponse(
          AUTH_ERROR_CODES.SESSION_NOT_FOUND,
          'Sessão não encontrada'
        )
      }

      const { searchParams } = new URL(req.url)
      const includeStats = searchParams.get('stats') === 'true'

      // Informações básicas da sessão atual
      const currentSessionInfo = {
        sessionId: session.session.id,
        userId: session.user.id,
        needsRotation: needsTokenRotation(session.session.id),
        expiresAt: session.session.expiresAt
      }

      const response: {
        success: boolean
        currentSession: typeof currentSessionInfo
        userTokens?: Array<{
          sessionId: string
          createdAt: number
          lastUsed: number
          expiresAt: number
          rotationCount: number
          needsRotation: boolean
        }>
        systemStats?: Record<string, unknown>
      } = {
        success: true,
        currentSession: currentSessionInfo
      }

      // Incluir estatísticas se solicitado
      if (includeStats) {
        const { getTokenRotationStats, getUserTokens } = await import('@/lib/security/token-rotation')
        
        response.userTokens = getUserTokens(session.user.id).map(token => ({
          sessionId: token.sessionId,
          createdAt: token.createdAt,
          lastUsed: token.lastUsed,
          expiresAt: token.expiresAt,
          rotationCount: token.rotationCount,
          needsRotation: needsTokenRotation(token.sessionId)
        }))
        
        response.systemStats = getTokenRotationStats()
      }

      return NextResponse.json(response)
    } catch (error) {
      console.error('[TOKEN-ROTATION] Erro ao obter informações:', error)
      return createAuthErrorResponse(
        AUTH_ERROR_CODES.INTERNAL_ERROR,
        'Erro interno do servidor'
      )
    }
  }
}

/**
 * Utilitário para aplicar rotação em rotas específicas
 */
export function applyTokenRotationToRoute(routePath: string) {
  return {
    path: routePath,
    middleware: withTokenRotation
  }
}

// Aliases para compatibilidade
export const tokenRotationMiddleware = withTokenRotation
export const tokenRegistrationMiddleware = withTokenRegistration
export const tokenCleanupMiddleware = withTokenCleanup