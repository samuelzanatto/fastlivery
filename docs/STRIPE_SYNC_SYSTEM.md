# Sistema de Sincronização de Preços do Stripe

Este documento detalha como configurar e usar o sistema profissional de sincronização de preços do Stripe.

## 🏗️ Arquitetura do Sistema

### 1. **Sincronização em Tempo Real (Webhooks)**
- Webhooks do Stripe notificam automaticamente sobre mudanças
- Eventos processados: `product.created`, `product.updated`, `product.deleted`, `price.created`, `price.updated`, `price.deleted`
- Endpoint: `/api/webhooks/stripe`

### 2. **Sincronização Manual**
- API para forçar sincronização completa
- Endpoint: `/api/stripe/sync`
- Métodos: `POST` com `{ "type": "full" | "products" | "prices" }`

### 3. **Sincronização Automática (Cron)**
- Job automático para sincronização periódica
- Endpoint: `/api/cron/stripe-sync`
- Executado a cada X horas/dias conforme configurado

### 4. **Cache Local Inteligente**
- Dados armazenados no PostgreSQL via Prisma
- Tabelas: `StripeProduct` e `StripePrice`
- Fallback automático para dados estáticos em caso de falha

## ⚙️ Configuração

### 1. **Variáveis de Ambiente**

Adicione ao seu `.env`:

```bash
# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Cron Security
CRON_SECRET="seu-token-secreto-para-cron"

# Stripe Price IDs (fallback)
STRIPE_STARTER_PRICE_ID="price_starter_..."
STRIPE_PRO_PRICE_ID="price_pro_..."
STRIPE_ENTERPRISE_PRICE_ID="price_enterprise_..."
```

### 2. **Configuração dos Webhooks no Stripe**

1. Vá para o Dashboard do Stripe
2. Navegue para **Developers** > **Webhooks**
3. Clique em **Add endpoint**
4. URL: `https://seu-dominio.com/api/webhooks/stripe`
5. Selecione os eventos:
   - `product.created`
   - `product.updated` 
   - `product.deleted`
   - `price.created`
   - `price.updated`
   - `price.deleted`
6. Copie o **Signing secret** para `STRIPE_WEBHOOK_SECRET`

### 3. **Configuração dos Produtos no Stripe**

Para melhor organização, adicione metadata aos seus produtos:

```javascript
// Exemplo ao criar produto no Stripe
await stripe.products.create({
  name: 'ZapLivery Starter',
  description: 'Plano básico para pequenos restaurantes',
  metadata: {
    planKey: 'starter', // Chave para identificar o plano
    category: 'subscription'
  }
})
```

### 4. **Configuração do Cron Job**

#### Vercel (Recomendado)
Crie `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/stripe-sync",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

#### GitHub Actions
Crie `.github/workflows/stripe-sync.yml`:

```yaml
name: Stripe Sync
on:
  schedule:
    - cron: '0 */6 * * *' # A cada 6 horas
  workflow_dispatch: # Permite execução manual

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Call Stripe Sync API
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/stripe-sync" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## 🚀 Como Usar

### 1. **Inicialização (Primeira Vez)**

```bash
# Executar migration
npx prisma migrate dev

# Sincronizar dados iniciais
curl -X POST "http://localhost:3000/api/stripe/sync" \
  -H "Content-Type: application/json" \
  -d '{"type": "full"}'
```

### 2. **No Código da Aplicação**

```tsx
import { DynamicPricingPlans } from '@/components/dynamic-pricing-plans'

function PricingPage() {
  const handlePlanSelect = (planId: string, priceId: string) => {
    // Redirecionar para checkout do Stripe
    window.location.href = `/checkout?plan=${planId}&price=${priceId}`
  }

  return (
    <DynamicPricingPlans 
      onPlanSelect={handlePlanSelect}
      selectedPlanId="starter"
    />
  )
}
```

### 3. **Forçar Atualização Manual**

```javascript
// No componente
const refreshPlans = async () => {
  await fetch('/api/stripe/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'full' })
  })
}
```

## 🛡️ Segurança

### 1. **Validação de Webhooks**
- Assinatura verificada usando `stripe.webhooks.constructEvent`
- Rejeita requests inválidos

### 2. **Autenticação de APIs**
- APIs de sincronização manual requerem autenticação
- Cron jobs protegidos por token secreto

### 3. **Fallback Robusto**
- Se Stripe falhar, usa dados locais
- Se dados locais falharem, usa configuração estática

## 📊 Monitoramento

### Logs Estruturados
```
🔄 Sincronizando produtos do Stripe...
✅ Sincronizados 3 produtos
🔄 Sincronizando preços do Stripe...  
✅ Sincronizados 9 preços
🔔 Webhook recebido: price.updated
✅ Preço sincronizado: price_abc123
```

### Métricas Importantes
- Frequência de sincronização
- Tempo de resposta das APIs
- Taxa de erro dos webhooks
- Diferenças entre dados Stripe vs local

## 🔄 Fluxo Completo

1. **Mudança no Stripe** → Webhook enviado
2. **Webhook recebido** → Dados sincronizados automaticamente  
3. **Usuário acessa página** → Dados atualizados exibidos
4. **Fallback** → Em caso de erro, dados locais/estáticos são usados
5. **Cron job** → Sincronização periódica garante consistência

## 🎯 Benefícios

✅ **Sempre Atualizado**: Preços refletem mudanças em tempo real
✅ **Performance**: Cache local evita chamadas desnecessárias à API
✅ **Confiabilidade**: Múltiplas camadas de fallback
✅ **Segurança**: Webhooks validados e APIs protegidas  
✅ **Escalabilidade**: Sistema profissional usado por grandes empresas
✅ **Manutenibilidade**: Logs detalhados e monitoramento

Este sistema garante que seus preços estejam sempre sincronizados com o Stripe, seguindo as melhores práticas da indústria! 🚀
