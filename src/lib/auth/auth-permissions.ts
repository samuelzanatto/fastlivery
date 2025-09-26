import { createAccessControl } from "better-auth/plugins/access";

/**
 * Definição de Recursos e Ações do Sistema FastLivery
 * 
 * Cada recurso possui ações específicas que podem ser controladas
 * por roles diferentes dentro de um restaurante/organização
 */
export const statement = {
  // Gestão do Negócio/Empresa
  business: [
    "view",        // Ver dados básicos do negócio
    "update",      // Atualizar informações (nome, descrição, etc.)
    "manage",      // Controle total (configurações avançadas, ativação/desativação)
    "delete"       // Deletar negócio (apenas owner)
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
  ],

  // ================================
  // NOVOS RECURSOS B2B MARKETPLACE
  // ================================
  
  // Marketplace Discovery (para empresas que buscam fornecedores)
  marketplace: [
    "view",        // Visualizar marketplace de fornecedores
    "search",      // Pesquisar e filtrar fornecedores
    "contact",     // Entrar em contato com fornecedores
    "favorite",    // Adicionar fornecedores aos favoritos
    "request",     // Solicitar parcerias
    "analytics"    // Ver analytics de busca e interações
  ],
  
  // Gestão de Parcerias (para empresas)
  partnerships: [
    "view",        // Ver parcerias ativas e pendentes
    "create",      // Criar solicitações de parceria
    "manage",      // Gerenciar termos e condições
    "approve",     // Aprovar solicitações recebidas
    "reject",      // Rejeitar solicitações
    "suspend",     // Suspender parcerias ativas
    "terminate",   // Encerrar parcerias
    "evaluate",    // Avaliar fornecedores
    "renew",       // Renovar contratos
    "export"       // Exportar dados de parcerias
  ],
  
  // Produtos/Serviços do Fornecedor
  supplier_products: [
    "view",        // Ver catálogo de produtos/serviços
    "create",      // Criar novos produtos/serviços
    "update",      // Editar produtos/serviços existentes
    "delete",      // Remover produtos/serviços
    "manage",      // Gestão avançada (preços, disponibilidade)
    "feature",     // Destacar produtos (planos premium)
    "analytics"    // Analytics de performance dos produtos
  ],
  
  // Leads e Oportunidades (para fornecedores)
  leads: [
    "view",        // Ver leads e oportunidades
    "respond",     // Responder a solicitações
    "track",       // Acompanhar status dos leads
    "convert",     // Converter leads em parcerias
    "analytics",   // Analytics de conversão
    "export"       // Exportar dados de leads
  ],
  
  // Avaliações e Reviews
  reviews: [
    "view",        // Ver avaliações recebidas
    "respond",     // Responder a avaliações
    "request",     // Solicitar avaliações de clientes
    "moderate"     // Moderar avaliações (admins)
  ]
} as const;

// Criar o controlador de acesso
const ac = createAccessControl(statement);

/**
 * ROLES DO SISTEMA FASTLIVERY
 */

// =============================================================
// NOVA TAXONOMIA DE ROLES (GENÉRICA / MULTI-VERTICAL)
// =============================================================
// Objetivo: Remover acoplamento semântico exclusivamente a "restaurante"
// e permitir reutilização em outros tipos de negócios/verticais.
// Manteremos aliases para roles legadas até finalizar a refatoração.

// 👑 businessOwner - Proprietário: acesso total
export const businessOwner = ac.newRole({
  business: ["view", "update", "manage", "delete"],
  orders: ["view", "create", "update", "cancel", "refund", "export"],
  products: ["view", "create", "update", "delete", "manage"],
  employees: ["view", "invite", "manage", "remove", "salary"],
  analytics: ["view", "advanced", "export", "financial"],
  billing: ["view", "manage", "history"],
  payments: ["view", "configure", "test"],
  tables: ["view", "manage", "reserve", "qr"],
  promotions: ["view", "create", "update", "delete", "analytics"],
  settings: ["view", "update", "advanced", "security"],
  marketplace: ["view", "search", "contact", "favorite", "request", "analytics"],
  partnerships: ["view", "create", "manage", "approve", "reject", "suspend", "terminate", "evaluate", "renew", "export"],
  supplier_products: [],
  leads: [],
  reviews: ["view", "respond", "request"]
});

