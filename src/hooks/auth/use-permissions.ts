/**
 * Hooks Client-Side para Verificação de Permissões
 * 
 * Fornece hooks React para verificar permissões usando Better Auth
 * no lado do cliente com cache e invalidação automática.
 */

'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/lib/auth/auth-client'
import { useCallback, useMemo } from 'react'
import type { PermissionResource, PermissionAction } from '@/lib/auth/permissions'

/**
 * Interface para resultado de verificação de permissão
 */
export interface PermissionResult {
  /** Se tem a permissão */
  hasPermission: boolean
  /** Se está carregando */
  isLoading: boolean
  /** Erro se ocorreu */
  error: Error | null
  /** Função para revalidar a permissão */
  refetch: () => void
}

/**
 * Interface para hook de múltiplas permissões
 */
export interface MultiplePermissionsResult {
  /** Mapa de permissões e seus resultados */
  permissions: Record<string, boolean>
  /** Se está carregando alguma permissão */
  isLoading: boolean
  /** Se todas as permissões foram verificadas */
  hasAllPermissions: boolean
  /** Se pelo menos uma permissão foi concedida */
  hasAnyPermission: boolean
  /** Erros ocorridos */
  errors: Error[]
  /** Função para revalidar todas as permissões */
  refetch: () => void
}

/**
 * Hook para verificar uma única permissão
 */
export function usePermission(
  resource: PermissionResource,
  action: PermissionAction,
  options: {
    /** Se deve fazer a query automaticamente (default: true) */
    enabled?: boolean
    /** Tempo de cache em ms (default: 5 minutos) */
    staleTime?: number
  } = {}
): PermissionResult {
  const { data: session, isPending: sessionLoading } = useSession()

  const {
    data: hasPermission = false,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['permission', resource, action, session?.user?.id],
    queryFn: async () => {
      if (!session?.user) return false

      try {
        const response = await fetch('/api/auth/check-permission', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            permissions: {
              [resource]: [action]
            }
          })
        })

        if (!response.ok) {
          throw new Error('Erro ao verificar permissão')
        }

        const result = await response.json()
        return result.hasPermission as boolean
      } catch (error) {
        console.error('Erro ao verificar permissão:', error)
        return false
      }
    },
    enabled: options.enabled !== false && !sessionLoading && !!session?.user,
    staleTime: options.staleTime ?? 5 * 60 * 1000, // 5 minutos
    retry: 1
  })

  const refetchPermission = useCallback(() => {
    refetch()
  }, [refetch])

  return {
    hasPermission,
    isLoading: sessionLoading || isLoading,
    error: error as Error | null,
    refetch: refetchPermission
  }
}

/**
 * Hook para verificar múltiplas permissões
 */
export function usePermissions(
  permissions: Record<string, { resource: PermissionResource, action: PermissionAction }>,
  options: {
    /** Se deve fazer a query automaticamente (default: true) */
    enabled?: boolean
    /** Tempo de cache em ms (default: 5 minutos) */
    staleTime?: number
  } = {}
): MultiplePermissionsResult {
  const { data: session, isPending: sessionLoading } = useSession()

  const permissionKeys = Object.keys(permissions)
  const permissionQueries = useMemo(() => {
    return permissionKeys.map(key => ({
      queryKey: ['permission', permissions[key].resource, permissions[key].action, session?.user?.id],
      queryFn: async () => {
        if (!session?.user) return { [key]: false }

        try {
          const response = await fetch('/api/auth/check-permission', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              permissions: {
                [permissions[key].resource]: [permissions[key].action]
              }
            })
          })

          if (!response.ok) {
            throw new Error(`Erro ao verificar permissão ${key}`)
          }

          const result = await response.json()
          return { [key]: result.hasPermission as boolean }
        } catch (error) {
          console.error(`Erro ao verificar permissão ${key}:`, error)
          return { [key]: false }
        }
      },
      enabled: options.enabled !== false && !sessionLoading && !!session?.user,
      staleTime: options.staleTime ?? 5 * 60 * 1000,
      retry: 1
    }))
  }, [permissions, permissionKeys, session?.user, sessionLoading, options.enabled, options.staleTime])

  // Simular useQueries para múltiplas queries (já que não temos acesso direto)
  const results = permissionKeys.map(key => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useQuery(permissionQueries.find(q => 
      q.queryKey.includes(permissions[key].resource) && 
      q.queryKey.includes(permissions[key].action)
    )!)
  })

  const permissionsMap = useMemo(() => {
    const map: Record<string, boolean> = {}
    permissionKeys.forEach((key, index) => {
      const result = results[index]
      map[key] = result.data?.[key] ?? false
    })
    return map
  }, [results, permissionKeys])

  const isLoading = sessionLoading || results.some(r => r.isLoading)
  const errors = results.map(r => r.error).filter(Boolean) as Error[]
  const hasAllPermissions = Object.values(permissionsMap).every(Boolean)
  const hasAnyPermission = Object.values(permissionsMap).some(Boolean)

  const refetchAll = useCallback(() => {
    results.forEach(r => r.refetch())
  }, [results])

  return {
    permissions: permissionsMap,
    isLoading,
    hasAllPermissions,
    hasAnyPermission,
    errors,
    refetch: refetchAll
  }
}

