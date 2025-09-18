# Sistema de Verificação de Email para Funcionários

## Visão Geral
Este sistema implementa verificação por email usando códigos OTP (One-Time Password) para ativar funcionários no ZapLivery. Utiliza o BetterAuth com plugin EmailOTP integrado.

## Fluxo de Funcionamento

### 1. Criação de Funcionário
- Administrador acessa `/users` no dashboard
- Clica em "Novo Funcionário" 
- Preenche dados básicos (nome, email, cargo)
- Sistema cria usuário com `emailVerified: false` e `isActive: false`
- **Automaticamente** envia email com código OTP de 6 dígitos

### 2. Verificação de Email
- Dialog de verificação OTP abre automaticamente após criação
- Funcionário recebe email com código de 6 dígitos (válido por 10 minutos)
- Administrador insere código no dialog
- Sistema valida OTP via BetterAuth
- Se válido: ativa usuário (`emailVerified: true`, `isActive: true`)

### 3. Status Visual
- **Badge Vermelho**: "Não verificado" - funcionário inativo
- **Badge Verde**: "Verificado" - funcionário ativo
- **Badge Azul**: "Pendente" - aguardando verificação

## Configuração

### Variáveis de Ambiente (.env.local)
```bash
# SMTP Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="your-email@gmail.com"
SMTP_FROM_NAME="ZapLivery"
```

### Para Gmail:
1. Ative autenticação de 2 fatores
2. Gere uma "Senha de App" específica
3. Use essa senha no `SMTP_PASS`

## APIs Implementadas

### POST /api/employees
- Cria funcionário e envia OTP automaticamente
- **Request**: `{ restaurantId, email, roleId, name }`
- **Response**: Dados do funcionário criado

### POST /api/employees/verify-otp
- Verifica código OTP e ativa funcionário
- **Request**: `{ email, otp }`
- **Response**: `{ success: true, message: "..." }`

## Componentes Frontend

### EmployeeCreationDialog
- Dialog inicial para criação de funcionário
- Coleta dados básicos do funcionário

### EmployeeOTPDialog  
- Dialog para inserção do código OTP
- Mostra email de destino
- Validação de código 6 dígitos

### EmployeeBadge
- Componente visual para status de verificação
- Estados: Verificado, Não Verificado, Pendente

## Segurança

### Medidas Implementadas:
1. **OTP Expirável**: Códigos válidos por 10 minutos
2. **Email HTML Seguro**: Template responsivo sem scripts
3. **Validação Backend**: Verificação server-side via BetterAuth
4. **Usuários Inativos**: Funcionários não verificados ficam inativos
5. **Autorização**: Só donos de restaurante podem criar funcionários

### Logs de Segurança:
```typescript
console.log(`OTP enviado para ${email}: ${otp}`) // Desenvolvimento
console.error("Erro ao enviar OTP:", error)       // Produção
```

## Template de Email

O sistema envia emails HTML responsivos com:
- Logo ZapLivery
- Código OTP destacado
- Instruções claras
- Aviso de expiração (10 minutos)
- Design profissional

## Troubleshooting

### Erro "Código inválido ou expirado"
- Verificar se passou dos 10 minutos
- Confirmar que o código tem exatamente 6 dígitos
- Verificar configuração SMTP

### Email não chegou
1. Verificar spam/lixo eletrônico
2. Confirmar credenciais SMTP no .env.local
3. Verificar logs do servidor
4. Testar com outro provedor de email

### Funcionário não ativado
- Verificar se `emailVerified` foi definido como `true`
- Confirmar que `isActive` foi atualizado
- Verificar logs da API `/verify-otp`

## Próximos Passos

Para produção, considere:
1. **Serviço de Email Profissional**: Resend, SendGrid, ou AWS SES
2. **Rate Limiting**: Limitar envios de OTP por IP/email
3. **Monitoramento**: Alertas para falhas de envio
4. **Templates Personalizáveis**: Sistema de templates por restaurante
5. **Reenvio de Código**: Botão para reenviar OTP expirado