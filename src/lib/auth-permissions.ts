import { createAccessControl } from "better-auth/plugins/access";

/**
 * Definição de Recursos e Ações do Sistema ZapLivery
 * 
 * Cada recurso possui ações específicas que podem ser controladas
 * por roles diferentes dentro de um restaurante/organização
 */
export const statement = {
  // Gestão do Restaurante
  restaurant: [
    "view",        // Ver dados básicos do restaurante
    "update",      // Atualizar informações (nome, descrição, etc.)
    "manage",      // Controle total (configurações avançadas, ativação/desativação)
    "delete"       // Deletar restaurante (apenas owner)
  ],
  
  // Gestão de Pedidos
  orders: [
    "view",        // Visualizar pedidos
    "create",      // Criar novos pedidos (ex: balcão)
    "update",      // Atualizar status dos pedidos
    "cancel",      // Cancelar pedidos
    "refund",      // Processar reembolsos
    "export"       // Exportar relatórios de pedidos
  ],
  
  // Gestão de Produtos e Cardápio
  products: [
    "view",        // Ver produtos do cardápio
    "create",      // Adicionar novos produtos
    "update",      // Editar produtos existentes
    "delete",      // Remover produtos
    "manage"       // Controle total do cardápio (categorias, preços em lote)
  ],
  
  // Gestão de Funcionários
  employees: [
    "view",        // Ver lista de funcionários
    "invite",      // Convidar novos funcionários
    "manage",      // Gerenciar roles e permissões
    "remove",      // Remover funcionários
    "salary"       // Ver/gerenciar salários
  ],
  
  // Analytics e Relatórios
  analytics: [
    "view",        // Visualizar dashboards básicos
    "advanced",    // Acessar analytics avançados
    "export",      // Exportar relatórios
    "financial"    // Ver dados financeiros detalhados
  ],
  
  // Gestão Financeira e Cobrança
  billing: [
    "view",        // Ver informações de cobrança
    "manage",      // Alterar planos e formas de pagamento
    "history"      // Histórico completo de transações
  ],
  
  // Configurações de Pagamento (Stripe, MercadoPago)
  payments: [
    "view",        // Ver configurações atuais
    "configure",   // Configurar gateways de pagamento
    "test"         // Executar testes de pagamento
  ],
  
  // Gestão de Mesas (para Dine-in)
  tables: [
    "view",        // Ver mesas disponíveis
    "manage",      // Criar/editar/deletar mesas
    "reserve",     // Gerenciar reservas
    "qr"           // Gerar/regenerar QR codes
  ],
  
  // Promoções e Marketing
  promotions: [
    "view",        // Ver promoções ativas
    "create",      // Criar novas promoções
    "update",      // Editar promoções existentes
    "delete",      // Remover promoções
    "analytics"    // Ver performance das promoções
  ],
  
  // Configurações do Sistema
  settings: [
    "view",        // Ver configurações básicas
    "update",      // Alterar configurações operacionais
    "advanced",    // Configurações avançadas (integrations, webhooks)
    "security"     // Configurações de segurança
  ]
} as const;

// Criar o controlador de acesso
const ac = createAccessControl(statement);

/**
 * ROLES DO SISTEMA ZAPLIVERY
 */

// 👑 OWNER - Proprietário do Restaurante
// Acesso total a todas as funcionalidades
export const restaurantOwner = ac.newRole({
  restaurant: ["view", "update", "manage", "delete"],
  orders: ["view", "create", "update", "cancel", "refund", "export"],
  products: ["view", "create", "update", "delete", "manage"],
  employees: ["view", "invite", "manage", "remove", "salary"],
  analytics: ["view", "advanced", "export", "financial"],
  billing: ["view", "manage", "history"],
  payments: ["view", "configure", "test"],
  tables: ["view", "manage", "reserve", "qr"],
  promotions: ["view", "create", "update", "delete", "analytics"],
  settings: ["view", "update", "advanced", "security"]
});

// 👨‍💼 MANAGER - Gerente do Restaurante
// Controle operacional completo, sem acesso a finanças críticas
export const restaurantManager = ac.newRole({
  restaurant: ["view", "update"],
  orders: ["view", "create", "update", "cancel", "export"],
  products: ["view", "create", "update", "delete", "manage"],
  employees: ["view", "invite", "manage"],
  analytics: ["view", "advanced", "export"],
  billing: ["view"],
  payments: ["view"],
  tables: ["view", "manage", "reserve", "qr"],
  promotions: ["view", "create", "update", "delete", "analytics"],
  settings: ["view", "update"]
});

// 👨‍🍳 CHEF - Chefe de Cozinha
// Foco em produtos, pedidos e operações da cozinha
export const restaurantChef = ac.newRole({
  restaurant: ["view"],
  orders: ["view", "update"], // Pode atualizar status (preparando, pronto)
  products: ["view", "create", "update", "manage"],
  employees: ["view"],
  analytics: ["view"],
  billing: [],
  payments: [],
  tables: ["view"],
  promotions: ["view"],
  settings: ["view"]
});

