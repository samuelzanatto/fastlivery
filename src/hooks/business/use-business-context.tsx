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
  const loading = useBusinessStore((state) => state.loading);
  const initialized = useBusinessStore((state) => state.initialized);
  const error = useBusinessStore((state) => state.error);
  const { fetchBusiness, updateBusinessInStore, refreshBusiness } = useBusinessStore();

  // Buscar dados do negócio quando necessário
  useEffect(() => {
    if (session?.user?.id && !business && !loading) {
      fetchBusiness(session.user.id);
    }
  }, [session?.user?.id, business, loading, fetchBusiness]);

  // Computar permissões baseadas no role do usuário
  const permissions = useMemo(() => {
    if (!membershipRole) {
      return {
        isOwner: false,
        isManager: false,
        isAdmin: false,
        isStaff: false,
        canManageBusiness: false,
        canManageOrders: false,
        canManageProducts: false,
        canManageEmployees: false,
        canViewAnalytics: false,
        canManageBilling: false,
        hasFullAccess: false,
      };
    }

    const isOwner = membershipRole === 'owner';
    const isManager = membershipRole === 'manager';
    const isAdmin = membershipRole === 'admin';
    const isStaff = ['chef', 'waiter', 'cashier', 'employee'].includes(membershipRole);

    return {
      // Role checks
      isOwner,
      isManager,
      isAdmin,
      isStaff,

      // Permission checks baseadas nos roles
      canManageBusiness: isOwner || isAdmin,
      canManageOrders: isOwner || isManager || isAdmin || isStaff,
      canManageProducts: isOwner || isManager || isAdmin,
      canManageEmployees: isOwner || isAdmin,
      canViewAnalytics: isOwner || isManager || isAdmin,
      canManageBilling: isOwner,
      hasFullAccess: isOwner,
    };
  }, [membershipRole]);

  const membership = membershipRole ? { role: membershipRole } : null;

  return {
    // Dados principais
    business,
    user: session?.user,
    membership,
    membershipRole,
    
    // Estados de loading
    loading,
    initialized,
    isPending,
    error,
    
    // Permissões
    permissions,
    
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
