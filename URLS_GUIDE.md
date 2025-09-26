# 🔗 Guia de URLs - FastLivery

## 📋 **Visão Geral**

Este documento explica como o sistema de URLs está configurado para evitar hardcoding e garantir flexibilidade entre ambientes.

## 🎯 **Estratégia de URLs**

### **1. Variáveis de Ambiente Principais**

| Variável | Ambiente | Descrição | Exemplo |
|----------|----------|-----------|---------|
| `NEXT_PUBLIC_APP_URL` | Todas | URL principal da aplicação | `https://fastlivery.com` |
| `NGROK_URL` | Dev | URL do túnel ngrok | `https://abc123.ngrok.io` |

### **2. Ordem de Prioridade**

#### **Produção:**
1. `NEXT_PUBLIC_APP_URL` (obrigatória)
2. ❌ **Erro se não configurada**

#### **Desenvolvimento:**
1. `NGROK_URL` (para webhooks)
2. `NEXT_PUBLIC_APP_URL` 
3. `http://localhost:3000` (último recurso)

## 🛠️ **Como Usar**

### **1. Helper Principal**

```typescript
import { getAppUrl } from '@/lib/utils/urls'

// Obter URL base da aplicação
const baseUrl = getAppUrl()

// Construir URL completa
const fullUrl = buildAppUrl('/dashboard')
```

### **2. Callbacks do Stripe**

```typescript
import { getStripeCallbackUrls } from '@/lib/utils/urls'

const callbacks = getStripeCallbackUrls('subscription')
// { 
//   success_url: "https://app.com/dashboard?upgrade=success",
//   cancel_url: "https://app.com/dashboard?upgrade=cancelled" 
// }
```

### **3. CORS Origins**

```typescript
import { getAllowedOrigins } from '@/lib/utils/urls'

const allowedOrigins = getAllowedOrigins()
// ['https://app.com', 'https://sdk.mercadopago.com', ...]
```

## 🚫 **O Que NÃO Fazer**

### ❌ **URLs Hardcoded**
```typescript
// ERRADO
const url = 'http://localhost:3000/api/callback'
const callback = 'https://myapp.vercel.app/success'
```

### ✅ **URLs Dinâmicas**
```typescript
// CORRETO
import { buildAppUrl } from '@/lib/utils/urls'
const url = buildAppUrl('/api/callback')
const callback = buildAppUrl('/success')
```

## 🔧 **Configuração por Ambiente**

### **Desenvolvimento Local**
```env
# .env.local
NGROK_URL=https://your-ngrok-url.ngrok.io
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### **Staging/Preview**
```env
# Vercel Environment Variables
NEXT_PUBLIC_APP_URL=https://fastlivery-git-feature.vercel.app
```

### 2. Configure Variáveis de Ambiente

No arquivo `.env`:
```
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

**Nota:** Apenas `NEXT_PUBLIC_APP_URL` é necessário. O projeto usa Better Auth (não NextAuth), então não há necessidade da variável `NEXTAUTH_URL`.

## 📱 **URLs Importantes**

### **Webhooks**
- Stripe: `{APP_URL}/api/auth/stripe/webhook`
- MercadoPago: `{APP_URL}/api/webhooks/mercadopago`

### **Callbacks**
- Stripe Success: `{APP_URL}/dashboard?upgrade=success`
- Stripe Cancel: `{APP_URL}/dashboard?upgrade=cancelled`
- MercadoPago: `{APP_URL}/checkout/{status}?order={id}`

### **Auth Callbacks**
- Google: `{APP_URL}/api/auth/callback/google`
- Email Verification: `{APP_URL}/verify-email?token={token}`

## 🧪 **Testes**

### **Validar URLs**
```bash
# Verificar URLs hardcoded
npm run check:urls

# Validar configurações
npm run validate:deploy
```

### **Testar Webhooks**
```bash
# Stripe CLI (desenvolvimento)
stripe listen --forward-to {NGROK_URL}/api/auth/stripe/webhook

# MercadoPago (usar ngrok)
ngrok http 3000
```

## 🆘 **Troubleshooting**

### **URLs não funcionam**
1. ✅ Verificar se `NEXT_PUBLIC_APP_URL` está configurada
2. ✅ Confirmar se a URL é acessível (HTTPS em produção)
3. ✅ Testar webhook endpoints manualmente

### **CORS Errors**
1. ✅ Verificar se origem está em `getAllowedOrigins()`
2. ✅ Confirmar headers CORS no middleware
3. ✅ Testar em ambiente similar ao de produção

### **Webhooks não chegam**
1. ✅ Verificar se URL está configurada no provedor
2. ✅ Confirmar se endpoint está acessível externamente
3. ✅ Verificar logs do webhook no dashboard do provedor

## 📚 **Referências**

- [Helper de URLs](/src/lib/utils/urls.ts)
- [Middleware CORS](/middleware.ts)
- [Checklist de Deploy](/DEPLOY_CHECKLIST.md)
- [Validação de URLs](/scripts/check-urls.js)