// 🍽️ WAITER - Garçom/Atendente
// Foco em pedidos, mesas e atendimento
export const restaurantWaiter = ac.newRole({
  restaurant: ["view"],
  orders: ["view", "create", "update"], // Pode criar pedidos e atualizar status
  products: ["view"],
  employees: ["view"],
  analytics: ["view"],
  billing: [],
  payments: [],
  tables: ["view", "reserve"], // Pode gerenciar reservas
  promotions: ["view"],
  settings: ["view"]
});

// 💰 CASHIER - Operador de Caixa
// Foco em pedidos, pagamentos e operações financeiras básicas
export const restaurantCashier = ac.newRole({
  restaurant: ["view"],
  orders: ["view", "create", "update", "cancel"],
  products: ["view"],
  employees: ["view"],
  analytics: ["view"],
  billing: ["view"],
  payments: ["view"],
  tables: ["view"],
  promotions: ["view"],
  settings: ["view"]
});

// 👤 EMPLOYEE - Funcionário Básico
// Acesso mínimo para operações básicas
export const restaurantEmployee = ac.newRole({
  restaurant: ["view"],
  orders: ["view", "update"], // Pode ver e atualizar status apenas
  products: ["view"],
  employees: ["view"],
  analytics: [],
  billing: [],
  payments: [],
  tables: ["view"],
  promotions: ["view"],
  settings: []
});

/**
 * ROLES DE PLATAFORMA (Para administração do SaaS)
 */

// 🔧 PLATFORM_ADMIN - Administrador da Plataforma
// Controle total sobre todos os restaurantes e usuários
export const platformAdmin = ac.newRole({
  restaurant: ["view", "update", "manage", "delete"],
  orders: ["view", "create", "update", "cancel", "refund", "export"],
  products: ["view", "create", "update", "delete", "manage"],
  employees: ["view", "invite", "manage", "remove", "salary"],
  analytics: ["view", "advanced", "export", "financial"],
  billing: ["view", "manage", "history"],
  payments: ["view", "configure", "test"],
  tables: ["view", "manage", "reserve", "qr"],
  promotions: ["view", "create", "update", "delete", "analytics"],
  settings: ["view", "update", "advanced", "security"]
});

// 🛠️ SUPPORT - Suporte Técnico
// Acesso para debugging e suporte, sem alterações críticas
export const platformSupport = ac.newRole({
  restaurant: ["view"],
  orders: ["view", "export"],
  products: ["view"],
  employees: ["view"],
  analytics: ["view", "advanced", "export"],
  billing: ["view", "history"],
  payments: ["view"],
  tables: ["view"],
  promotions: ["view"],
  settings: ["view"]
});

// 👥 CUSTOMER - Cliente Final
// Acesso apenas para fazer pedidos e ver histórico
export const customer = ac.newRole({
  restaurant: ["view"],
  orders: ["view", "create"],
  products: ["view"],
  employees: [],
  analytics: [],
  billing: [],
  payments: [],
  tables: ["view"],
  promotions: ["view"],
  settings: []
});

/**
 * Exportar o controlador de acesso e roles para uso no auth.ts
 */
export { ac };

/**
 * Type para representar uma role do sistema
 */
type SystemRole = typeof restaurantOwner | typeof restaurantManager | typeof restaurantChef | 
                  typeof restaurantWaiter | typeof restaurantCashier | typeof restaurantEmployee |
                  typeof platformAdmin | typeof platformSupport | typeof customer;

/**
 * Utility para mapear roles do sistema atual para os novos roles
 */
export function mapLegacyRoleToNewRole(legacyRole: string): SystemRole {
  const roleMap: Record<string, SystemRole> = {
    'owner': restaurantOwner,
    'admin': restaurantOwner,
    'manager': restaurantManager,
    'chef': restaurantChef,
    'waiter': restaurantWaiter,
    'cashier': restaurantCashier,
    'employee': restaurantEmployee,
    'platform_admin': platformAdmin,
    'support': platformSupport,
    'customer': customer
  };
  
  return roleMap[legacyRole.toLowerCase()] || restaurantEmployee;
}

/**
 * Utility para obter permissões de uma role específica
 */
export function getRolePermissions(roleName: string): Record<string, string[]> | null {
  const role = mapLegacyRoleToNewRole(roleName);
  if (!role) return null;
  
  // Esta função seria implementada para extrair as permissões da role
  // Por enquanto, retorna um objeto baseado na role
  const rolePermissions: Record<string, Record<string, string[]>> = {
    'owner': {
      restaurant: ["view", "update", "manage", "delete"],
      orders: ["view", "create", "update", "cancel", "refund", "export"],
      products: ["view", "create", "update", "delete", "manage"],
      // ... outras permissões
    },
    'manager': {
      restaurant: ["view", "update"],
      orders: ["view", "create", "update", "cancel", "export"],
      products: ["view", "create", "update", "delete", "manage"],
      // ... outras permissões
    },
    // ... outras roles
  };
  
  return rolePermissions[roleName.toLowerCase()] || null;
}

/**
 * Constantes para uso em componentes
 */
export const RESTAURANT_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  CHEF: 'chef',
  WAITER: 'waiter',
  CASHIER: 'cashier',
  EMPLOYEE: 'employee'
} as const;

export const PLATFORM_ROLES = {
  ADMIN: 'platform_admin',
  SUPPORT: 'support'
} as const;

export const USER_ROLES = {
  CUSTOMER: 'customer'
} as const;