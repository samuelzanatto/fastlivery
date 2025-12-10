import { useMemo, useCallback, useEffect } from 'react'
import { PLATFORM_ROLES } from '@/lib/auth/auth-permissions'
import { useBusinessStore } from '@/stores/business-store'
import { useSession } from '@/lib/auth/auth-client'

// Types para Business e Membership
type EmployeeUpdateData = {
  name?: string
  email?: string
  role?: string
  salary?: number | null
  startDate?: Date | null
  endDate?: Date | null
  notes?: string | null
  isActive?: boolean
}

/**
 * Hook principal para contexto do negócio
 * Facilita o trabalho com organizações mapeando para o modelo de negócio genérico
 */
export function useBusinessContext() {
  const { data: session, isPending } = useSession();
  const business = useBusinessStore((state) => state.business);
  const membershipRole = useBusinessStore((state) => state.membershipRole);
  const isEmployee = useBusinessStore((state) => state.isEmployee);
  const employeeRole = useBusinessStore((state) => state.employeeRole);
  const loading = useBusinessStore((state) => state.loading);
  const initialized = useBusinessStore((state) => state.initialized);
  const error = useBusinessStore((state) => state.error);
  const storeHasPermission = useBusinessStore((state) => state.hasPermission);
  const { fetchBusiness, updateBusinessInStore, refreshBusiness } = useBusinessStore();

  // Buscar dados do negócio quando necessário
  useEffect(() => {
    if (session?.user?.id && !business && !loading) {
      fetchBusiness(session.user.id);
    }
  }, [session?.user?.id, business, loading, fetchBusiness]);

  // Função para verificar permissões baseadas no banco de dados
  const hasPermission = useCallback((resource: string, action: string) => {
    // Se é dono, tem todas as permissões
    if (!isEmployee) return true;
    
    // Usar a função do store
    return storeHasPermission(resource, action);
  }, [isEmployee, storeHasPermission]);

  // Computar permissões baseadas nas permissões reais do banco
  const permissions = useMemo(() => {
    // Se não está logado ou não tem role
    if (!membershipRole) {
      return {
        isOwner: false,
        isManager: false,
        isAdmin: false,
        isStaff: false,
        isEmployee: false,
        canManageBusiness: false,
        canManageOrders: false,
        canManageProducts: false,
        canManageEmployees: false,
        canViewAnalytics: false,
        canManageBilling: false,
        canManageSettings: false,
        hasFullAccess: false,
      };
    }

    // Se é dono, tem acesso total
    if (!isEmployee) {
      return {
        isOwner: true,
        isManager: true,
        isAdmin: true,
        isStaff: false,
        isEmployee: false,
        canManageBusiness: true,
        canManageOrders: true,
        canManageProducts: true,
        canManageEmployees: true,
        canViewAnalytics: true,
        canManageBilling: true,
        canManageSettings: true,
        hasFullAccess: true,
      };
    }

    // Para funcionários, verificar permissões granulares
    return {
      isOwner: false,
      isManager: false,
      isAdmin: false,
      isStaff: true,
      isEmployee: true,

      // Permissões baseadas no banco de dados
      canManageBusiness: hasPermission('business', 'manage'),
      canManageOrders: hasPermission('orders', 'view') || hasPermission('orders', 'manage'),
      canManageProducts: hasPermission('products', 'manage') || hasPermission('products', 'view'),
      canManageEmployees: hasPermission('employees', 'manage'),
      canViewAnalytics: hasPermission('analytics', 'view'),
      canManageBilling: hasPermission('billing', 'manage'),
      canManageSettings: hasPermission('settings', 'view') || hasPermission('settings', 'manage'),
      hasFullAccess: false,
    };
  }, [membershipRole, isEmployee, hasPermission]);

  const membership = membershipRole ? { role: membershipRole } : null;

  return {
    // Dados principais
    business,
    user: session?.user,
    membership,
    membershipRole,
    isEmployee,
    employeeRole,
    
    // Estados de loading
    loading,
    initialized,
    isPending,
    error,
    
    // Permissões
    permissions,
    hasPermission,
    
    // Actions
    updateBusiness: updateBusinessInStore,
    refreshBusiness,
    
    // Computed
    isAuthenticated: !!session?.user,
    hasAccess: !!business && !!membershipRole,
  };
}

