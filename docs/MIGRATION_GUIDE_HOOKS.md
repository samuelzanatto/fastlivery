# 🔄 Guia de Migração: useUserRestaurant → useRestaurantContext

## 📋 Visão Geral

O hook antigo `useUserRestaurant` foi substituído pelo novo `useRestaurantContext` que oferece integração completa com o sistema BetterAuth Organizations.

## 🔄 Comparação de APIs

### Hook Antigo
```tsx
import { useUserRestaurant } from '@/hooks/use-user-restaurant'

const { 
  user,
  restaurant, 
  isLoading,
  error,
  refetch,
  isAuthenticated,
  hasRestaurant,
  restaurantId 
} = useUserRestaurant()
```

### Novo Hook
```tsx
import { useRestaurantContext } from '@/hooks/useRestaurantContext'

const { 
  restaurant,      // Dados da organização/restaurante atual
  members,         // Membros da organização
  userRole,        // Role do usuário atual
  loading,         // Estado de carregamento
  switchRestaurant // Função para trocar de restaurante
} = useRestaurantContext()
```

## 📝 Guia de Migração

### 1. Importações
```tsx
// ❌ Antigo
import { useUserRestaurant } from '@/hooks/use-user-restaurant'

// ✅ Novo  
import { useRestaurantContext } from '@/hooks/useRestaurantContext'
```

### 2. Dados do Usuário
```tsx
// ❌ Antigo
const { user, isAuthenticated } = useUserRestaurant()

// ✅ Novo - Use o hook de sessão do BetterAuth
import { useSession } from '@/lib/auth-client'
const { data: session, isPending } = useSession()
const user = session?.user
const isAuthenticated = !!session?.user
```

### 3. Dados do Restaurante
```tsx
// ❌ Antigo
const { restaurant, hasRestaurant, restaurantId } = useUserRestaurant()

// ✅ Novo
const { restaurant } = useRestaurantContext()
const hasRestaurant = !!restaurant
const restaurantId = restaurant?.id
```

### 4. Estados de Loading
```tsx
// ❌ Antigo
const { isLoading } = useUserRestaurant()

// ✅ Novo
const { loading } = useRestaurantContext()
```

### 5. Verificações de Permissão
```tsx
// ❌ Antigo - Não tinha sistema de permissões

// ✅ Novo - Use o hook de permissões
import { usePermissions } from '@/hooks/useRestaurantContext'
const { can } = usePermissions()

// Verificar permissões
const canManageProducts = can('write', 'products')
const canViewOrders = can('read', 'orders')
```

## 🛠️ Exemplos de Migração

### Exemplo 1: Componente de Dashboard
```tsx
// ❌ Antes
import { useUserRestaurant } from '@/hooks/use-user-restaurant'

function Dashboard() {
  const { restaurant, isLoading } = useUserRestaurant()
  
  if (isLoading) return <div>Loading...</div>
  if (!restaurant) return <div>No restaurant</div>
  
  return <h1>{restaurant.name}</h1>
}

// ✅ Depois
import { useRestaurantContext } from '@/hooks/useRestaurantContext'

function Dashboard() {
  const { restaurant, loading } = useRestaurantContext()
  
  if (loading) return <div>Loading...</div>
  if (!restaurant) return <div>No restaurant</div>
  
  return <h1>{restaurant.name}</h1>
}
```

### Exemplo 2: Verificação de Permissões
```tsx
// ❌ Antes - Sem verificação de permissão
import { useUserRestaurant } from '@/hooks/use-user-restaurant'

function ProductsPage() {
  const { restaurant } = useUserRestaurant()
  
  return (
    <div>
      <button>Add Product</button> {/* Todos podem adicionar */}
    </div>
  )
}

// ✅ Depois - Com verificação de permissão
import { useRestaurantContext, usePermissions } from '@/hooks/useRestaurantContext'

function ProductsPage() {
  const { restaurant } = useRestaurantContext()
  const { can } = usePermissions()
  
  return (
    <div>
      {can('write', 'products') && (
        <button>Add Product</button>
      )}
    </div>
  )
}
```

## 📋 Checklist de Migração

- [ ] Substituir imports do `useUserRestaurant`
- [ ] Atualizar destructuring das propriedades
- [ ] Adicionar hook `useSession` para dados do usuário
- [ ] Implementar verificações de permissão onde necessário
- [ ] Testar funcionamento completo
- [ ] Remover referências ao hook antigo

## ⚠️ Notas Importantes

1. **Dados do usuário**: Agora vêm do `useSession()` do BetterAuth
2. **Permissões**: Use `usePermissions()` para controle de acesso
3. **Multi-tenancy**: O novo sistema suporta múltiplos restaurantes
4. **Performance**: Cache automático do BetterAuth é mais eficiente

## 🐛 Problemas Comuns

### Erro: "Cannot find module use-user-restaurant"
**Solução**: Substitua pela importação do novo hook

### Restaurant undefined
**Solução**: Verifique se o usuário está autenticado e tem acesso a uma organização

### Permissões não funcionam
**Solução**: Use o hook `usePermissions()` em vez de verificações manuais