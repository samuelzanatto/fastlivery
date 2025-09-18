# ZapLivery - SaaS de Delivery 🚀

Sistema completo de delivery com assinaturas e pagamentos integrados.

## 🏗️ Tecnologias

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **Autenticação**: Better Auth (com Prisma) + Middleware
- **Pagamentos**: Stripe via plugin oficial `@better-auth/stripe`
- **UI**: shadcn/ui + Lucide Icons

## 🚀 Início Rápido

### 1. Instalação

```bash
# Clonar o repositório
git clone [seu-repo]
cd zaplivery

# Instalar dependências
npm install
```

### 2. Configuração do Banco de Dados

```bash
# Configurar PostgreSQL
createdb zaplivery

# Executar migrações
npx prisma migrate dev
npx prisma generate
```

### 3. Configuração do Stripe

⚠️ **IMPORTANTE**: O sistema utiliza exclusivamente o Stripe para pagamentos!

Siga o guia:
- Criar conta no Stripe
- Configurar produtos e preços
- Obter chaves da API
- Configurar webhook apontando para: `/api/auth/stripe/webhook`

### 4. Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zaplivery"

# JWT
JWT_SECRET="your-super-secret-jwt-key"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_STARTER_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_ENTERPRISE_PRICE_ID="price_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 5. Executar

```bash
# Modo desenvolvimento
npm run dev

# Testar integração do Stripe
node test-stripe.js
```

## 📋 Funcionalidades

### ✅ Implementado
- [x] Sistema de autenticação com middleware
- [x] Dashboard responsivo com sidebar
- [x] Fluxo de cadastro em 4 etapas
- [x] Integração com Stripe para pagamentos
- [x] Webhooks do Stripe configurados
- [x] Planos de assinatura (Básico, Pro, Enterprise)

### 🔄 Em Desenvolvimento
- [ ] Criação automática de empresas após pagamento
- [ ] Portal de billing do cliente
- [ ] Gestão de assinaturas
- [ ] Sistema de pedidos e deliveries
- [ ] Integração com WhatsApp
- [ ] PWA e notificações push

## 🛣️ Estrutura de Rotas

```
/                    # Landing page
/signup             # Cadastro + criação de restaurante + upgrade (redirect Stripe)
/dashboard          # Dashboard principal (protegido)
/admin              # Área administrativa (protegido)

# APIs
/api/auth/[...all]                    # Endpoints Better Auth
/api/auth/stripe/webhook              # Webhook do Stripe (plugin Better Auth)
/api/restaurant/create                # Cria restaurante do usuário autenticado
/api/subscription/upgrade             # Upgrade de plano (server-side)
```

## 🔐 Autenticação

O sistema usa Better Auth (cookies HttpOnly) e middleware:
- Rotas protegidas: `/dashboard`, `/admin`
- Redirecionamento para `/signin` quando não autenticado
- Sessão gerenciada automaticamente pelo Better Auth

## 💳 Sistema de Pagamentos

### Sistema de Pagamentos Stripe

**Por que mudamos?**
- ✅ Melhor documentação e SDK
- ✅ Suporte internacional superior
- ✅ Webhooks mais confiáveis
- ✅ Melhor experiência de checkout
- ✅ Portal de billing nativo

### Planos Disponíveis

| Plano | Preço | Recursos |
|-------|-------|----------|
| **Básico** | R$ 49,90/mês | Até 100 pedidos, Dashboard básico |
| **Pro** | R$ 99,90/mês | Pedidos ilimitados, Relatórios avançados |
| **Enterprise** | R$ 199,90/mês | API personalizada, Suporte 24/7 |

## 🔧 Scripts Úteis

```bash
# Desenvolvimento
npm run dev              # Servidor de desenvolvimento
npm run build           # Build para produção
npm run start           # Servidor de produção

# Database
npx prisma studio       # Interface visual do DB
npx prisma migrate dev  # Aplicar migrações

# Stripe
node test-stripe.js     # Testar integração
stripe listen --forward-to localhost:3000/api/auth/stripe/webhook
```

## 🧪 Testes

### Cartões de Teste do Stripe

**Sucesso:**
- Visa: `4242 4242 4242 4242`
- Mastercard: `5555 5555 5555 4444`
- CVV: `123` | Data: Qualquer data futura

**Falha:**
- Visa: `4000 0000 0000 0002`

## 📦 Deploy

### Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configurar variáveis de ambiente no dashboard da Vercel
```

### Variáveis de Produção

⚠️ **IMPORTANTE**: Use chaves **LIVE** do Stripe em produção:
- `STRIPE_SECRET_KEY="sk_live_..."`
- `STRIPE_PUBLISHABLE_KEY="pk_live_..."`
- Configure webhooks para o domínio de produção

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Add nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📚 Recursos

- [Documentação do Stripe](https://stripe.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui](https://ui.shadcn.com)

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

**Desenvolvido com ❤️ para revolucionar o mercado de delivery no Brasil**
