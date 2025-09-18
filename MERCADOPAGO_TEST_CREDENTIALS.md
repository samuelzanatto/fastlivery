# 🧪 Credenciais de Teste do Mercado Pago

Para testar o sistema de pagamentos sem custos reais, use as credenciais de teste abaixo:

## 📋 Credenciais de Teste (Brasil)

### Access Token:
```
TEST-1234567890123456-123456-abcdef1234567890abcdef1234567890-123456789
```

### Public Key:
```
TEST-abcdef12-3456-7890-abcd-ef1234567890
```

## 🔧 Como Usar

1. **Acesse a Dashboard** → Configurações
2. **Na seção Mercado Pago**, clique em "Configurar Mercado Pago"
3. **Cole as credenciais de teste** nos campos correspondentes
4. **Sistema detectará automaticamente** que são credenciais de teste
5. **Teste os pagamentos** - nenhum valor real será cobrado!

## 🎯 O que você pode testar:

### PIX (Modo Teste):
- ✅ Geração de QR Code
- ✅ Código PIX para copiar e colar
- ✅ Simulação de pagamento aprovado/rejeitado
- ✅ Webhook de confirmação
- ✅ Criação automática do pedido

### Cartão de Crédito (Modo Teste):
- ✅ Checkout do Mercado Pago
- ✅ Cartões de teste (números fictícios)
- ✅ Parcelamento
- ✅ Aprovação/Rejeição simulada
- ✅ Retorno para o site

## 💳 Cartões de Teste

Para testar pagamentos com cartão, use estes números:

**Cartão Aprovado:**
- Número: `4235647728025682`
- Vencimento: `11/25`  
- CVV: `123`
- Nome: `APRO` (sempre aprovado)

**Cartão Rejeitado:**
- Número: `4235647728025682`
- Vencimento: `11/25`
- CVV: `123`  
- Nome: `OTHE` (sempre rejeitado)

## ⚠️ Importante

- **Modo Teste:** Os pagamentos são simulados - nenhum dinheiro real é processado
- **URLs Funcionam:** Todos os webhooks e redirecionamentos funcionam normalmente
- **Pedidos Criados:** O sistema cria pedidos reais no banco de dados
- **Notificações:** Recebe notificações como em produção

## 🚀 Quando Usar Produção

Depois de testar, use credenciais reais que começam com `APP_USR-` para processar pagamentos reais.

---

**💡 Dica:** O sistema detecta automaticamente se você está usando credenciais de teste e mostra um indicador visual "🧪 Modo Teste" na dashboard.
