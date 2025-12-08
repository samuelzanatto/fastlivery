# FastLivery - SaaS de Delivery 🚀

Sistema completo de delivery com assinaturas e pagamentos integrados.

## 🏗️ Tecnologias

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **Autenticação**: Better Auth (com Prisma) + Middleware
- **UI**: shadcn/ui + Lucide Icons

## 🚀 Início Rápido

### 1. Instalação

```bash
# Clonar o repositório
git clone [seu-repo]
cd fastlivery

# Instalar dependências
npm install
```

### 2. Configuração do Banco de Dados

```bash
# Configurar PostgreSQL
createdb fastlivery

# Executar migrações
npx prisma migrate dev
npx prisma generate
```

### 3. Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fastlivery"

# JWT
JWT_SECRET="your-super-secret-jwt-key"

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
- [x] Autenticação com Better Auth
- [x] CRUD de restaurantes
- [x] Sistema de pedidos

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
/signup             # Cadastro + criação de restaurante
/dashboard          # Dashboard principal (protegido)
/admin              # Área administrativa (protegido)

# APIs
/api/auth/[...all]                    # Endpoints Better Auth
/api/restaurant/create                # Cria restaurante do usuário autenticado
```

## 🔐 Autenticação

O sistema usa Better Auth (cookies HttpOnly) e middleware:
- Rotas protegidas: `/dashboard`, `/admin`
- Redirecionamento para `/signin` quando não autenticado
- Sessão gerenciada automaticamente pelo Better Auth

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
