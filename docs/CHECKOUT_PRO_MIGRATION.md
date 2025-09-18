# Migração para Checkout Pro - Mercado Pago

## Resumo das Alterações

Este documento resume as mudanças implementadas para migrar do checkout transparente (PIX direto) para o Checkout Pro do Mercado Pago.

## Principais Benefícios

✅ **Sem problemas de sandbox**: Checkout Pro não exige criação manual de usuários de teste
✅ **Fluxo unificado**: PIX e cartão usam a mesma API (preferences)  
✅ **Menos complexidade**: Sem necessidade de lidar com QR codes inline
✅ **Melhor UX**: Interface oficial do Mercado Pago, mais confiável
✅ **Webhooks simplificados**: Menos tipos de notificação para tratar

## Alterações Implementadas

### 1. Service Layer (`src/lib/mercadopago.ts`)

**Removido:**
- `createPixPayment()` - método problemático do checkout transparente
- `getPayment()` - não mais necessário
- Lógica complexa de retry adaptativo para PIX
- Tratamento de erros específicos do sandbox (2034, 4390)

**Adicionado:**
- `createPaymentPreference()` - método unificado para PIX e cartão
- `getPreference()` - buscar detalhes da preferência
- Configuração inteligente de métodos de pagamento baseado na escolha
- Gestão de URLs de retorno (success, failure, pending)

**Mantido:**
- `validateMercadoPagoCredentials()` - atualizado para usar preferences
- `createMercadoPagoService()` - factory function
- Detecção automática de modo teste vs produção

### 2. API de Checkout (`src/app/api/checkout-mercadopago/route.ts`)

**Alterações:**
- Unificou fluxo PIX e cartão em uma única preferência
- Retorna `init_point` para redirect ao invés de QR code
- Armazena `preference_id` no campo `stripeSessionId` (reutilização)
- Response unificada com tipo `checkout_pro`

### 3. Webhook Handler (`src/app/api/webhooks/mercadopago/route.ts`)

**Melhorias:**
- Suporte a notificações `merchant_order` e `payment`
- Tratamento específico para Checkout Pro
- Busca de pedidos por `external_reference` 
- Uso direto das classes SDK (`MerchantOrder`, `Payment`)
- Melhor tipagem TypeScript

### 4. Páginas de Retorno

**Criadas/Atualizadas:**
- `/checkout/success` - página de sucesso com detalhes do pedido
- `/checkout/failure` - página de falha com opções de retry
- `/checkout/pending` - página de aguardo com timer
- `/api/orders/by-number/[orderNumber]` - API para buscar pedidos

### 5. Fluxo de Pagamento

**Antes (Transparente):**
1. Cliente escolhe PIX → API cria payment direto
2. QR code mostrado inline na página
3. Webhook recebe notification de `payment`
4. Cliente fica na mesma página aguardando

**Agora (Checkout Pro):**
1. Cliente escolhe PIX/Cartão → API cria preference
2. Cliente é redirecionado para `init_point` (página do MP)
3. Pagamento processado na interface oficial do MP
4. Cliente retorna via `back_urls` com status
5. Webhook recebe `merchant_order` ou `payment`

## Configuração Necessária

### Variáveis de Ambiente
```env
# Mercado Pago (as mesmas existentes)
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-xxx ou PROD-xxx  
MERCADOPAGO_ACCESS_TOKEN=TEST-xxx ou APP_USR-xxx

# URL para webhooks e retornos
NEXTAUTH_URL=https://seudominio.com ou http://localhost:3000
```

### URLs de Retorno Configuradas

O sistema automaticamente configura:
- **Success**: `/checkout/success?order={orderNumber}`
- **Failure**: `/checkout/failure?order={orderNumber}` 
- **Pending**: `/checkout/pending?order={orderNumber}`

### Webhook URL

Deve estar configurado no painel do Mercado Pago:
```
https://seudominio.com/api/webhooks/mercadopago
```

## Como Testar

### 1. Configurar Credenciais de Teste
- Criar aplicação no painel do Mercado Pago
- Configurar credenciais TEST na interface do restaurante
- Não é necessário criar usuários de teste (vantagem do Checkout Pro)

### 2. Testar Fluxo PIX
1. Escolher PIX no checkout
2. Será redirecionado para página do Mercado Pago
3. Simular pagamento PIX no ambiente de teste
4. Retornar via back_url com status

### 3. Testar Fluxo Cartão
1. Escolher Cartão no checkout  
2. Será redirecionado para página do Mercado Pago
3. Usar cartões de teste: `4111111111111111` (aprovado)
4. Retornar via back_url com status

### 4. Testar Webhooks
- Usar ngrok para localhost: `ngrok http 3000`
- Configurar URL do webhook no painel MP
- Verificar logs do servidor durante pagamentos

## Vantagens da Migração

1. **Estabilidade**: Checkout Pro é mais maduro e estável
2. **Menos código**: Remove lógica complexa de retry e tratamento de erros
3. **Melhor UX**: Interface nativa do MP, mais familiar aos usuários
4. **Manutenção**: Menos pontos de falha para manter
5. **Compliance**: Segurança gerenciada pelo Mercado Pago

## Compatibilidade

✅ Mantém mesma estrutura de pedidos no banco  
✅ Reutiliza campo `stripeSessionId` para `preference_id`  
✅ Webhooks continuam atualizando status corretamente  
✅ Socket.IO continua funcionando para notificações em tempo real  
✅ Interface do restaurante não precisa ser alterada

## Status da Implementação

🟢 **Concluída** - Sistema migrado com sucesso para Checkout Pro
🟢 **Testável** - Pronto para testes com credenciais TEST  
🟢 **Produção** - Pode ser usado em produção com credenciais reais

---

**Data da Migração**: 15 de setembro de 2025  
**Versão**: Sistema Zaplivery - Checkout Pro v1.0
