# 🔑 Como Obter Credenciais de Teste - Mercado Pago

## 🎯 **Passo a Passo Completo:**

### **1. Acesse o Painel de Desenvolvedores**
🔗 **Link direto**: https://developers.mercadopago.com.br/panel

### **2. Faça Login**
- Use sua conta do Mercado Pago existente
- Ou crie uma nova conta se necessário

### **3. Crie uma Aplicação**
1. Clique em **"Criar aplicação"** ou **"Nova aplicação"**
2. Preencha os dados:
   - **Nome**: `Zaplivery Test` (ou qualquer nome)
   - **Modelo de negócio**: `Marketplace`
   - **Produtos**: Marque `Checkout Pro` e `Payments API`
   - **URL do site**: `http://localhost:3000` (para desenvolvimento)

### **4. Encontre as Credenciais**
Após criar a aplicação:

1. **Clique na sua aplicação criada**
2. **Vá para a aba "Credenciais"**
3. **Seção "Credenciais de teste"**:

```
🔑 Access Token de Teste:
TEST-1234567890-abcdef-ghijkl-mnopqr-12345678

🔑 Public Key de Teste:  
TEST-12345678-abcd-efgh-ijkl-123456789012
```

## ⚠️ **IMPORTANTE: Identificação das Credenciais - CHECKOUT PRO**

### ✅ **Credenciais do CHECKOUT PRO:**
- **SEMPRE começam com `APP_USR-`** (tanto teste quanto produção)
- **Credenciais de TESTE**: `APP_USR-1234567890-abcdef...` (ambiente sandbox)
- **Credenciais de PRODUÇÃO**: `APP_USR-1234567890-abcdef...` (ambiente live)

### ❌ **Credenciais `TEST-` são para Payment API:**
- Credenciais que começam com `TEST-` são para Payment API (PIX transparente)
- **Não funcionam com Checkout Pro**
- São para integração direta sem redirecionamento

### 🔍 **Como Identificar o Ambiente:**
- **Sandbox/Teste**: Disponível na seção "Credenciais de teste" no painel
- **Produção**: Disponível na seção "Credenciais de produção" no painel
- **Ambas começam com `APP_USR-`** mas são de ambientes diferentes

## 🔧 **Como Configurar no Seu Sistema:**

### **1. Arquivo `.env.local`**
Suas credenciais de teste do Checkout Pro:

```env
# Mercado Pago - CREDENCIAIS DE TESTE (CHECKOUT PRO)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-1234567890-abcdef-ghijkl-mnopqr-12345678
MERCADOPAGO_PUBLIC_KEY=APP_USR-12345678-abcd-efgh-ijkl-123456789012
```

**⚠️ IMPORTANTE:** 
- Use as credenciais da seção **"Credenciais de teste"** no painel
- Mesmo sendo `APP_USR-`, são de teste porque vêm da seção de teste
- PIX transparente **NÃO funcionará** com credenciais `APP_USR-`
- **Funcionará apenas Checkout Pro** (com redirecionamento)

### **2. Reinicie o Servidor**
```bash
# Pare o servidor (Ctrl+C)
# Inicie novamente
npm run dev
```

## 🧪 **Resultado com Credenciais de Teste (APP_USR-):**

Com as credenciais de teste do Checkout Pro (`APP_USR-` da seção teste):
1. ✅ **PIX via Checkout Pro funcionará** (com redirecionamento)
2. ❌ **PIX transparente NÃO funcionará** (precisa credenciais `TEST-`)
3. ✅ **Sistema fará fallback automático** para Checkout Pro
4. ✅ **Cliente será redirecionado** para página do MP para pagar PIX

### **Como Testar PIX Transparente (QR direto):**
Para ter PIX transparente (sem redirecionamento), você precisaria:
1. **Credenciais `TEST-`** (Payment API)
2. **Criar nova aplicação** configurada para Payment API
3. **Usar as credenciais `TEST-`** no lugar das `APP_USR-`

### **Recomendação:**
- **Para desenvolvimento rápido**: Use `APP_USR-` de teste (Checkout Pro)
- **Para experiência completa**: Obtenha credenciais `TEST-` (Payment API)

## 📱 **Apps de Teste para PIX:**

Para testar PIX transparente, você pode usar:
1. **Aplicativo do seu banco** (modo teste)
2. **Mercado Pago Wallet** (versão de teste)
3. **Simuladores de PIX** no ambiente de desenvolvimento

## 🎯 **Resultado Final:**

Com credenciais de teste do Checkout Pro (`APP_USR-` seção teste):
- ✅ PIX funciona via Checkout Pro (redirecionamento para MP)
- ✅ Cartões funcionam via Checkout Pro  
- ✅ Sistema está configurado corretamente
- ❌ PIX transparente (QR direto) não funciona com `APP_USR-`

**Suas credenciais atuais provavelmente já são de TESTE se você as pegou da seção "Credenciais de teste" do painel, mesmo sendo `APP_USR-`! 🚀**

---

## 📞 **Precisa de Ajuda?**

Se tiver dificuldades:
1. **Documentação oficial**: https://developers.mercadopago.com.br/docs
2. **Suporte MP**: https://developers.mercadopago.com.br/support
3. **Community**: https://developers.mercadopago.com.br/community
