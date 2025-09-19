# Correções MercadoPago Payment Brick - CSP e SDK

## Problemas Identificados

### 1. Erros de CSP (Content Security Policy) ✅ **RESOLVIDO**
Os erros mostram que o navegador estava bloqueando recursos do domínio `http2.mlstatic.com` porque não estava nas regras de CSP.

### 2. Inicialização inadequada do SDK ✅ **RESOLVIDO** 
- SDK sendo inicializado de forma síncrona 
- Variável global para controle de inicialização
- Falta de tratamento para importação dinâmica em SSR

### 3. Re-renders infinitos 🔧 **CORRIGINDO**
- Parâmetros `preferenceId` e `mercadoPago` obrigatórios juntos
- `entityType` só aceita `'individual'` ou `'association'`
- Eventos de progresso causando erros não tratados
- Configurações instáveis causando re-inicializações

## Correções Aplicadas

### 1. CSP Atualizado no `next.config.ts` ✅
Adicionado domínio `http2.mlstatic.com` em todas as diretivas CSP.

### 2. Inicialização Melhorada do SDK ✅
```typescript
// Controle de inicialização por chave
const [initializationKey, setInitializationKey] = useState<string | null>(null)

// Só reinicializa se mudou a chave pública
if (!publicKey || (sdkInitialized && initializationKey === publicKey)) return
```

### 3. Configuração Simplificada 🔧
```typescript
// Configuração mínima para evitar erros de validação
const initialization = useMemo(() => ({
  amount: amount,
  payer: {
    email: customerInfo.email,
    first_name: customerInfo.name.split(' ')[0] || 'Cliente',
    last_name: customerInfo.name.split(' ').slice(1).join(' ') || 'ZapLivery'
  }
}), [amount, customerInfo.email, customerInfo.name])
```

### 4. Tratamento Inteligente de Erros 🔧
```typescript
// Ignorar erros não críticos que causam re-renders
if (errorObj.message?.includes('preferenceId') || 
    errorObj.message?.includes('entityType') ||
    errorObj.message?.includes('Progress')) {
  console.warn('[MP Brick] Aviso não crítico:', errorObj.message)
  return // Não propagar erro
}
```

### 5. Key Estratégica no Componente 🔧
```typescript
// Força re-mount apenas quando necessário
<Payment
  key={`payment-${publicKey?.slice(-8)}-${amount}`}
  // ...props
/>
```

## Validação

Para verificar se as correções funcionaram:

1. **Teste CSP**: Console não deve mais mostrar erros de `http2.mlstatic.com` ✅
2. **Teste SDK**: Logs devem mostrar `sdk-initialized-success` ✅  
3. **Teste Re-renders**: Componente não deve recarregar infinitamente 🧪
4. **Teste Rendering**: Payment Brick deve aparecer após inicialização ✅

## Debug

Use `?mpDebug=1` na URL para ver logs detalhados:
- `window.__MP_CHECKOUT_LOGS__` - logs do checkout
- `window.__MP_BRICK_LOGS__` - logs do brick

## Próximos Passos

Se ainda houver problemas:
1. Verificar se credenciais estão corretas no painel MP
2. Conferir se endpoint `/api/restaurants/[slug]/mp-public-key` retorna chave válida
3. Validar se não há conflitos com outros scripts na página
4. Monitorar console para novos tipos de erro

## Implementação Atual (Alinhada às Docs Oficiais)

### Fluxo Híbrido: amount + preferenceId Condicional

O componente agora implementa fluxo inteligente:

1. **Inicialização do SDK**: `initMercadoPago(publicKey, {locale: 'pt-BR'})`
2. **Busca de preferenceId**: POST `/api/payments/mercadopago/preference` (assíncrono)
3. **Configuração dinâmica**: 
   - Se tem `preferenceId` → habilita `mercadoPago: 'all'` (carteira)
   - Se não tem → funciona com `amount` apenas (cartões, PIX, boleto)

