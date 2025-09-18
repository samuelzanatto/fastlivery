# 🧱 Configuração Mercado Pago - Checkout Bricks

## **O que são Checkout Bricks?**

Os **Checkout Bricks** são **componentes modulares pré-construídos** do Mercado Pago que oferecem:

- ✅ **Interface nativa** do Mercado Pago
- ✅ **PCI Compliance automático** 
- ✅ **PIX transparente + Cartões** na mesma aplicação
- ✅ **Customização de tema** (default, dark, bootstrap, flat)
- ✅ **Componentes modulares** (Payment Brick, Card Payment Brick, Wallet Brick)

## **📋 Configuração no Painel do Mercado Pago**

### **1. Criando a Aplicação**

1. Acesse [developers.mercadopago.com](https://developers.mercadopago.com)
2. Faça login com sua conta Mercado Pago
3. Vá em **"Suas integrações"** → **"Criar aplicação"**

### **2. Configuração da Aplicação**

```
Nome da aplicação: Zaplivery
Descrição: Plataforma de delivery de alimentos
Categoria: E-commerce

Produtos que deve selecionar:
✅ Checkout Bricks
✅ Checkout Transparente (para PIX direto)

NÃO selecionar:
❌ Checkout Pro (desnecessário com Bricks)
```

### **3. URLs de Configuração**

```
URLs de redirect:
- Success: https://seudominio.com/payment/success
- Failure: https://seudominio.com/payment/failure
- Pending: https://seudominio.com/payment/pending

URL de Notificação (Webhook):
- https://seudominio.com/api/webhook-mercadopago
```

### **4. Credenciais**

Após criar a aplicação, você obterá:

**Para Desenvolvimento (Sandbox):**
```
Public Key: TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Access Token: TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Para Produção:**
```
Public Key: APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Access Token: APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## **🔧 Configuração no Projeto**

### **1. Variáveis de Ambiente**

Atualize seu `.env`:

```bash
# Mercado Pago - Desenvolvimento
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Para produção, troque por:
# MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# URLs para webhook (use ngrok para desenvolvimento)
NEXTAUTH_URL=http://localhost:3000
NGROK_URL=https://seu-ngrok-id.ngrok-free.app
```

### **2. Componente CheckoutBricks**

O componente já está implementado em `/src/components/checkout-bricks.tsx` com:

- **Payment Brick** para PIX transparente
- **Card Payment Brick** para cartões 
- Interface em bottom sheet com 4 steps
- Integração automática com seu carrinho

## **🎯 Como Funciona**

### **PIX Transparente**
- ✅ Com credenciais `TEST-`: Funciona perfeitamente
- ✅ Com credenciais `APP_USR-` em produção: Funciona perfeitamente
- ❌ Com credenciais `APP_USR-` em desenvolvimento: Fallback automático

### **Pagamentos com Cartão**
- ✅ **Card Payment Brick** nativo
- ✅ Interface segura do Mercado Pago
- ✅ PCI Compliance automático
- ✅ Funciona com qualquer credencial

## **🧪 Testando o Sistema**

### **PIX (com credenciais TEST-):**
1. Selecione PIX no checkout
2. Aparecerá QR code e chave copia-e-cola
3. Use o app do Mercado Pago para simular

### **Cartão (números de teste):**
```
Visa: 4509 9535 6623 3704
Mastercard: 5031 7557 3453 0604
CVV: 123
Validade: 11/25
```

## **🔔 Webhook para Notificações**

Para desenvolvimento com ngrok:

1. **Instale ngrok**: `npm install -g ngrok`
2. **Execute**: `ngrok http 3000`
3. **Configure no painel MP**:
   ```
   https://seu-id.ngrok-free.app/api/webhook-mercadopago
   ```

## **🚀 Estados de Pagamento**

O sistema possui 6 estados visuais:

| Estado | Descrição | Ícone |
|--------|-----------|-------|
| `idle` | Aguardando | ⏳ |
| `processing` | Processando | 🔄 |
| `approved` | Aprovado | ✅ |
| `pending` | Pendente | ⏳ |
| `rejected` | Rejeitado | ❌ |
| `cancelled` | Cancelado | 🚫 |

## **📦 Checklist de Produção**

- [ ] Criar aplicação com Checkout Bricks
- [ ] Obter credenciais de produção (`APP_USR-`)
- [ ] Configurar domínio real nas URLs
- [ ] Atualizar variáveis de ambiente
- [ ] Configurar webhook com domínio de produção
- [ ] Testar todos os fluxos de pagamento

## **🎨 Customização de Tema**

Os Checkout Bricks suportam temas:

```javascript
style: {
  theme: 'default' // ou 'dark', 'bootstrap', 'flat'
}
```

## **✨ Vantagens dos Checkout Bricks vs Outras Soluções**

| Característica | Checkout Bricks | Checkout Pro | Checkout Transparente |
|---------------|-----------------|--------------|---------------------|
| Interface | Nativa MP | Redirect | Customizada |
| PIX Direto | ✅ | ❌ | ✅ |
| PCI Compliance | ✅ Automático | ✅ | Manual |
| Customização | Média | Baixa | Alta |
| Manutenção | Baixa | Baixa | Alta |
| UX Mobile | ✅ Excelente | Regular | Depende |

---

**🎯 Resultado Final:** Aplicação unificada com PIX transparente (QR code direto) e cartões (formulário nativo) em uma interface moderna e segura!
