# Sistema de Assinaturas e Limites - ZapLivery

## Visão Geral

O ZapLivery implementa um sistema completo de assinaturas com controle de uso e limites baseados em planos. O sistema é integrado com o Stripe para pagamentos e inclui funcionalidades de tracking de uso mensal, verificação de limites em tempo real e upgrade automático de planos.

## Planos Disponíveis

### Starter - R$ 49/mês
- ✅ Até 100 pedidos por mês
- ✅ Até 50 produtos
- ✅ Até 5 mesas
- ✅ Até 2 usuários
- ❌ Analytics avançado
- ❌ Suporte prioritário
- ❌ Marca personalizada

### Pro - R$ 97/mês
- ✅ Pedidos ilimitados
- ✅ Até 200 produtos
- ✅ Até 20 mesas
- ✅ Até 5 usuários
- ✅ Analytics avançado
- ❌ Suporte prioritário
- ❌ Marca personalizada

### Enterprise - R$ 197/mês
- ✅ Tudo ilimitado
- ✅ Analytics avançado
- ✅ Suporte prioritário
- ✅ Marca personalizada

## Arquitetura do Sistema

### Modelos de Banco de Dados

#### Subscription
Armazena informações da assinatura do restaurante:
- Plano atual e limites
- Integração com Stripe
- Status da assinatura
- Períodos de cobrança

#### UsageStats
Controla o uso mensal por categoria:
- Contadores por mês/ano
- Reset automático mensal
- Histórico de uso

### Serviços

#### SubscriptionService
Gerencia todas as operações de assinatura:
```typescript
// Verificar se pode criar novo item
await SubscriptionService.canCreate(restaurantId, 'product')

// Incrementar uso após criação
await SubscriptionService.incrementUsage(restaurantId, 'product')

// Obter overview completo
const overview = await SubscriptionService.getUsageOverview(restaurantId)
```

#### LimitMiddleware
Middleware para verificação automática de limites:
```typescript
import { checkLimit, incrementUsageAfterCreate } from '@/lib/limit-middleware'

// Em uma API de criação
await checkLimit(restaurantId, 'product')
// ... criar produto
await incrementUsageAfterCreate(restaurantId, 'product')
```

### Hooks React

#### useSubscriptionLimits
Hook personalizado para uso no frontend:
```typescript
const { 
  canCreate, 
  getUsagePercentage, 
  tryCreate, 
  hasFeature 
} = useSubscriptionLimits()

// Verificar se pode criar
if (!canCreate('product')) {
  // Mostrar aviso de limite
}

// Tentar criar com tratamento automático
const result = await tryCreate('product', createProductFn)
```

### Componentes

#### BillingDialog
Modal completo com:
- Estatísticas de uso atual
- Recursos do plano
- Opções de upgrade
- Informações de cobrança

#### LimitReachedAlert/Card
Alertas visuais quando limites são atingidos com opções de upgrade.

#### SubscriptionDemo
Componente de demonstração do sistema completo.

## APIs Disponíveis

### GET /api/subscription/usage
Retorna overview completo do uso e limites:
```json
{
  "planId": "pro",
  "limits": {
    "orders": -1,
    "products": 200,
    "tables": 20,
    "users": 5
  },
  "usage": {
    "orders": 45,
    "products": 120,
    "tables": 8,
    "users": 3
  },
  "features": {
    "hasAdvancedAnalytics": true,
    "hasPrioritySupport": false,
    "hasCustomBranding": false
  }
}
```

### POST /api/subscription/upgrade
Realiza upgrade de plano:
```json
{
  "planId": "enterprise"
}
```

### POST /api/cron/reset-usage
Reset mensal de contadores (chamado via cron job):
```bash
curl -X POST https://app.com/api/cron/reset-usage \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Implementação em APIs

### Exemplo: API de Produtos
```typescript
import { checkLimit, incrementUsageAfterCreate, LimitError } from '@/lib/limit-middleware'

export async function POST(request: NextRequest) {
  try {
    const restaurantId = getRestaurantId() // da sessão
    
    // Verificar limite
    await checkLimit(restaurantId, 'product')
    
    // Criar produto
    const product = await prisma.product.create({...})
    
    // Incrementar contador
    await incrementUsageAfterCreate(restaurantId, 'product')
    
    return NextResponse.json(product)
  } catch (error) {
    if (error instanceof LimitError) {
      return NextResponse.json({
        error: error.message,
        limitType: error.limitType,
        needsUpgrade: true
      }, { status: 403 })
    }
    // Outros erros...
  }
}
```

## Fluxo de Upgrade

1. **Frontend**: Usuário clica em "Upgrade"
2. **API**: Verifica plano atual e cria sessão Stripe ou atualiza assinatura
3. **Stripe**: Processa pagamento
4. **Webhook**: Confirma pagamento e atualiza limites no banco
5. **Frontend**: Atualiza interface com novos limites

## Reset Mensal

Configure um cron job para chamar `/api/cron/reset-usage` todo dia 1º do mês:
```bash
0 0 1 * * curl -X POST https://app.com/api/cron/reset-usage -H "Authorization: Bearer $CRON_SECRET"
```

## Variáveis de Ambiente

```bash
# Stripe Price IDs (criar no dashboard Stripe)
STRIPE_STARTER_PRICE_ID="price_starter_..."
STRIPE_PRO_PRICE_ID="price_pro_..."
STRIPE_ENTERPRISE_PRICE_ID="price_enterprise_..."

# Cron job secret
CRON_SECRET="your-cron-secret-key"
```

## Monitoramento e Analytics

O sistema registra:
- Uso mensal por categoria
- Tentativas de criação bloqueadas por limite
- Upgrades realizados
- Padrões de uso por plano

## Tratamento de Erros

### Frontend
- Verificação proativa de limites
- Alertas visuais quando próximo do limite
- Mensagens claras sobre necessidade de upgrade

### Backend
- LimitError customizado para limites atingidos
- Logs detalhados de uso
- Fallbacks para falhas de tracking

## Testando o Sistema

1. Use o componente `SubscriptionDemo` para testar funcionalidades
2. Simule diferentes cenários de uso
3. Teste fluxo completo de upgrade
4. Verifique reset mensal em ambiente de desenvolvimento

## Próximos Passos

- [ ] Integração com sistema de notificações
- [ ] Dashboard de analytics para administradores
- [ ] Relatórios de uso detalhados
- [ ] Sistema de alertas proativos
- [ ] API para parceiros
