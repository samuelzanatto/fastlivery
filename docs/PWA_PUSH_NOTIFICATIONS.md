# Sistema de PWA Dinâmico com Push Notifications

Este documento descreve o sistema de PWA (Progressive Web App) dinâmico implementado para permitir que cada restaurante tenha seu próprio app instalável com notificações push.

## Visão Geral

O sistema permite que:
- Cada restaurante tenha seu próprio PWA com ícone, nome e cores personalizadas
- Clientes possam instalar o "app" do restaurante na tela inicial
- Restaurantes enviem notificações push sobre status de pedidos
- Clientes recebam alertas mesmo quando o navegador está fechado

## Configuração Inicial (IMPORTANTE)

### 1. Variáveis de Ambiente Local (.env.local)

As seguintes variáveis já foram adicionadas:

```env
# Web Push VAPID Keys
VAPID_PUBLIC_KEY=BFz-tXePF0iEVHqjPXiS3G7nIdRcO385CUaAuIlOT7ruVMfwmNxIOauOrLl5KAJEw2byu-p3FAsqYTswbH9yPxA
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BFz-tXePF0iEVHqjPXiS3G7nIdRcO385CUaAuIlOT7ruVMfwmNxIOauOrLl5KAJEw2byu-p3FAsqYTswbH9yPxA
VAPID_PRIVATE_KEY=48ns1bfCJw-AU0QDjotUrO8VVOfkJCqdLHcd_FIfpCQ
VAPID_SUBJECT=mailto:contato@fastlivery.com.br
```

### 2. Configurar Secrets no Supabase (OBRIGATÓRIO)

Acesse o Dashboard do Supabase e configure as secrets da Edge Function:

1. Vá para **Project Settings** → **Edge Functions** → **Secrets**
2. Adicione as seguintes secrets:

| Nome | Valor |
|------|-------|
| `VAPID_PUBLIC_KEY` | `BFz-tXePF0iEVHqjPXiS3G7nIdRcO385CUaAuIlOT7ruVMfwmNxIOauOrLl5KAJEw2byu-p3FAsqYTswbH9yPxA` |
| `VAPID_PRIVATE_KEY` | `48ns1bfCJw-AU0QDjotUrO8VVOfkJCqdLHcd_FIfpCQ` |
| `VAPID_SUBJECT` | `mailto:contato@fastlivery.com.br` |

**Ou via CLI:**
```bash
supabase secrets set VAPID_PUBLIC_KEY=BFz-tXePF0iEVHqjPXiS3G7nIdRcO385CUaAuIlOT7ruVMfwmNxIOauOrLl5KAJEw2byu-p3FAsqYTswbH9yPxA
supabase secrets set VAPID_PRIVATE_KEY=48ns1bfCJw-AU0QDjotUrO8VVOfkJCqdLHcd_FIfpCQ
supabase secrets set VAPID_SUBJECT=mailto:contato@fastlivery.com.br
```

### 3. Variáveis para Deploy (Vercel/Produção)

