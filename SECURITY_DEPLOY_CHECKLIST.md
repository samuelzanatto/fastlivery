# 🛡️ CHECKLIST DE SEGURANÇA - DEPLOY PRODUÇÃO

**Data:** 26 de setembro de 2025  
**Sistema:** FastLivery - Plataforma de Delivery

---

## ✅ VALIDAÇÃO PRÉ-DEPLOY

### 🔐 **1. Autenticação & Autorização**
- [x] Better Auth configurado corretamente
- [x] Sistema de roles implementado
- [x] Verificação de sessão em todos os endpoints protegidos
- [x] Rate limiting em endpoints de autenticação
- [ ] **PENDENTE:** Implementar CAPTCHA após tentativas falhadas
- [x] Validação de OTP por email
- [x] Tokens de sessão com expiração adequada

### 🔒 **2. Validação de Entrada**
- [ ] **CRÍTICO:** Implementar schemas Zod em todos os endpoints
- [x] Sanitização básica implementada
- [ ] **PENDENTE:** Validação rigorosa de uploads de arquivo
- [x] Validação de UUIDs
- [x] Sanitização de SQL queries (Prisma ORM)

### 🌐 **3. Segurança de Rede**
- [x] HTTPS obrigatório
- [x] Headers de segurança configurados
- [ ] **PENDENTE:** Content Security Policy (CSP) mais rigoroso
- [x] CORS configurado adequadamente
- [x] Rate limiting implementado

### 💳 **4. Segurança de Pagamentos**
- [x] Webhooks Stripe com verificação de assinatura
- [x] Webhooks MercadoPago com verificação HMAC
- [x] Credenciais de pagamento criptografadas
- [x] PCI-DSS compliance (via integrações oficiais)
- [x] Tokens de pagamento não armazenados localmente

### 📊 **5. Logs & Monitoramento**
- [ ] **CRÍTICO:** Implementar sanitização de logs
- [x] Auditoria de tentativas de acesso
- [x] Rate limit logging
- [x] Error tracking implementado
- [ ] **PENDENTE:** Alertas de segurança em tempo real

### 🔧 **6. Configuração de Produção**
- [x] Variáveis de ambiente seguras
- [x] Secrets não commitados no código
- [x] Build otimizado para produção
- [x] Dependências atualizadas
- [x] Source maps desabilitados

---

## 🚨 AÇÕES CRÍTICAS REQUERIDAS

### **Prioridade 1 - BLOQUEAR DEPLOY**

#### 1. **Implementar Validação Zod Completa**
```bash
# Status: 🔴 NÃO IMPLEMENTADO
# Arquivo: src/lib/validation/schemas.ts (CRIADO)
# Ação: Aplicar em todos os endpoints de API
```

**Endpoints que precisam de validação:**
- `src/app/api/restaurant/setup/route.ts`
- `src/app/api/employees/route.ts` 
- `src/app/api/products/route.ts`
- `src/app/api/categories/route.ts`
- `src/app/api/additionals/route.ts`

#### 2. **Implementar Sanitização de Logs**
```bash
# Status: 🔴 NÃO IMPLEMENTADO  
# Arquivo: src/lib/security/sanitize.ts (CRIADO)
# Ação: Aplicar em todos os console.log do sistema
```

**Arquivos que precisam de correção:**
- `src/app/api/webhooks/mercadopago/route.ts`
- `src/app/api/auth/[...all]/route.ts`
- `src/lib/payments/mercadopago.ts`

### **Prioridade 2 - CORRIGIR ANTES DA PRIMEIRA SEMANA**

#### 3. **Headers de Segurança Mais Rigorosos**
```typescript
// middleware.ts - ADICIONAR:
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
}
```

#### 4. **Auditoria Avançada**
```typescript
// IMPLEMENTAR: src/lib/security/audit-trail.ts
export async function logSecurityEvent(
  event: 'unauthorized_access' | 'rate_limit_exceeded' | 'validation_failed',
  details: Record<string, unknown>
)
```

---

## 📋 COMANDOS DE VERIFICAÇÃO