// 🧭 businessAdmin - Administração avançada (sem deletar unidade)
export const businessAdmin = ac.newRole({
  business: ["view", "update", "manage"], // sem delete
  orders: ["view", "create", "update", "cancel", "refund", "export"],
  products: ["view", "create", "update", "delete", "manage"],
  employees: ["view", "invite", "manage", "remove", "salary"],
  analytics: ["view", "advanced", "export", "financial"],
  billing: ["view", "manage", "history"],
  payments: ["view", "configure", "test"],
  tables: ["view", "manage", "reserve", "qr"],
  promotions: ["view", "create", "update", "delete", "analytics"],
  settings: ["view", "update", "advanced"], // sem security
  marketplace: ["view", "search", "contact", "favorite", "request", "analytics"],
  partnerships: ["view", "create", "manage", "approve", "reject", "suspend", "evaluate", "renew", "export"],
  supplier_products: [],
  leads: [],
  reviews: ["view", "respond", "request"]
});

// 👨‍💼 businessManager - Operação completa (sem finanças sensíveis / segurança)
export const businessManager = ac.newRole({
  business: ["view", "update"],
  orders: ["view", "create", "update", "cancel", "export"],
  products: ["view", "create", "update", "delete", "manage"],
  employees: ["view", "invite", "manage"],
  analytics: ["view", "advanced", "export"],
  billing: ["view"],
  payments: ["view"],
  tables: ["view", "manage", "reserve", "qr"],
  promotions: ["view", "create", "update", "delete", "analytics"],
  settings: ["view", "update"],
  marketplace: ["view", "search", "contact", "favorite", "request"],
  partnerships: ["view", "create", "manage", "evaluate"],
  supplier_products: [],
  leads: [],
  reviews: ["view", "respond"]
});

// 🧑‍💼 businessStaff - Staff operacional genérico (unifica waiter/chef/cashier)
export const businessStaff = ac.newRole({
  business: ["view"],
  orders: ["view", "create", "update"],
  products: ["view", "update"], // pode ajustar disponibilidade / status
  employees: ["view"],
  analytics: ["view"],
  billing: [],
  payments: [],
  tables: ["view", "reserve"],
  promotions: ["view"],
  settings: ["view"],
  marketplace: ["view"],
  partnerships: ["view"],
  supplier_products: [],
  leads: [],
  reviews: ["view"]
});

// ================================
// ROLES ESPECÍFICAS PARA FORNECEDORES B2B
// ================================

// 👑 supplierOwner - Proprietário do Fornecedor: controle total
export const supplierOwner = ac.newRole({
  business: ["view", "update", "manage", "delete"], // Empresa do fornecedor
  orders: [], // Fornecedores não gerenciam pedidos de delivery
  products: [], // Não gerencia produtos de restaurante
  employees: ["view", "invite", "manage", "remove", "salary"],
  analytics: ["view", "advanced", "export", "financial"],
  billing: ["view", "manage", "history"],
  payments: ["view", "configure", "test"],
  tables: [],
  promotions: [],
  settings: ["view", "update", "advanced", "security"],
  marketplace: [], // Fornecedores não buscam outros fornecedores
  partnerships: ["view", "manage", "approve", "reject", "suspend", "terminate", "evaluate", "renew", "export"],
  supplier_products: ["view", "create", "update", "delete", "manage", "feature", "analytics"],
  leads: ["view", "respond", "track", "convert", "analytics", "export"],
  reviews: ["view", "respond", "request"]
});

// 👨‍💼 supplierManager - Gerente de Vendas e Operações
export const supplierManager = ac.newRole({
  business: ["view", "update"],
  orders: [],
  products: [],
  employees: ["view", "invite", "manage"],
  analytics: ["view", "advanced", "export"],
  billing: ["view"],
  payments: ["view"],
  tables: [],
  promotions: [],
  settings: ["view", "update"],
  marketplace: [],
  partnerships: ["view", "manage", "approve", "reject", "evaluate", "export"],
  supplier_products: ["view", "create", "update", "delete", "manage", "analytics"],
  leads: ["view", "respond", "track", "convert", "analytics", "export"],
  reviews: ["view", "respond", "request"]
});