Adicione no painel da Vercel:
- `VAPID_PUBLIC_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `SUPABASE_SERVICE_ROLE_KEY` (já deve estar configurado)

## Arquitetura

### 1. Manifest Dinâmico

**Arquivo:** `src/app/[slug]/manifest.json/route.ts`

Gera um manifesto Web App único para cada restaurante baseado em:
- Nome e descrição do restaurante
- Logo/avatar do restaurante (usado como ícone)
- Cores da marca

```
GET /{slug}/manifest.json
```

### 2. Service Worker

**Arquivo:** `public/sw.js`

Service Worker global que:
- Gerencia cache de arquivos estáticos
- Processa notificações push
- Mostra notificações nativas do sistema
- Lida com cliques em notificações

### 3. Push Subscriptions

**Tabela:** `push_subscriptions`

Armazena as subscriptions do Web Push API:
- `businessId`: ID do restaurante
- `endpoint`: URL do serviço de push
- `p256dh`: Chave pública ECDH
- `auth`: Token de autenticação
- `userId`: (opcional) ID do usuário se logado

### 4. Edge Function

**Função:** `send-push-notification`

Edge Function do Supabase que:
- Recebe requisições para enviar notificações
- Busca subscriptions do restaurante
- Envia push via Web Push protocol
- Remove subscriptions inválidas automaticamente

### 5. Componentes React

**Hook:** `src/hooks/use-push-notifications.ts`
- Gerencia estado de permissões
- Subscribe/unsubscribe de notificações
- Registra Service Worker

**Componente:** `src/components/pwa/pwa-install-prompt.tsx`
- Banner de instalação do PWA
- Toggle de notificações
- Instruções para iOS

## Configuração

### Variáveis de Ambiente

Adicione ao `.env`:

```env
# Web Push VAPID Keys
VAPID_PUBLIC_KEY=sua_chave_publica
NEXT_PUBLIC_VAPID_PUBLIC_KEY=sua_chave_publica
VAPID_PRIVATE_KEY=sua_chave_privada
VAPID_SUBJECT=mailto:contato@seusite.com.br
```

Para gerar novas chaves VAPID:
```bash
npx tsx scripts/generate-vapid-keys.ts
```

### Supabase Edge Function

Configure as seguintes variáveis de ambiente na Edge Function `send-push-notification`:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

## Uso

### Enviar Notificação de Status de Pedido

```typescript
import { sendOrderStatusNotification } from '@/lib/push-notifications'

await sendOrderStatusNotification('CONFIRMED', {
  businessId: 'xxx',
  businessName: 'Pizzaria Example',
  businessLogo: 'https://...',
  orderId: 'order-123',
  orderNumber: 42,
  userId: 'user-456', // opcional - se não passar, envia para todos
  slug: 'pizzaria-example'
})
```

### Enviar Notificação de Novo Pedido

```typescript
import { sendNewOrderNotification } from '@/lib/push-notifications'

await sendNewOrderNotification({
  businessId: 'xxx',
  businessName: 'Pizzaria Example',
  orderId: 'order-123',
  orderNumber: 42,
  total: 59.90,
  items: 3
})
```

### Integrar PWA na Página

```tsx
import { PWAInstallPrompt } from '@/components/pwa/pwa-install-prompt'

<PWAInstallPrompt
  businessId={business.id}
  businessName={business.name}
  userId={session?.user?.id}
  vapidPublicKey={VAPID_PUBLIC_KEY}
  variant="banner" // ou "card" ou "button"
  showNotificationToggle={true}
/>
```

## Compatibilidade

### Navegadores Suportados
- Chrome/Edge: ✅ Instalação + Push
- Firefox: ✅ Push (instalação limitada)
- Safari: ⚠️ Push (iOS 16.4+) / Instalação via "Adicionar à Tela Inicial"
- Opera: ✅ Instalação + Push

### Limitações iOS
- Não suporta `beforeinstallprompt`
- Requer Safari para instalação
- Push notifications disponíveis apenas a partir do iOS 16.4
- Componente mostra instruções manuais para instalação

## Troubleshooting

### Notificações não aparecem
1. Verifique se as chaves VAPID estão corretas
2. Confirme que o Service Worker está registrado
3. Verifique permissões no navegador
4. Teste se a subscription está salva no banco

### PWA não instala
1. Verifique se HTTPS está ativo
2. Confirme que o manifest está acessível
3. Verifique se o Service Worker está registrado
4. No iOS, use Safari e "Adicionar à Tela Inicial"

### Push não chega
1. Verifique logs da Edge Function
2. Confirme que a subscription não expirou
3. Verifique se o endpoint ainda é válido
4. Teste com outra subscription

## Segurança

- `VAPID_PRIVATE_KEY` nunca deve ser exposta no cliente
- Endpoints de push são únicos por navegador/dispositivo
- Subscriptions são automaticamente removidas quando inválidas
- RLS protege acesso às subscriptions no Supabase
