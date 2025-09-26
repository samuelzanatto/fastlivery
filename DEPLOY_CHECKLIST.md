# 🚀 Checklist de Deploy - FastLivery

## ✅ **PRÉ-DEPLOY (Obrigatório)**

### 🔐 **1. Configuração de Variáveis de Ambiente**
- [ ] Criar arquivo `.env` baseado no `.env.example`
- [ ] Configurar `DATABASE_URL` e `DIRECT_URL` (PostgreSQL)
- [ ] Configurar `BETTER_AUTH_SECRET` (32+ caracteres)
- [ ] Configurar todas as variáveis do Stripe
- [ ] Configurar SMTP para envio de emails
- [ ] Definir `CRON_SECRET` seguro
- [ ] Configurar `NEXT_PUBLIC_APP_URL` com domínio final

### 🏗️ **2. Preparação do Projeto**
- [ ] Executar `npm run build` localmente sem erros
- [ ] Executar `npm run lint` sem warnings críticos
- [ ] Testar autenticação completa
- [ ] Testar fluxo de pagamento Stripe
- [ ] Verificar se todos os cron jobs funcionam

### 💳 **3. Configuração do Stripe**
- [ ] Alterar para chaves **LIVE** (sk_live_, pk_live_)
- [ ] Configurar webhook para domínio de produção
- [ ] Testar produtos e preços em ambiente live
- [ ] Verificar se o webhook está recebendo eventos

## 🚀 **DEPLOY NA VERCEL**

### 📋 **1. Configuração do Projeto**
```bash
# Instalar CLI da Vercel
npm i -g vercel

# Fazer deploy inicial
vercel

# Ou fazer deploy de produção direto
vercel --prod
```

### 🔑 **2. Configurar Variáveis no Dashboard Vercel**

**Variáveis Sensíveis (tipo: sensitive):**
- `DATABASE_URL`
- `DIRECT_URL`
- `BETTER_AUTH_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SMTP_PASS`
- `CRON_SECRET`
- `INTERNAL_API_KEY`

**Variáveis Públicas:**
- `NEXT_PUBLIC_APP_URL`

**Variáveis por Ambiente:**
- Production: Chaves LIVE do Stripe
- Preview: Chaves TEST do Stripe (opcional)

### 🔧 **3. Configurações Adicionais**
- [ ] Configurar domínio customizado
- [ ] Ativar HTTPS (automático na Vercel)
- [ ] Configurar redirects se necessário
- [ ] Verificar se os cron jobs estão ativos

## ✅ **PÓS-DEPLOY (Verificações)**

### 🧪 **1. Testes Funcionais**
- [ ] Página inicial carrega corretamente
- [ ] Sistema de login/cadastro funciona
- [ ] Dashboard abre após login
- [ ] Fluxo de assinatura Stripe funciona
- [ ] Webhook do Stripe recebe eventos
- [ ] Email OTP é enviado
- [ ] Cron jobs executam sem erro

### 📊 **2. Monitoramento**
- [ ] Verificar logs da Vercel
- [ ] Monitorar webhook do Stripe
- [ ] Verificar métricas de performance
- [ ] Testar em diferentes dispositivos

### 🔒 **3. Segurança**
- [ ] HTTPS ativo
- [ ] Headers de segurança configurados
- [ ] CSP não bloqueia funcionalidades
- [ ] Variáveis sensíveis não expostas no código

## 🚨 **ROLLBACK (Se necessário)**

Se algo der errado:

```bash
# Fazer rollback para deploy anterior
vercel --prod [deployment-url-anterior]

# Ou promover deploy específico
vercel promote [deployment-url]
```

## 📱 **URLs Importantes**

- **Dashboard Vercel**: https://vercel.com/dashboard
- **Webhook Stripe**: `https://[seu-dominio]/api/auth/stripe/webhook`
- **Dashboard Stripe**: https://dashboard.stripe.com

## 🆘 **Troubleshooting**

### Problemas Comuns:

1. **Build falhando**: Verificar variáveis de ambiente obrigatórias
2. **Webhook não funciona**: Verificar URL e secret do webhook
3. **Autenticação não funciona**: Verificar `BETTER_AUTH_SECRET` e `NEXT_PUBLIC_APP_URL`
4. **Email não envia**: Verificar configurações SMTP
5. **Cron jobs falhando**: Verificar `CRON_SECRET`

### Logs para Verificar:
- Vercel Function Logs
- Stripe Webhook Logs
- Console do Browser (F12)

---

**⚠️ IMPORTANTE**: Sempre testar completamente em ambiente de preview antes de fazer deploy em produção!