/**
 * Hook para gerenciar funcionários/membros da organização
 */
export function useBusinessEmployees() {
  const { business, permissions } = useBusinessContext();

  // Por enquanto, dados mockados
  const employees = useMemo(() => {
    if (!business) return [];
    
    // Dados de exemplo - depois será substituído pela API
    return [
      {
        id: '1',
        name: 'João Silva',
        email: 'joao@example.com',
        role: 'manager',
        joinedAt: new Date('2024-01-15'),
        isActive: true,
        salary: 5000,
        avatar: null,
      },
      {
        id: '2',
        name: 'Maria Santos',
        email: 'maria@example.com',
        role: 'chef',
        joinedAt: new Date('2024-02-10'),
        isActive: true,
        salary: 4000,
        avatar: null,
      },
    ];
  }, [business]);

  const inviteEmployee = useCallback(async (email: string, role: string) => {
    if (!permissions.canManageEmployees) {
      throw new Error('Sem permissão para convidar funcionários');
    }

    // TODO: Implementar API call
    console.log('Convidando funcionário:', { email, role });
  }, [permissions.canManageEmployees]);

  const updateEmployee = useCallback(async (employeeId: string, data: Partial<EmployeeUpdateData>) => {
    if (!permissions.canManageEmployees) {
      throw new Error('Sem permissão para editar funcionários');
    }

    // TODO: Implementar API call
    console.log('Atualizando funcionário:', { employeeId, data });
  }, [permissions.canManageEmployees]);

  const removeEmployee = useCallback(async (employeeId: string) => {
    if (!permissions.canManageEmployees) {
      throw new Error('Sem permissão para remover funcionários');
    }

    // TODO: Implementar API call
    console.log('Removendo funcionário:', employeeId);
  }, [permissions.canManageEmployees]);

  return {
    employees,
    inviteEmployee,
    updateEmployee,
    removeEmployee,
    canManageEmployees: permissions.canManageEmployees,
    loading: false, // TODO: implementar loading state
  };
}

/**
 * Hook para impersonificação de usuários (admin only)
 */
export function useUserImpersonation() {
  const { permissions } = useBusinessContext();
  
  const impersonateUser = useCallback(async (userId: string) => {
    if (!permissions.hasFullAccess) {
      throw new Error('Sem permissão para impersonificar usuários');
    }

    // TODO: Implementar com better-auth
    console.log('Impersonando usuário:', userId);
  }, [permissions.hasFullAccess]);

  const stopImpersonation = useCallback(async () => {
    // TODO: Implementar
    console.log('Parando impersonificação');
  }, []);

  return {
    impersonateUser,
    stopImpersonation,
    canImpersonate: permissions.hasFullAccess,
  };
}

/**
 * Hook para gerenciar usuários da plataforma (platform admin only)
 */
export function usePlatformUsers() {
  const { user } = useBusinessContext();
  
  const isPlatformAdmin = user?.role === PLATFORM_ROLES.ADMIN;

  const listUsers = useCallback(async () => {
    if (!isPlatformAdmin) {
      throw new Error('Acesso negado: apenas administradores da plataforma');
    }

    // TODO: Implementar API call
    return [];
  }, [isPlatformAdmin]);

  return {
    listUsers,
    isPlatformAdmin,
  };
}

// Types exportados
export type BusinessData = NonNullable<ReturnType<typeof useBusinessContext>['business']>;
export type MembershipData = NonNullable<ReturnType<typeof useBusinessContext>['membership']>;
export type EmployeeData = ReturnType<typeof useBusinessEmployees>['employees'][0];