// 🧑‍💼 supplierStaff - Funcionário de Suporte/Vendas
export const supplierStaff = ac.newRole({
  business: ["view"],
  orders: [],
  products: [],
  employees: ["view"],
  analytics: ["view"],
  billing: [],
  payments: [],
  tables: [],
  promotions: [],
  settings: ["view"],
  marketplace: [],
  partnerships: ["view"],
  supplier_products: ["view", "update"],
  leads: ["view", "respond", "track"],
  reviews: ["view", "respond"]
});

// ===== Aliases (LEGADO) =====
// Mantidos temporariamente para não quebrar importações existentes
// e permitir migração gradual do restante do código.
// Remover após atualizar todas as referências.
export const restaurantOwner = businessOwner;
export const restaurantManager = businessManager;
export const restaurantChef = businessStaff;
export const restaurantWaiter = businessStaff;
export const restaurantCashier = businessStaff;
export const restaurantEmployee = businessStaff;

/**
 * ROLES DE PLATAFORMA (Para administração do SaaS)
 */

// 🔧 PLATFORM_ADMIN - Administrador da Plataforma
// Controle total sobre todos os restaurantes e usuários
export const platformAdmin = ac.newRole({
  business: ["view", "update", "manage", "delete"],
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
  business: ["view"],
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
  business: ["view"],
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
type SystemRole = typeof businessOwner | typeof businessAdmin | typeof businessManager | typeof businessStaff |
                  typeof supplierOwner | typeof supplierManager | typeof supplierStaff |
                  typeof platformAdmin | typeof platformSupport | typeof customer;

/**
 * Utility para mapear roles do sistema atual para os novos roles
 */
export function mapLegacyRoleToNewRole(legacyRole: string): SystemRole {
  const normalized = legacyRole.toLowerCase();
  const roleMap: Record<string, SystemRole> = {
    // Novos canônicos - Business
    'businessowner': businessOwner,
    'businessadmin': businessAdmin,
    'businessmanager': businessManager,
    'businessstaff': businessStaff,
    
    // Novos canônicos - Supplier
    'supplierowner': supplierOwner,
    'suppliermanager': supplierManager,
    'supplierstaff': supplierStaff,
    
    // Legados → Business unificado
    'owner': businessOwner,
    'admin': businessAdmin,
    'manager': businessManager,
    'chef': businessStaff,
    'waiter': businessStaff,
    'cashier': businessStaff,
    'employee': businessStaff,
    
    // Plataforma
    'platform_admin': platformAdmin,
    'platformadmin': platformAdmin,
    'support': platformSupport,
    'platform_support': platformSupport,
    
    // Usuário final
    'customer': customer
  };
  return roleMap[normalized] || businessStaff;
}

export function canonicalizeRoleName(role?: string | null): string | undefined {
  if (!role) return role ?? undefined;
  const map: Record<string, string> = {
    // Business roles
    owner: 'businessOwner',
    admin: 'businessAdmin',
    manager: 'businessManager',
    chef: 'businessStaff',
    waiter: 'businessStaff',
    cashier: 'businessStaff',
    employee: 'businessStaff',
    
    // Supplier roles
    supplier_owner: 'supplierOwner',
    supplier_manager: 'supplierManager',
    supplier_staff: 'supplierStaff'
  };
  const key = role.toLowerCase();
  return map[key] || role;
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
      business: ["view", "update", "manage", "delete"],
      orders: ["view", "create", "update", "cancel", "refund", "export"],
      products: ["view", "create", "update", "delete", "manage"],
      // ... outras permissões
    },
    'manager': {
      business: ["view", "update"],
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

// Novos identificadores canônicos - Business
export const BUSINESS_ROLES = {
  OWNER: 'businessOwner',
  ADMIN: 'businessAdmin', 
  MANAGER: 'businessManager',
  STAFF: 'businessStaff'
} as const;

// Novos identificadores canônicos - Supplier
export const SUPPLIER_ROLES = {
  OWNER: 'supplierOwner',
  MANAGER: 'supplierManager',
  STAFF: 'supplierStaff'
} as const;

// Alias temporário para compat (antigo código baseado em RESTAURANT_ROLES)
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

// Mapa de tipos de empresa para roles apropriadas
export const COMPANY_TYPE_ROLES = {
  DELIVERY_BUSINESS: BUSINESS_ROLES,
  SUPPLIER: SUPPLIER_ROLES
} as const;