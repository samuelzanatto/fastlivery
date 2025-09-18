# Usuários de Teste do Mercado Pago

## 🧪 Problema Identificado

Quando você seleciona PIX e vai para o Checkout Pro, está sendo direcionado para sua conta **real** do Mercado Pago, mesmo no ambiente de teste. Isso causa o erro "saldo insuficiente" porque:

1. **Checkout Pro sandbox** ainda usa interface da conta real
2. **Precisa de usuários de teste específicos** para simular pagamentos
3. **PIX no sandbox** requer configuração especial

## 📋 Solução: Criar Usuários de Teste

### 1. Criar Usuários de Teste via Dashboard

1. Acesse: https://developers.mercadopago.com.br/panel/app
2. Vá em **"Tus integraciones"** → Sua aplicação
3. Clique em **"Cuentas de prueba"** → **"+ Crear cuenta de prueba"**
4. Crie duas contas:

#### Conta VENDEDOR:
- **Descrição**: "Vendedor - ZapLivery"
- **País**: Brasil
- **Dinheiro fictício**: R$ 0 (vendedor não precisa)

#### Conta COMPRADOR:
- **Descrição**: "Comprador - PIX"
- **País**: Brasil  
- **Dinheiro fictício**: R$ 1000,00 (para simular saldo)

### 2. Configurar PIX na Conta de Teste

Para o PIX funcionar, a conta de teste precisa ter:
- ✅ **Chave PIX cadastrada**
- ✅ **Saldo suficiente na conta**
- ✅ **Status ativo**

### 3. Usar Credenciais da Conta de Teste Vendedor

- Substitua as credenciais no `.env` pelas da conta **VENDEDOR de teste**
- Use o **Access Token** da conta de teste vendedor
- Mantenha as credenciais no formato `TEST-...`

## 🎯 Para Testar PIX:

1. **Login com conta COMPRADOR de teste** no Mercado Pago
2. **Faça o pedido PIX** no seu sistema
3. **Complete o pagamento** com a conta de teste

## 🔧 Alternativa: Forçar PIX Only

Se ainda não funcionar, posso criar uma configuração que **força apenas PIX** na preferência, removendo todas as outras opções.

## 📞 Cartões de Teste (Backup)

Se PIX não funcionar imediatamente:

**Visa Teste**: 4509 9535 6623 3704
- Nome: APRO
- CPF: 11111111111  
- Data: 11/25
- CVC: 123

**Mastercard Teste**: 5031 7557 3453 0604
- Nome: APRO
- CPF: 11111111111
- Data: 11/25  
- CVC: 123