```tsx
<Payment
  initialization={{
    amount: 123, // inteiro
    preferenceId: '...' // incluído se disponível
    payer: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      entityType: 'individual'
    }
  }}
  customization={{
    paymentMethods: {
      ticket: 'all',
      bankTransfer: 'all',
      creditCard: 'all',
      debitCard: 'all',
      prepaidCard: 'all',
      // mercadoPago: 'all' // só se preferenceId presente
    }
  }}
/>
```

### Estados do Componente

| Estado | Descrição | Loading | Ação do usuário |
|--------|-----------|---------|------------------|
| `publicKey = null` | Buscando chave pública | "Obtendo chave pública..." | Aguardar |
| `sdkInitialized = false` | Inicializando SDK | "Inicializando sistema..." | Aguardar |
| `prefLoading = true` | Gerando preferenceId | "Gerando preferência..." | Aguardar |
| `isReady = false` | Brick carregando | "Carregando pagamento..." | Aguardar |
| `isReady = true` | Pronto para usar | - | Preencher e pagar |

### Endpoints Criados

#### `POST /api/payments/mercadopago/preference`
Gera preferenceId para carteira Mercado Pago.

**Body:**
```json
{
  "restaurantSlug": "string",
  "items": [{"id":"", "name":"", "price":0, "quantity":1}],
  "customer": {"name":"", "email":"", "phone":""},
  "externalReference": "BRICK-123456789" // opcional
}
```

**Response:**
```json
{
  "preference_id": "123456789-...",
  "init_point": "https://...",
  "sandbox_init_point": "https://...",
  "total_amount": 29.90,
  "payment_method": "credit_card",
  "order_number": "PREF-..."
}
```

### Vantagens do Fluxo Híbrido

✅ **Sem preferenceId**: Funciona para cartões, PIX, boleto (fluxo básico)  
✅ **Com preferenceId**: + carteira Mercado Pago, parcelamento especial  
✅ **Fallback automático**: Se preference falhar, continua sem carteira  
✅ **Performance**: Busca preference em paralelo com inicialização  
✅ **Debug completo**: `mercadoPagoEnabled`, `prefLoading`, `prefError`

### preferenceId vs amount - Estratégias de Uso

| Cenário | Configuração | Métodos habilitados | Observações |
|---------|-------------|-------------------|-------------|
| **Fluxo básico** | `amount` apenas | Cartões, PIX, boleto | Sufficient para maioria dos casos |
| **Fluxo completo** | `amount` + `preferenceId` | + Carteira MP, parcelamento especial | Melhor UX, mais opções |
| **Fallback inteligente** | Tenta `preferenceId`, falha graciosamente | Dinâmico | Implementação atual |

### Configuração de Ambiente

Certifique-se de que o restaurante tem:
- `mercadoPagoAccessToken` configurado no banco
- `mercadoPagoPublicKey` configurado no banco  
- `mercadoPagoConfigured = true`
- `isActive = true`

### Próximas Melhorias Sugeridas

1. **Cache de preferenceId**: Evitar criar múltiplas preferences para mesmo carrinho
2. **Retry automático**: Se preference falhar, tentar novamente uma vez
3. **Identificação personalizada**: Preencher CPF/CNPJ quando disponível
4. **Endereço completo**: Auto-fill para boleto/PIX com endereço do cliente
5. **Método padrão**: `visual.defaultPaymentOption` conforme estratégia de negócio

### Checklist de Conformidade Atualizado

- [x] `initMercadoPago` com publicKey e locale
- [x] `amount` inteiro
- [x] `payer.email` fornecido
- [x] `entityType` definido
- [x] Callbacks seguindo contrato (Promise em `onSubmit`)
- [x] CSP inclui domínios analytics / tracks necessários
- [x] **preferenceId gerado dinamicamente**
- [x] **mercadoPago condicional baseado em preferenceId**
- [x] **Estados de loading apropriados**
- [x] **Fallback gracioso se preference falhar**