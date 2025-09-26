/**
 * Sistema Centralizado de Verificação de Permissões - Server-Side
 * 
 * Integra com Better Auth para verificações server-side usando session e roles
 */

import { auth } from '@/lib/auth/auth'
import { headers as nextHeaders } from 'next/headers'
import { NextRequest } from 'next/server'

/**
 * Tipos para o sistema de permissões (baseados no Better Auth statement)
 */
export type PermissionResource = 
  | 'business'
  | 'orders' 
  | 'products'
  | 'employees'
  | 'analytics'
  | 'billing'
  | 'payments'
  | 'tables'
  | 'promotions'
  | 'settings'

export type PermissionAction = 
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'manage'
  | 'cancel'
  | 'refund'
  | 'export'
  | 'invite'
  | 'remove'
  | 'salary'
  | 'advanced'
  | 'financial'
  | 'history'
  | 'configure'
  | 'test'
  | 'reserve'
  | 'qr'
  | 'analytics'
  | 'security'

/**
 * Tipo para conjunto de permissões por resource
 */
export type ResourcePermissions = Partial<Record<PermissionResource, PermissionAction[]>>

/**
 * Opções para verificação de permissões
 */
export interface PermissionCheckOptions {
  /** Headers customizados (opcional) */
  headers?: HeadersInit
  /** ID do usuário específico para verificar (opcional, usa sessão atual se não especificado) */
  userId?: string
  /** Role específico para verificar (opcional, usa role da sessão se não especificado) */
  role?: string
  /** ID da organização específica (opcional, usa activeOrganizationId da sessão se não especificado) */
  organizationId?: string
}

/**
 * Resultado da verificação de permissões
 */
export interface PermissionCheckResult {
  /** Se o usuário tem as permissões solicitadas */
  hasPermission: boolean
  /** Detalhes da verificação */
  details: {
    userId?: string
    role?: string
    organizationId?: string | null
    checkedPermissions: ResourcePermissions
    failedPermissions?: ResourcePermissions
  }
  /** Mensagem de erro se aplicável */
  error?: string
}

/**
 * Função principal para verificar permissões do usuário usando Better Auth API
 */
export async function checkUserPermissions(
  permissions: ResourcePermissions,
  options: PermissionCheckOptions = {}
): Promise<PermissionCheckResult> {
  try {
    // Obter sessão
    const session = await auth.api.getSession({
      headers: new Headers(options.headers || await nextHeaders())
    })

    if (!session?.user) {
      return {
        hasPermission: false,
        details: {
          checkedPermissions: permissions
        },
        error: 'Usuário não autenticado'
      }
    }

    const userId = options.userId || session.user.id
    const userRole = options.role || session.user.role || 'customer'
    const organizationId = options.organizationId || session.session?.activeOrganizationId

    // Verificar cada permissão usando Better Auth hasPermission API
    const failedPermissions: ResourcePermissions = {}
    let hasAllPermissions = true

    for (const [resource, actions] of Object.entries(permissions)) {
      for (const action of actions) {
        // Usar Better Auth API para verificar permissão específica
        const permissionCheck = await auth.api.hasPermission({
          headers: new Headers(options.headers || await nextHeaders()),
          body: {
            permissions: {
              [resource]: [action]
            }
          }
        })

        if (!permissionCheck) {
          if (!failedPermissions[resource as PermissionResource]) {
            failedPermissions[resource as PermissionResource] = []
          }
          failedPermissions[resource as PermissionResource]!.push(action as PermissionAction)
          hasAllPermissions = false
        }
      }
    }

    return {
      hasPermission: hasAllPermissions,
      details: {
        userId,
        role: userRole,
        organizationId,
        checkedPermissions: permissions,
        ...(hasAllPermissions ? {} : { failedPermissions })
      }
    }

  } catch (error) {
    return {
      hasPermission: false,
      details: {
        checkedPermissions: permissions
      },
      error: error instanceof Error ? error.message : 'Erro desconhecido na verificação de permissões'
    }
  }
}

/**
 * Middleware para proteger rotas com verificação de permissões
 */
export function withPermissions(
  permissions: ResourcePermissions,
  options: PermissionCheckOptions = {}
) {
  return function (
    handler: (req: NextRequest, context?: Record<string, unknown>) => Promise<Response>,
    context?: Record<string, unknown>
  ) {
    return async (req: NextRequest, ctx?: Record<string, unknown>) => {
      const permissionResult = await checkUserPermissions(permissions, {
        ...options,
        headers: req.headers
      })

      if (!permissionResult.hasPermission) {
        return new Response(
          JSON.stringify({
            error: 'Acesso negado',
            message: permissionResult.error || 'Permissões insuficientes',
            details: permissionResult.details
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      return handler(req, ctx || context)
    }
  }
}

/**
 * Função helper para verificar uma única permissão
 */
export async function hasPermission(
  resource: PermissionResource,
  action: PermissionAction,
  options: PermissionCheckOptions = {}
): Promise<boolean> {
  const result = await checkUserPermissions(
    { [resource]: [action] },
    options
  )
  return result.hasPermission
}

/**
 * Função helper para verificar se o usuário tem todas as permissões especificadas
 */
export async function hasAllPermissions(
  permissions: ResourcePermissions,
  options: PermissionCheckOptions = {}
): Promise<boolean> {
  const result = await checkUserPermissions(permissions, options)
  return result.hasPermission
}

/**
 * Função helper para verificar se o usuário tem pelo menos uma das permissões especificadas
 */
export async function hasAnyPermission(
  permissions: ResourcePermissions,
  options: PermissionCheckOptions = {}
): Promise<boolean> {
  // Verificar cada permissão individualmente
  for (const [resource, actions] of Object.entries(permissions)) {
    for (const action of actions) {
      const hasThis = await hasPermission(
        resource as PermissionResource,
        action as PermissionAction,
        options
      )
      if (hasThis) return true
    }
  }
  return false
}

/**
 * Função helper para verificar se o usuário é owner da empresa/organização
 */
export async function isOwner(
  organizationId?: string,
  options: PermissionCheckOptions = {}
): Promise<boolean> {
  return hasPermission('business', 'delete', {
    ...options,
    organizationId
  })
}

/**
 * Função helper para verificar se o usuário pode gerenciar funcionários
 */
export async function canManageEmployees(
  organizationId?: string,
  options: PermissionCheckOptions = {}
): Promise<boolean> {
  return hasPermission('employees', 'manage', {
    ...options,
    organizationId
  })
}

/**
 * Função helper para verificar se o usuário pode visualizar analytics avançados
 */
export async function canViewAdvancedAnalytics(
  organizationId?: string,
  options: PermissionCheckOptions = {}
): Promise<boolean> {
  return hasPermission('analytics', 'advanced', {
    ...options,
    organizationId
  })
}