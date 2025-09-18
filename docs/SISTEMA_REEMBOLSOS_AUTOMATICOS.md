# Sistema de Reembolsos e Cancelamento Automático

## 📋 Visão Geral

Este documento descreve o sistema de reembolsos automáticos e cancelamento de pedidos por timeout implementado no ZapLivery. O sistema oferece funcionalidades profissionais e seguras para gerenciar pagamentos e garantir uma boa experiência tanto para restaurantes quanto para clientes.

## 🔧 Funcionalidades Implementadas

### 1. Cancelamento Manual com Reembolso Automático

**Local:** `/src/app/api/orders/[id]/cancel/route.ts`

**Funcionalidades:**
- ✅ Cancelamento de pedidos via dashboard administrativa
- ✅ Reembolso automático para pagamentos aprovados
- ✅ Suporte para MercadoPago (PIX e Cartão via Checkout Pro)
- ✅ Suporte para Stripe (Cartão de crédito)
- ✅ Validação de permissões (apenas owner do restaurante)
- ✅ Prevenção de cancelamento de pedidos já entregues
- ✅ Notificações em tempo real via Socket.IO
- ✅ Log detalhado de operações

**Como usar:**
1. Na dashboard de pedidos, expandir um pedido ativo
2. Clicar no botão "Cancelar"
3. Informar o motivo do cancelamento
4. Confirmar - o reembolso é processado automaticamente

### 2. Cancelamento Automático por Timeout

**Arquivos principais:**
- `/src/app/api/payments/check-timeouts/route.ts` - Verificação de timeouts
- `/src/app/api/cron/payment-timeouts/route.ts` - Endpoint para cron jobs
- `/vercel.json` - Configuração do cron no Vercel

**Funcionalidades:**
- ✅ Verificação periódica de pagamentos pendentes (a cada 5 minutos)
- ✅ Timeouts configuráveis por método de pagamento
- ✅ Verificação de status atualizado antes do cancelamento
- ✅ Cancelamento automático de sessões/preferências
- ✅ Notificações em tempo real
- ✅ Logs detalhados de operações

**Timeouts padrão:**
- PIX: 30 minutos
- Cartão de Crédito: 30 minutos
- Cartão de Débito: 30 minutos
- Stripe: 30 minutos

### 3. Interface de Usuário Aprimorada

**Local:** `/src/app/(private)/orders/page.tsx`

**Melhorias:**
- ✅ Botão de cancelamento com diálogo de confirmação
- ✅ Exibição de informações sobre reembolso
- ✅ Feedback visual sobre o status do cancelamento
- ✅ Integração com sistema de notificações

## ⚙️ Configuração

### Variáveis de Ambiente

```bash
# Chave API interna para jobs de timeout
INTERNAL_API_KEY="your-internal-api-key"

# Secret para autenticação do cron job
CRON_SECRET="your-cron-secret-key"

# Configurações de timeout (em minutos)
PAYMENT_TIMEOUT_MINUTES=30
PIX_TIMEOUT_MINUTES=30
```

### Cron Job no Vercel

```json
{
  "crons": [
    {
      "path": "/api/cron/payment-timeouts",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Configuração Externa (Alternativa)

Para usar serviços externos como cron-job.org:

**URL:** `https://seudominio.com/api/cron/payment-timeouts`
**Método:** GET
**Header:** `Authorization: Bearer seu-cron-secret`
**Frequência:** A cada 5 minutos

## 🔄 Fluxo de Funcionamento

### Cancelamento Manual

```
1. Admin clica "Cancelar" na dashboard
2. Sistema valida permissões
3. Sistema verifica se pedido pode ser cancelado
4. Se pagamento aprovado:
   - MercadoPago: Chama API de refund
   - Stripe: Cria refund via Payment Intent
5. Atualiza status do pedido para "CANCELLED"
6. Envia notificação via Socket.IO
7. Retorna resultado com informações do reembolso
```

### Cancelamento Automático

```
1. Cron job executa a cada 5 minutos
2. Busca pedidos pendentes
3. Para cada pedido:
   - Calcula se timeout expirou
   - Verifica status atualizado no gateway
   - Se ainda pendente: cancela pedido
   - Se aprovado: atualiza status
4. Emite notificações para cancelamentos
5. Registra logs de operação
```

