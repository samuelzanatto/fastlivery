import { useMemo, useCallback, useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { getRolePermissions, RESTAURANT_ROLES, PLATFORM_ROLES } from '@/lib/auth-permissions'

// Types para Restaurant e Membership
type Restaurant = {
  id: string
  name: string
  email?: string
  slug?: string | null
  description?: string | null
  phone?: string | null
  address?: string | null
  avatar?: string | null
  banner?: string | null
  isOpen?: boolean
  openingHours?: string | null
  deliveryFee?: number
  minimumOrder?: number
  deliveryTime?: number
  acceptsDelivery?: boolean
  acceptsPickup?: boolean
  acceptsDineIn?: boolean
  isActive?: boolean
  subscriptionPlan?: string
  subscription?: { planId: string }
  mercadoPagoAccessToken?: string | null
  mercadoPagoPublicKey?: string | null
  mercadoPagoConfigured?: boolean
  createdAt?: Date
  updatedAt?: Date
  cuisine?: string
}

type Membership = {
  id: string
  role: string
  joinedAt: Date
  isActive: boolean
  salary?: number | null
  startDate?: Date | null
  endDate?: Date | null
  notes?: string | null
}

/**
 * Hook principal para contexto do restaurante
 * Facilita o trabalho com organizações mapeando para o modelo de restaurante
 */
export function useRestaurantContext() {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const [isLoading, setIsLoading] = useState(true)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)

  // Função para criar restaurante básico
  const createBasicRestaurant = useCallback(async () => {
    if (!user?.name || !user?.email) return false;

    try {
      console.log('[useRestaurantContext] Criando restaurante básico para usuário:', user.email)
      
      const response = await fetch('/api/restaurant/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          restaurantName: `Restaurante de ${user.name}`,
          restaurantPhone: '(00) 00000-0000',
          restaurantAddress: 'Endereço a definir',
          category: 'Restaurante'
        })
      })

      if (!response.ok) {
        throw new Error(`Erro ao criar restaurante: ${response.status}`)
      }

      const result = await response.json()
      console.log('[useRestaurantContext] Restaurante criado:', result.id)
      
      // Recarregar dados após criação
      const meResponse = await fetch('/api/restaurant/me', {
        method: 'GET',
        credentials: 'include'
      })
      
      if (meResponse.ok) {
        const data = await meResponse.json()
        setRestaurant(data.restaurant)
        
        setMembership({
          id: user.id + '-member',
          role: RESTAURANT_ROLES.OWNER,
          joinedAt: new Date(),
          isActive: true,
          salary: null,
          startDate: new Date(),
          endDate: null,
          notes: 'Owner'
        })
      }
      
      return true;
    } catch (error) {
      console.error('[useRestaurantContext] Erro ao criar restaurante básico:', error);
      return false;
    }
  }, [user]);

  // Buscar dados reais da organização do usuário
  useEffect(() => {
    async function fetchRestaurantData() {
      if (!user?.id) {
        setIsLoading(false)
        return
      }

      try {
        console.log('[useRestaurantContext] Buscando dados do restaurante para usuário:', user.id)
        
        // Buscar dados reais do restaurante via API
        const response = await fetch('/api/restaurant/me', {
          method: 'GET',
          credentials: 'include'
        })

        if (!response.ok) {
          if (response.status === 404) {
            // Usuário não tem restaurante ainda - criar um básico
            console.log('[useRestaurantContext] Usuário não possui restaurante, criando um básico...')
            
            const created = await createBasicRestaurant()
            if (!created) {
              // Se não conseguiu criar, definir como null
              setRestaurant(null)
              setMembership(null)
            }
          } else {
            throw new Error(`Erro ao buscar restaurante: ${response.status}`)
          }
        } else {
          const data = await response.json()
          console.log('[useRestaurantContext] Dados completos recebidos:', data)
          console.log('[useRestaurantContext] Nome do restaurante:', data.restaurant?.name)
          
          setRestaurant(data.restaurant)
          
          // Configurar membership como owner por padrão
          setMembership({
            id: user.id + '-member',
            role: RESTAURANT_ROLES.OWNER,
            joinedAt: new Date(),
            isActive: true,
            salary: null,
            startDate: new Date(),
            endDate: null,
            notes: 'Owner'
          })
        }
        
      } catch (error) {
        console.error('[useRestaurantContext] Erro ao buscar dados do restaurante:', error)
        
        // Em caso de erro, usar dados básicos temporários
        setRestaurant({
          id: user.id + '-org',
          name: user.name ? `Restaurante de ${user.name}` : 'Meu Restaurante',
          slug: 'meu-restaurante',
          description: '',
          cuisine: '',
          phone: '',
          address: '',
          deliveryFee: 0,
          minimumOrder: 0,
          deliveryTime: 30,
          acceptsDelivery: true,
          acceptsPickup: true,
          acceptsDineIn: false,
          isOpen: false,
          isActive: true,
          subscriptionPlan: 'pro',
          openingHours: null,
          subscription: { planId: 'pro' },
          mercadoPagoAccessToken: null,
          mercadoPagoPublicKey: null,
          mercadoPagoConfigured: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        
        setMembership({
          id: user.id + '-member',
          role: RESTAURANT_ROLES.OWNER,
          joinedAt: new Date(),
          isActive: true,
          salary: null,
          startDate: new Date(),
          endDate: null,
          notes: 'Owner padrão'
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchRestaurantData()
  }, [user, createBasicRestaurant])

  // Permissões baseadas no papel na organização
  const permissions = useMemo(() => {
    if (!membership) return null;
    return getRolePermissions(membership.role);
  }, [membership]);

  // Helpers para verificar roles específicas
  const roleChecks = useMemo(() => ({
    isOwner: membership?.role === RESTAURANT_ROLES.OWNER,
    isManager: membership?.role === RESTAURANT_ROLES.MANAGER,
    isChef: membership?.role === RESTAURANT_ROLES.CHEF,
    isWaiter: membership?.role === RESTAURANT_ROLES.WAITER,
    isCashier: membership?.role === RESTAURANT_ROLES.CASHIER,
    isEmployee: membership?.role === RESTAURANT_ROLES.EMPLOYEE,
    isPlatformAdmin: membership?.role === PLATFORM_ROLES.ADMIN,
    isPlatformSupport: membership?.role === PLATFORM_ROLES.SUPPORT,
    // Helpers combinados
    canManageRestaurant: permissions?.restaurant?.includes("manage") || false,
    canManageEmployees: permissions?.employees?.includes("manage") || false,
    canViewAnalytics: permissions?.analytics?.includes("view") || false,
    canManageBilling: permissions?.billing?.includes("manage") || false,
    canManageProducts: permissions?.products?.includes("manage") || false,
    canManageOrders: permissions?.orders?.includes("update") || false
  }), [membership, permissions]);

  // Lista de restaurantes do usuário
  const userRestaurants = useMemo(() => {
    if (!user) return [];
    
    return [{
      id: restaurant?.id || 'org-1',
      name: restaurant?.name || 'Meu Restaurante',
      slug: restaurant?.slug || 'meu-restaurante',
      isActive: restaurant?.isActive || true,
      role: membership?.role || 'owner'
    }];
  }, [user, restaurant, membership]);

  // Função para trocar de restaurante ativo
  const switchRestaurant = useCallback(async (restaurantId: string) => {
    try {
      console.log('Trocar para restaurante:', restaurantId);
      return true;
    } catch (error) {
      console.error('Erro ao trocar restaurante:', error);
      return false;
    }
  }, []);

  // Função para atualizar dados do restaurante
  const updateRestaurant = useCallback(async (data: Partial<NonNullable<typeof restaurant>>) => {
    if (!restaurant?.id) return false;

    try {
      console.log('Atualizando restaurante:', data);
      
      const response = await fetch('/api/restaurant/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error(`Erro ao atualizar restaurante: ${response.status}`)
      }

      const result = await response.json()
      
      // Atualizar estado local
      setRestaurant(result.restaurant)
      
      console.log('Restaurante atualizado com sucesso')
      return true;
    } catch (error) {
      console.error('Erro ao atualizar restaurante:', error);
      return false;
    }
  }, [restaurant]);

  return {
    // Dados principais
    user,
    restaurant,
    membership,
    permissions,
    userRestaurants,
    
    // Verificações de role
    ...roleChecks,
    
    // Ações
    switchRestaurant,
    updateRestaurant,
    createBasicRestaurant,
    
    // Estados
    isLoading,
    hasActiveRestaurant: !!restaurant,
    hasMultipleRestaurants: userRestaurants.length > 1
  };
}

/**
 * Hook para gerenciar funcionários/membros da organização
 */
export function useRestaurantEmployees() {
  const { restaurant, permissions } = useRestaurantContext();

  // Por enquanto, dados mockados
  const employees = useMemo(() => {
    if (!restaurant) return [];
    
    // Dados de exemplo - depois será substituído pela API
    return [{
      id: 'member-1',
      userId: 'user-1',
      name: 'Funcionário Exemplo',
      email: 'funcionario@exemplo.com',
      role: 'employee',
      isActive: true,
      salary: null,
      startDate: new Date(),
      endDate: null,
      notes: null,
      joinedAt: new Date()
    }];
  }, [restaurant]);

  // Função para convidar funcionário
  const inviteEmployee = useCallback(async (email: string, role: string, inviteMessage?: string) => {
    if (!restaurant?.id || !permissions?.employees?.includes('invite')) {
      throw new Error('Sem permissão para convidar funcionários');
    }

    try {
      console.log('Convidar funcionário:', { email, role, inviteMessage });
      return true;
    } catch (error) {
      console.error('Erro ao convidar funcionário:', error);
      return false;
    }
  }, [restaurant, permissions]);

  // Função para atualizar funcionário
  const updateEmployee = useCallback(async (memberId: string, data: {
    role?: string;
    isActive?: boolean;
    salary?: number;
    notes?: string;
    endDate?: Date;
  }) => {
    if (!restaurant?.id || !permissions?.employees?.includes('manage')) {
      throw new Error('Sem permissão para gerenciar funcionários');
    }

    try {
      console.log('Atualizar funcionário:', { memberId, data });
      return true;
    } catch (error) {
      console.error('Erro ao atualizar funcionário:', error);
      return false;
    }
  }, [restaurant, permissions]);

  // Função para remover funcionário
  const removeEmployee = useCallback(async (memberId: string) => {
    if (!restaurant?.id || !permissions?.employees?.includes('remove')) {
      throw new Error('Sem permissão para remover funcionários');
    }

    try {
      console.log('Remover funcionário:', memberId);
      return true;
    } catch (error) {
      console.error('Erro ao remover funcionário:', error);
      return false;
    }
  }, [restaurant, permissions]);

  return {
    employees,
    canInvite: permissions?.employees?.includes('invite') || false,
    canManage: permissions?.employees?.includes('manage') || false,
    canRemove: permissions?.employees?.includes('remove') || false,
    inviteEmployee,
    updateEmployee,
    removeEmployee
  };
}

/**
 * Hook para verificar permissões específicas
 */
export function usePermissions() {
  const { permissions } = useRestaurantContext();

  const hasPermission = useCallback((resource: string, action: string): boolean => {
    if (!permissions || !permissions[resource]) return false;
    return permissions[resource].includes(action);
  }, [permissions]);

  const hasAnyPermission = useCallback((resource: string, actions: string[]): boolean => {
    if (!permissions || !permissions[resource]) return false;
    return actions.some(action => permissions[resource].includes(action));
  }, [permissions]);

  const hasAllPermissions = useCallback((resource: string, actions: string[]): boolean => {
    if (!permissions || !permissions[resource]) return false;
    return actions.every(action => permissions[resource].includes(action));
  }, [permissions]);

  // Helper function para verificar se pode gerenciar um recurso específico
  const canManage = useCallback((resource: string): boolean => {
    return hasPermission(resource, 'manage');
  }, [hasPermission]);

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canManage
  };
}

/**
 * Hook para Admin da plataforma
 */
export function usePlatformAdmin() {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  
  // Verificar se é admin da plataforma
  const isPlatformAdmin = useMemo(() => {
    return user?.role === PLATFORM_ROLES.ADMIN || 
           user?.role === PLATFORM_ROLES.SUPPORT ||
           user?.role === 'admin';
  }, [user]);

  // Função para fazer impersonation
  const impersonateUser = useCallback(async (userId: string) => {
    if (!isPlatformAdmin) {
      throw new Error('Apenas administradores podem fazer impersonation');
    }

    try {
      await authClient.admin.impersonateUser({ userId });
      return true;
    } catch (error) {
      console.error('Erro ao fazer impersonation:', error);
      return false;
    }
  }, [isPlatformAdmin]);

  // Função para listar usuários (admin)
  const listUsers = useCallback(async (params?: {
    limit?: number;
    offset?: number;
    searchValue?: string;
    searchField?: string;
  }) => {
    if (!isPlatformAdmin) {
      throw new Error('Apenas administradores podem listar usuários');
    }

    try {
      const result = await authClient.admin.listUsers({
        query: {
          searchValue: params?.searchValue,
          searchField: params?.searchField as "email" | "name" | undefined,
          limit: params?.limit,
          offset: params?.offset
        }
      });
      return result.data || [];
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      return [];
    }
  }, [isPlatformAdmin]);

  return {
    isPlatformAdmin,
    impersonateUser,
    listUsers
  };
}

/**
 * Type definitions para TypeScript
 */
export type RestaurantData = NonNullable<ReturnType<typeof useRestaurantContext>['restaurant']>;
export type MembershipData = NonNullable<ReturnType<typeof useRestaurantContext>['membership']>;
export type EmployeeData = ReturnType<typeof useRestaurantEmployees>['employees'][0];