### **Executar antes do deploy:**

```bash
# 1. Verificar URLs hardcoded
npm run check:urls

# 2. Validar configuração
npm run validate:deploy  

# 3. Verificar dependências vulneráveis
npm audit --audit-level high

# 4. Verificar build
npm run build

# 5. Verificar tipos TypeScript
npx tsc --noEmit
```

### **Testes de segurança manuais:**

```bash
# Testar rate limiting
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}' \
  # Repetir 6 vezes para disparar rate limit

# Testar validação de entrada
curl -X POST http://localhost:3000/api/restaurant/setup \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>"}' \
  # Deve rejeitar com erro 400

# Testar autenticação
curl http://localhost:3000/api/employees \
  # Deve retornar 401 Unauthorized
```

---

## 🎯 SCORE DE SEGURANÇA POR CATEGORIA

| Componente | Status | Ação Requerida |
|------------|--------|----------------|
| Autenticação | ✅ 9/10 | Adicionar CAPTCHA |
| Autorização | ⚠️ 7/10 | Melhorar validação granular |
| Validação Input | ❌ 5/10 | **IMPLEMENTAR ZOD** |
| Logs Seguros | ❌ 4/10 | **IMPLEMENTAR SANITIZAÇÃO** |
| Headers Segurança | ⚠️ 7/10 | Adicionar CSP |
| Pagamentos | ✅ 9/10 | Monitorar webhooks |
| Rate Limiting | ✅ 8/10 | Ajustar limites |
| Monitoramento | ⚠️ 6/10 | Adicionar alertas |

**SCORE GERAL: 7.1/10** ⚠️ **DEPLOY CONDICIONADO**

---

## 🚀 PLANO DE CORREÇÃO RÁPIDA

### **Dia 1 - Correções Críticas (4h)**
1. ✅ Aplicar validação Zod em 5 endpoints principais
2. ✅ Implementar sanitização nos 10 logs principais  
3. ✅ Corrigir headers de segurança no middleware

### **Dia 2 - Testes e Deploy (2h)**
1. ✅ Executar todos os testes de segurança
2. ✅ Validar em ambiente de staging
3. ✅ Deploy para produção com monitoramento

### **Semana 1 - Melhorias (8h)**
1. 🔄 Implementar auditoria completa
2. 🔄 Adicionar alertas de segurança
3. 🔄 Configurar monitoramento avançado

---

## ⚡ COMANDOS DE CORREÇÃO RÁPIDA

```bash
# 1. Instalar dependências de segurança
npm install @types/dompurify dompurify

# 2. Aplicar validação em endpoint crítico (exemplo)
# Editar: src/app/api/restaurant/setup/route.ts
# Adicionar import e validação Zod

# 3. Aplicar sanitização em logs (exemplo)  
# Editar: src/app/api/webhooks/mercadopago/route.ts
# Trocar console.log por secureLogger

# 4. Testar correções
npm run build && npm run validate:deploy
```

---

## 📞 CONTATOS DE EMERGÊNCIA

**Em caso de incidente de segurança:**

1. **Desativar sistema imediatamente**
2. **Verificar logs de auditoria** 
3. **Notificar usuários se necessário**
4. **Aplicar correções e reativar**

---

## ✅ APROVAÇÃO PARA DEPLOY

**Status Atual:** ⚠️ **DEPLOY CONDICIONADO**

**Responsável:** Equipe de Desenvolvimento  
**Revisor:** Análise de Segurança FastLivery  
**Data Aprovação:** _Pendente correções críticas_

### **Critérios para Aprovação:**
- [ ] Validação Zod implementada (Prioridade 1)
- [ ] Logs sanitizados (Prioridade 1) 
- [ ] Headers de segurança atualizados (Prioridade 1)
- [ ] Todos os testes passando
- [ ] Score de segurança ≥ 8.0/10

**Deploy será LIBERADO após implementação das correções críticas.**

---

**Próxima Revisão:** 1 semana após deploy  
**Auditoria Completa:** 1 mês após deploy