## 🛡️ Segurança

### Validações Implementadas

- ✅ Verificação de permissões por usuário/restaurante
- ✅ Autenticação por chave API para endpoints internos
- ✅ Validação de status antes do cancelamento
- ✅ Prevenção de duplos reembolsos
- ✅ Logs de segurança para auditoria

### Headers de Segurança

```http
# Para cron jobs
Authorization: Bearer seu-cron-secret

# Para APIs internas  
x-api-key: sua-chave-interna
```

## 📊 Monitoramento

### Logs Disponíveis

```javascript
// Reembolso manual
[REFUND] Processando reembolso: { paymentId, orderNumber, amount }

// Timeout automático
[PAYMENT TIMEOUT] Pedido expirou: { orderNumber, timeoutMinutes }
[PAYMENT TIMEOUT] Verificação concluída: { checked, expired, cancelled, errors }

// Socket.IO
[SOCKET] Pedido cancelado emitido: { restaurantId, orderNumber }
```

### Métricas de Resposta

```json
{
  "success": true,
  "results": {
    "checked": 15,
    "expired": 3, 
    "cancelled": 2,
    "errors": 0
  },
  "timestamp": "2025-01-17T..."
}
```

## 🧪 Testes

### Testar Cancelamento Manual

1. Fazer um pedido de teste
2. Aprovar o pagamento 
3. Na dashboard, cancelar o pedido
4. Verificar se o reembolso foi processado
5. Confirmar notificações em tempo real

### Testar Timeout Automático

1. Fazer um pedido mas não pagar
2. Aguardar o timeout configurado
3. Executar manualmente: `GET /api/cron/payment-timeouts`
4. Verificar se o pedido foi cancelado

### Endpoints de Teste

```http
# Verificar configurações de timeout
GET /api/payments/check-timeouts

# Forçar verificação de timeout
POST /api/payments/check-timeouts
Headers: { "x-api-key": "sua-chave" }

# Cancelar pedido manualmente
POST /api/orders/{id}/cancel
Body: { "reason": "Teste de cancelamento" }
```

## 🚀 Deploy

### Checklist de Deploy

- [ ] Configurar variáveis de ambiente no Vercel
- [ ] Ativar cron jobs no Vercel Pro
- [ ] Configurar webhooks do MercadoPago
- [ ] Testar endpoints em produção
- [ ] Monitorar logs inicial

### Variáveis Obrigatórias

```bash
INTERNAL_API_KEY="chave-forte-aqui"
CRON_SECRET="outro-secret-aqui"
PAYMENT_TIMEOUT_MINUTES=30
PIX_TIMEOUT_MINUTES=30
```

## 🔍 Troubleshooting

### Problemas Comuns

**1. Reembolso não processado**
- Verificar credenciais do gateway
- Checar logs de erro no console
- Confirmar saldo disponível na conta

**2. Cron job não executando**
- Verificar se está no plano Vercel Pro
- Confirmar configuração em vercel.json
- Testar endpoint manualmente

**3. Timeout muito curto/longo**
- Ajustar variáveis PAYMENT_TIMEOUT_MINUTES
- Considerar método de pagamento (PIX vs Cartão)
- Balancear experiência do usuário vs conversão

## 📈 Próximos Passos

### Melhorias Futuras

- [ ] Dashboard de reembolsos para análise
- [ ] Notificações por email para clientes
- [ ] Reembolsos parciais manuais
- [ ] Integração com mais gateways
- [ ] Métricas de abandono de carrinho
- [ ] Retry automático para reembolsos falhados

### Monitoramento Avançado

- [ ] Alertas para alta taxa de timeouts
- [ ] Dashboard de métricas de pagamento
- [ ] Integração com ferramentas de APM
- [ ] Relatórios de performance de gateways

## 📞 Suporte

Em caso de problemas:

1. Verificar logs do sistema
2. Testar endpoints manualmente
3. Conferir configurações de ambiente
4. Validar status no gateway de pagamento

---

**Status:** ✅ Implementado e funcional
**Última atualização:** Janeiro 2025
**Versão:** 1.0.0