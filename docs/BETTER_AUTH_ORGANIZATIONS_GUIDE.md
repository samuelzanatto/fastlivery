# Guia do Sistema de Organizações BetterAuth

## 📋 Visão Geral

Este documento descreve a nova implementação do sistema de organizações usando os plugins Admin e Organization do BetterAuth v1.3.9, substituindo o sistema manual anterior por uma solução mais robusta e automatizada.

## 🏗️ Arquitetura do Sistema

### Plugins Implementados

1. **Admin Plugin** - Sistema de controle de acesso baseado em roles (RBAC)
2. **Organization Plugin** - Multi-tenancy com isolamento de dados por organização

### Sistema de Roles e Permissões

#### Roles de Restaurante
- `OWNER` - Proprietário (acesso total)
- `MANAGER` - Gerente (gerenciamento operacional)
- `CHEF` - Chef (gerenciamento de cardápio e cozinha)
- `WAITER` - Garçom (atendimento e pedidos)
- `CASHIER` - Caixa (financeiro e pedidos)
- `EMPLOYEE` - Funcionário (permissões básicas)

#### Roles de Plataforma
- `PLATFORM_ADMIN` - Administrador da plataforma
- `PLATFORM_SUPPORT` - Suporte técnico

### Recursos com Controle de Acesso
- `restaurant` - Configurações do restaurante
- `orders` - Pedidos e vendas
- `products` - Cardápio e produtos
- `employees` - Funcionários e roles
- `analytics` - Relatórios e métricas
- `billing` - Faturamento e assinaturas
- `payments` - Pagamentos e configurações financeiras
- `tables` - Mesas e reservas
- `promotions` - Promoções e cupons
- `settings` - Configurações gerais

## 🔧 Arquivos Principais

### `/src/lib/auth-permissions.ts`
- Sistema completo de RBAC
- Definições de roles e permissões
- Utilitários para verificação de acesso

### `/src/lib/auth.ts`
- Configuração principal do BetterAuth
- Plugins admin() e organization()
- Integração com Stripe mantida

### `/src/lib/auth-client.ts`
- Cliente de autenticação
- Plugins adminClient() e organizationClient()

### `/src/hooks/useRestaurantContext.tsx`
- Hook principal para contexto do restaurante
- Hooks auxiliares para permissões
- Integração com sistema de organizações

### `/scripts/migrate-to-organizations.ts`
- Script de migração de dados
- Conversão Restaurant → Organization
- Conversão EmployeeProfile → Member

## 🚀 Como Usar

### Comandos de Migração

```bash
# Verificar status atual
npm run migrate:orgs status

# Executar migração
npm run migrate:orgs migrate

# Reverter migração (use com cuidado!)
npm run migrate:orgs rollback

# Mostrar ajuda
npm run migrate:orgs --help
```

### Verificação de Permissões

```tsx
import { usePermissions } from '@/hooks/useRestaurantContext';

function ComponenteProtegido() {
  const { can } = usePermissions();
  
  if (!can('read', 'orders')) {
    return <div>Acesso negado</div>;
  }
  
  return (
    <div>
      {can('write', 'orders') && (
        <button>Criar Pedido</button>
      )}
    </div>
  );
}
```

### Contexto do Restaurante

```tsx
import { useRestaurantContext } from '@/hooks/useRestaurantContext';

function RestaurantDashboard() {
  const { 
    restaurant, 
    members, 
    userRole, 
    loading,
    switchRestaurant 
  } = useRestaurantContext();
  
  if (loading) return <div>Carregando...</div>;
  
  return (
    <div>
      <h1>{restaurant?.name}</h1>
      <p>Seu role: {userRole}</p>
      <p>Membros: {members.length}</p>
    </div>
  );
}
```

### Admin da Plataforma

```tsx
import { usePlatformAdmin } from '@/hooks/useRestaurantContext';

function AdminPanel() {
  const { 
    isPlatformAdmin, 
    allOrganizations, 
    impersonateUser 
  } = usePlatformAdmin();
  
  if (!isPlatformAdmin) return <div>Acesso negado</div>;
  
  return (
    <div>
      <h2>Painel Administrativo</h2>
      {allOrganizations.map(org => (
        <div key={org.id}>
          <h3>{org.name}</h3>
          <button onClick={() => impersonateUser(org.ownerId)}>
            Impersonar Owner
          </button>
        </div>
      ))}
    </div>
  );
}
```

## 🔄 Processo de Migração

### Fase 1: Preparação
1. ✅ Instalar dependências do BetterAuth
2. ✅ Criar sistema de permissões
3. ✅ Configurar plugins de autenticação
4. ✅ Implementar hooks React

### Fase 2: Migração de Dados
1. 🔄 Executar script de migração
2. 🔄 Converter restaurantes em organizações
3. 🔄 Migrar funcionários para membros
4. 🔄 Validar integridade dos dados

### Fase 3: Atualização da UI
1. ⏳ Atualizar componentes para usar hooks
2. ⏳ Implementar verificações de permissão
3. ⏳ Testar fluxos de usuário
4. ⏳ Documentar mudanças para usuários

### Fase 4: Deploy e Monitoramento
1. ⏳ Deploy em ambiente de teste
2. ⏳ Testes de integração
3. ⏳ Deploy em produção
4. ⏳ Monitoramento e ajustes

## 🔒 Segurança

### Isolamento de Dados
- Cada organização tem dados completamente isolados
- Membros só podem acessar dados de suas organizações
- Admins da plataforma têm acesso cross-organization

### Controle de Acesso
- Verificações de permissão em todos os endpoints
- Middleware de autenticação obrigatório
- Logs de auditoria para ações sensíveis

### Migração Segura
- Backup automático antes da migração
- Verificações de integridade
- Rollback disponível

## 📊 Benefícios

### Para Desenvolvedores
- ✅ Sistema RBAC padronizado
- ✅ Multi-tenancy nativo
- ✅ Hooks React prontos
- ✅ TypeScript com type safety
- ✅ Menos código boilerplate

### Para o Negócio
- ✅ Gestão de roles automatizada
- ✅ Onboarding mais rápido
- ✅ Maior segurança
- ✅ Auditoria completa
- ✅ Escalabilidade aprimorada

### Para Usuários
- ✅ Interface mais intuitiva
- ✅ Permissões claras
- ✅ Experiência consistente
- ✅ Performance melhorada

## 🐛 Troubleshooting

### Erro de Migração
```bash
# Verificar logs
npm run migrate:orgs status

# Rollback se necessário
npm run migrate:orgs rollback
```

### Problemas de Permissão
```tsx
// Debug de permissões
const { can, abilities } = usePermissions();
console.log('Abilities:', abilities);
console.log('Can read orders:', can('read', 'orders'));
```

### Issues Conhecidos
1. Migração pode demorar com muitos dados
2. Roles customizados precisam mapeamento manual
3. BetterAuth só suporta owner/admin/member nativamente

## 📝 Próximos Passos

1. **Executar Migração**: Use `npm run migrate:orgs migrate`
2. **Testar Sistema**: Verifique se tudo funciona corretamente
3. **Atualizar Components**: Migre componentes para usar novos hooks
4. **Deploy**: Publique as mudanças

---

**Desenvolvido por**: Sistema de Migração ZapLivery  
**Data**: Janeiro 2025  
**Versão**: 1.0.0