/**
 * Hook para verificar se o usuário é owner do negócio/organização
 */
export function useIsOwner(organizationId?: string): PermissionResult {
  return usePermission('business', 'delete', {
    enabled: !!organizationId
  })
}

/**
 * Hook para verificar se o usuário pode gerenciar funcionários
 */
export function useCanManageEmployees(organizationId?: string): PermissionResult {
  return usePermission('employees', 'manage', {
    enabled: !!organizationId
  })
}

/**
 * Hook para verificar se o usuário pode ver analytics avançados
 */
export function useCanViewAdvancedAnalytics(organizationId?: string): PermissionResult {
  return usePermission('analytics', 'advanced', {
    enabled: !!organizationId
  })
}

/**
 * Hook para verificar permissões de gestão de produtos
 */
export function useProductPermissions() {
  return usePermissions({
    canView: { resource: 'products', action: 'view' },
    canCreate: { resource: 'products', action: 'create' },
    canUpdate: { resource: 'products', action: 'update' },
    canDelete: { resource: 'products', action: 'delete' },
    canManage: { resource: 'products', action: 'manage' }
  })
}

/**
 * Hook para verificar permissões de gestão de pedidos
 */
export function useOrderPermissions() {
  return usePermissions({
    canView: { resource: 'orders', action: 'view' },
    canCreate: { resource: 'orders', action: 'create' },
    canUpdate: { resource: 'orders', action: 'update' },
    canCancel: { resource: 'orders', action: 'cancel' },
    canRefund: { resource: 'orders', action: 'refund' },
    canExport: { resource: 'orders', action: 'export' }
  })
}

/**
 * Hook para verificar permissões completas de um negócio
 */
export function useBusinessPermissions() {
  return usePermissions({
    canView: { resource: 'business', action: 'view' },
    canUpdate: { resource: 'business', action: 'update' },
    canManage: { resource: 'business', action: 'manage' },
    canDelete: { resource: 'business', action: 'delete' }
  })
}

/**
 * Hook para verificar permissões completas de um restaurante (alias para compatibilidade)
 */
export function useRestaurantPermissions() {
  return useBusinessPermissions()
}

/**
 * Hook para obter informações da organização ativa
 */
export function useActiveOrganization() {
  const { data: session } = useSession()

  return useQuery({
    queryKey: ['active-organization', session?.session?.activeOrganizationId],
    queryFn: async () => {
      if (!session?.session?.activeOrganizationId) return null

      try {
        const response = await fetch(`/api/organizations/${session.session.activeOrganizationId}`)
        
        if (!response.ok) {
          throw new Error('Erro ao buscar organização')
        }

        return await response.json()
      } catch (error) {
        console.error('Erro ao buscar organização ativa:', error)
        return null
      }
    },
    enabled: !!session?.session?.activeOrganizationId,
    staleTime: 10 * 60 * 1000 // 10 minutos
  })
}

/**
 * Hook para invalidar cache de permissões
 */
export function useInvalidatePermissions() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  return useCallback((
    resource?: PermissionResource,
    action?: PermissionAction
  ) => {
    if (resource && action) {
      // Invalidar permissão específica
      queryClient.invalidateQueries({
        queryKey: ['permission', resource, action, session?.user?.id]
      })
    } else {
      // Invalidar todas as permissões do usuário
      queryClient.invalidateQueries({
        queryKey: ['permission', session?.user?.id]
      })
    }
  }, [queryClient, session?.user?.id])
}

/**
 * Context para fornecer informações de permissão globalmente
 */
export interface PermissionContextValue {
  /** Função para verificar permissão */
  checkPermission: (resource: PermissionResource, action: PermissionAction) => Promise<boolean>
  /** Função para invalidar cache */
  invalidatePermissions: (resource?: PermissionResource, action?: PermissionAction) => void
  /** Se o usuário está autenticado */
  isAuthenticated: boolean
  /** Role do usuário */
  userRole?: string
}

/**
 * Hook personalizado para ações baseadas em role
 */
export function useRoleBasedActions() {
  const { data: session } = useSession()
  const userRole = session?.user?.role

  const isOwner = userRole === 'businessOwner'
  const isAdmin = userRole === 'businessAdmin' || isOwner
  const isManager = userRole === 'businessManager' || isAdmin
  const isStaff = userRole === 'businessStaff' || isManager
  const isCustomer = userRole === 'customer'

  return {
    userRole,
    isOwner,
    isAdmin,
    isManager,
    isStaff,
    isCustomer,
    canAccessAdminFeatures: isAdmin,
    canManageRestaurant: isManager,
    canProcessOrders: isStaff,
    canViewReports: isManager
  }
}