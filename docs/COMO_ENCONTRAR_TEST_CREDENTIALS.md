# 🔍 Guia: Como Encontrar Credenciais TEST- para PIX Transparente

## ❌ **Se NÃO encontrou "Produtos":**

A interface do painel do Mercado Pago pode variar. Vou te mostrar **todos os caminhos possíveis**:

## 📋 **Método 1: Criar Nova Aplicação Payment API**

### **1. No Painel de Desenvolvedor:**
🔗 **https://developers.mercadopago.com.br/panel**

### **2. Criar Nova Aplicação:**
1. **Clique em "Criar aplicação"**
2. **Modelo de negócio**: Escolha uma opção (ex: "Online")  
3. **Nome**: `ZapLivery PIX Transparente`
4. **Produtos/Funcionalidades**: 
   - ✅ **Procure por "Checkout API"** 
   - ✅ **Ou "Payment API"**
   - ✅ **Ou "Payments"**
   - ❌ **NÃO marque "Checkout Pro"** (essa você já tem)

### **3. Dentro da Nova Aplicação:**
- **Vá para "Credenciais"**
- **Seção "Credenciais de teste"**
- **Você verá credenciais que começam com `TEST-`**

## 📋 **Método 2: Procurar na Aplicação Atual**

### **Na sua aplicação Checkout Pro atual:**
1. **Entre na aplicação**
2. **Procure por abas/seções:**
   - 🔍 "Configurações"
   - 🔍 "APIs"
   - 🔍 "Funcionalidades"
   - 🔍 "Integrações"
   - 🔍 "Payment Methods"

3. **Procure opção para ativar:**
   - ✅ "Checkout API"
   - ✅ "Payment API" 
   - ✅ "Direct API"

## 📋 **Método 3: Interface Mais Antiga**

Se o painel for da versão anterior:

### **1. Acesse:**
🔗 **https://www.mercadopago.com.br/developers/panel/app**

### **2. Na lista de aplicações:**
- **Crie nova aplicação**
- **Tipo**: "Pagamentos online"
- **Selecione funcionalidades que incluam Payment API**

## 📋 **Método 4: Via API REST (Avançado)**

Se não conseguir pela interface, posso te ajudar a criar via API:

```bash
# Criar aplicação via API
curl -X POST \
'https://api.mercadopago.com/applications' \
-H 'Authorization: Bearer SEU_ACCESS_TOKEN_ATUAL' \
-H 'Content-Type: application/json' \
-d '{
    "name": "ZapLivery PIX Transparente",
    "short_name": "zaplivery-pix",
    "description": "Aplicação para PIX transparente",
    "platform": "mp_marketplace",
    "scopes": ["read", "write"]
}'
```

## 🎯 **O Que Procurar:**

### **Credenciais Corretas para PIX Transparente:**
```
✅ Access Token: TEST-1234567890-abcdef...
✅ Public Key: TEST-87654321-abcd...
```

### **NÃO são essas (são para Checkout Pro):**
```
❌ Access Token: APP_USR-1234567890-abcdef...
❌ Public Key: APP_USR-87654321-abcd...
```

## 🔧 **Alternativa Simples:**

### **Se não encontrar, pode manter assim:**
- ✅ **PIX funciona via Checkout Pro** (redirecionamento)
- ✅ **Sistema já está funcionando perfeitamente**
- ✅ **Experiência do usuário boa** (página do MP para PIX)

### **Configuração atual (sem TEST-):**
```env
# Funciona perfeitamente assim:
MERCADOPAGO_ACCESS_TOKEN=APP_USR-seu-token
MERCADOPAGO_PUBLIC_KEY=APP_USR-sua-key
```

## 📱 **Screenshots que Ajudam:**

Quando entrar no painel, procure por:
- 📸 **Botões ou links** com "Payment", "API", "Checkout API"
- 📸 **Abas laterais** com configurações avançadas  
- 📸 **Seções** que falem sobre "integration" ou "development"

## 💬 **Se Não Encontrar:**

**Mande screenshot do seu painel** que eu te ajudo a navegar, ou simplesmente **mantenha como está** - PIX via Checkout Pro funciona muito bem! 🚀

---

## ✅ **Lembre-se:**

**Seu sistema JÁ está funcionando perfeitamente com PIX!**
- PIX transparente é apenas um "nice to have"
- Checkout Pro é amplamente usado e confiável
- Não há pressa para conseguir credenciais TEST-
