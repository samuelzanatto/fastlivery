# Sistema de Categorias para Suppliers

## Visão Geral

O sistema de categorias para suppliers permite que fornecedores organizem seus produtos/serviços em uma estrutura hierárquica similar ao sistema usado pelas empresas de delivery.

## Funcionalidades Implementadas

### ✅ Estrutura de Dados
- **Modelo `SupplierServiceCategory`** no Prisma
- **Relacionamento hierárquico** (categorias principais e subcategorias)
- **Integração com `SupplierService`** (produtos dos suppliers)
- **Migração de banco** criada e executada

### ✅ Backend (Actions)
- **CRUD completo** em `/src/actions/supplier-categories/supplier-categories.ts`
- **Validação com Zod** para dados de entrada
- **Verificações de integridade** (não permite deletar categorias com produtos)
- **Autenticação e autorização** usando `withCompany`

### ✅ Frontend (Páginas e Componentes)
- **Página principal** em `/src/app/(supplier-dashboard)/supplier-categories/page.tsx`
- **Formulário de categoria** em `/src/components/forms/supplier-category-form-dialog.tsx`
- **Interface responsiva** com tabela, paginação e busca
- **Navegação integrada** no sidebar do supplier dashboard

### ✅ Características da Interface
- **Tabs para criação**: Categoria Principal vs Subcategoria
- **Hierarquia visual**: Indicadores visuais para subcategorias
- **Expansão de linhas**: Detalhes adicionais clicáveis
- **Filtros e busca**: Busca por nome e descrição
- **Paginação**: Configurável (5, 10, 20, 50 itens por página)
- **Confirmação de exclusão**: Dialog de confirmação com validações

## Estrutura de Arquivos

```
src/
├── actions/supplier-categories/
│   └── supplier-categories.ts          # Actions do backend
├── app/(supplier-dashboard)/
│   └── supplier-categories/
│       └── page.tsx                    # Página principal
├── components/forms/
│   └── supplier-category-form-dialog.tsx  # Formulário de categoria
└── components/layout/
    └── supplier-layout-ui.tsx         # Navegação atualizada

prisma/
├── schema.prisma                       # Modelo SupplierServiceCategory
└── migrations/
    └── 20241007192957_add_supplier_service_categories/
        └── migration.sql              # Migração executada

scripts/
└── seed-supplier-categories.sql       # Script para categorias padrão
```

## Como Usar

### 1. Acessar o Sistema
- Login como supplier
- Navegar para **"Categorias"** no menu lateral
- Ícone: 📁 FolderTree

### 2. Criar Categoria Principal
- Clicar em **"Nova Categoria"**
- Selecionar tab **"Categoria Principal"**
- Preencher nome, descrição (opcional), ordem
- Salvar

### 3. Criar Subcategoria
- Clicar em **"Nova Categoria"**
- Selecionar tab **"Subcategoria"**
- Escolher categoria principal
- Preencher dados e salvar

### 4. Gerenciar Categorias
- **Editar**: Clique no ícone de lápis
- **Excluir**: Clique no ícone de lixeira (só se não tiver produtos)
- **Ver detalhes**: Clique na linha para expandir
- **Buscar**: Use o campo de busca no topo
- **Paginar**: Use os controles na parte inferior

## Validações Implementadas

### ✅ Regras de Negócio
- Categoria não pode ser pai de si mesma
- Categorias com produtos não podem ser excluídas
- Categorias com subcategorias não podem ser excluídas
- Ordem deve ser um número positivo
- Nome é obrigatório (1-100 caracteres)

### ✅ Segurança
- Autenticação obrigatória
- Suppliers só veem suas próprias categorias
- Validação de dados no backend
- Sanitização de inputs

## Banco de Dados

### Tabela: `supplier_service_categories`
```sql
CREATE TABLE "supplier_service_categories" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_service_categories_pkey" PRIMARY KEY ("id")
);
```

### Relacionamentos
- **Company** (1:N) - Uma empresa pode ter várias categorias
- **SupplierServiceCategory** (1:N) - Hierarquia pai/filhos
- **SupplierService** (N:1) - Produtos pertencem a uma categoria

## API / Actions

### `getSupplierCategories(includeServiceCount?: boolean)`
- Retorna todas as categorias do supplier
- Opcionalmente inclui contagem de produtos

### `createSupplierCategory(input: SupplierCategoryCreateInput)`
- Cria nova categoria
- Auto-incrementa ordem se não fornecida

### `updateSupplierCategory(id: string, input: SupplierCategoryUpdateInput)`
- Atualiza categoria existente
- Valida relações pai/filho

### `deleteSupplierCategory(id: string)`
- Exclui categoria
- Valida se não há produtos ou subcategorias

### `reorderSupplierCategories(orders: Array<{id: string, order: number}>)`
- Reordena múltiplas categorias
- Execução em transação

## Próximos Passos (Opcional)

### 🔄 Melhorias Futuras
1. **Drag & Drop** para reordenação
2. **Imagens de categoria** (upload de ícones)
3. **Importação/Exportação** em massa
4. **Analytics por categoria** (produtos mais vendidos por categoria)
5. **Templates de categorias** por tipo de supplier
6. **Integração com busca** do marketplace

### 🔗 Integrações Necessárias
1. **Atualizar SupplierProductDialog** para usar categorias
2. **Filtros no marketplace** por categoria de supplier
3. **Relatórios de vendas** agrupados por categoria

## Testes

### ✅ Cenários Testados
- [x] Criação de categoria principal
- [x] Criação de subcategoria
- [x] Edição de categorias
- [x] Exclusão com validações
- [x] Hierarquia visual
- [x] Busca e paginação
- [x] Responsividade

### 🧪 Testes Automáticos (Recomendado)
```typescript
// Exemplo de teste unitário
describe('SupplierCategories', () => {
  it('should create main category', async () => {
    const result = await createSupplierCategory({
      name: 'Ingredientes',
      description: 'Ingredientes alimentícios'
    });
    expect(result.success).toBe(true);
  });
});
```

## Conclusão

O sistema de categorias para suppliers está completamente implementado e funcional, oferecendo uma experiência similar ao sistema usado pelas empresas de delivery, mas adaptado para as necessidades específicas dos fornecedores no marketplace B2B.

**Status: ✅ COMPLETO E FUNCIONAL**