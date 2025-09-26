# Sistema Híbrido de APIs v2

Este diretório contém APIs híbridas que envolvem Server Actions existentes para fornecer endpoints HTTP tradicionais. Isso permite compatibilidade com aplicações nativas futuras enquanto mantém os benefícios das Server Actions para a aplicação web.

## Estrutura

```
/api/v2/
├── products/route.ts       # CRUD de produtos
├── orders/route.ts         # Gestão de pedidos
├── restaurants/route.ts    # Gestão de restaurantes  
├── chats/route.ts          # Sistema de chat
├── employees/route.ts      # Gestão de funcionários
└── profile/route.ts        # Perfil do usuário (placeholder)
```

## Padrão de Implementação

Cada endpoint híbrido segue este padrão:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { serverAction } from '@/actions/module/actions'

export async function GET(request: NextRequest) {
  try {
    const result = await serverAction()
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === 'UNAUTHORIZED' ? 401 : 400 }
      )
    }
    
    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Erro na API híbrida:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
```

## Endpoints Disponíveis

### Produtos - `/api/v2/products`
- **GET**: Listar produtos do restaurante
- **POST**: Criar novo produto

### Pedidos - `/api/v2/orders`
- **GET**: Listar pedidos do restaurante
- **POST**: Criar novo pedido
- **PATCH**: Atualizar status do pedido

### Restaurantes - `/api/v2/restaurants`
- **GET**: Obter dados do meu restaurante
- **POST**: Criar novo restaurante
- **PATCH**: Atualizar meu restaurante

### Chat - `/api/v2/chats`
- **GET**: Obter conversas
- **POST**: Enviar mensagem
- **PATCH**: Marcar mensagens como lidas

### Funcionários - `/api/v2/employees`
- **GET**: Listar funcionários
- **POST**: Criar funcionário
- **PATCH**: Atualizar funcionário

### Perfil - `/api/v2/profile`
- **GET**: Obter perfil (não implementado)
- **PATCH**: Atualizar perfil (não implementado)

## Autenticação

Todas as APIs herdam a autenticação das Server Actions subjacentes através dos wrappers:
- `withAuth`: Autenticação básica de usuário
- `withRestaurant`: Autenticação + contexto do restaurante
- `withLimitCheck`: Verificação de limites de uso

## Tratamento de Erros

O sistema usa códigos de erro padronizados:
- `200`: Sucesso
- `201`: Criado com sucesso
- `400`: Erro de validação/dados
- `401`: Não autorizado
- `500`: Erro interno do servidor
- `501`: Não implementado

## Benefícios

1. **Compatibilidade**: Permite acesso HTTP tradicional para aplicações nativas
2. **Reutilização**: Aproveita toda a lógica existente das Server Actions
3. **Consistência**: Mantém o mesmo comportamento de autenticação e validação
4. **Manutenibilidade**: Uma única fonte de verdade para a lógica de negócio

## Uso Futuro

Este sistema será a base para:
- APIs para aplicações mobile nativas (React Native, Flutter)
- Integrações com sistemas externos
- Webhooks e automações
- Ferramentas de administração externas

## Considerações Técnicas

- As Server Actions são chamadas diretamente, não através de HTTP
- A autenticação é tratada pelos wrappers das Server Actions
- Os parâmetros de contexto (como `restaurantId`) são injetados automaticamente
- Erros são tratados de forma consistente com o padrão `ActionResult`