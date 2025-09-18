# Configuração do Login Social (Google OAuth)

Para configurar o login social com Google para os clientes, siga os passos abaixo:

## 1. Configurar Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a API do Google+

## 2. Criar Credenciais OAuth 2.0

1. Vá para **APIs & Services** > **Credentials**
2. Clique em **Create Credentials** > **OAuth 2.0 Client IDs**
3. Selecione **Web application**
4. Configure as URLs:
   - **Authorized JavaScript origins**: `http://localhost:3000` (desenvolvimento)
   - **Authorized redirect URIs**: `http://localhost:3000/api/auth/callback/google`

## 3. Configurar Variáveis de Ambiente

Copie as credenciais obtidas e adicione no seu arquivo `.env`:

```bash
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## 4. URLs de Login

- **Clientes**: `/login-cliente` - Inclui login com Google
- **Administradores de Restaurante**: `/login-restaurante` - Apenas email/senha
- **Cadastro de Cliente**: `/cadastro-cliente` - Inclui cadastro com Google

## 5. Separação de Usuários

O sistema distingue entre dois tipos de usuários:

- **CUSTOMER**: Clientes que fazem pedidos nos restaurantes
- **RESTAURANT_ADMIN**: Administradores que gerenciam restaurantes

Cada tipo de usuário tem suas próprias rotas protegidas e fluxos de autenticação.

## 6. Middleware de Proteção

O middleware automaticamente:
- Redireciona usuários não autenticados para login adequado
- Valida o tipo de usuário para cada rota
- Protege rotas administrativas e do cliente separadamente

## 7. Produção

Para produção, atualize as URLs no Google Cloud Console:
- **JavaScript origins**: `https://seudominio.com`
- **Redirect URIs**: `https://seudominio.com/api/auth/callback/google`
