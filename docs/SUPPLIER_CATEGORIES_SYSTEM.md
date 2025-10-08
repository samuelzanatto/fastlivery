# Sistema de Categorias para Suppliers

Este documento descreve como usar o novo sistema de categorias hierárquicas para suppliers no Fastlivery.

## Visão Geral

O sistema permite que suppliers organizem seus produtos em categorias e subcategorias, facilitando a navegação e busca para os clientes.

### Funcionalidades Implementadas

1. **Categorias Hierárquicas**: Categorias principais e subcategorias
2. **Seletor de Categorias**: Componente reutilizável para seleção de categoria/subcategoria
3. **Categorias Padrão**: Sistema automatizado para criar categorias básicas
4. **Gerenciamento**: Interface completa para CRUD de categorias

## Estrutura do Banco de Dados

```sql
supplier_service_categories (
  id: string (PK)
  company_id: string (FK -> companies)
  name: string
  description: string?
  parent_id: string? (FK -> supplier_service_categories)
  order: int
  is_active: boolean
  created_at: timestamp
  updated_at: timestamp
)

supplier_services (
  ...
  category_id: string? (FK -> supplier_service_categories)
  category: string (nome da categoria para compatibilidade)
  sub_category: string? (nome da subcategoria)
  ...
)
```

## Componentes

### CategorySelector

Componente reutilizável para seleção de categoria e subcategoria:

```tsx
import { CategorySelector } from '@/components/supplier/category-selector'

<CategorySelector
  categoryId={form.categoryId}
  subCategoryId={form.subCategoryId}
  onCategoryChange={(id, name) => {
    // Atualiza categoria principal
  }}
  onSubCategoryChange={(id, name) => {
    // Atualiza subcategoria
  }}
  required={true}
/>
```

### SupplierProductDialog

Diálogo atualizado para criar/editar produtos usando o CategorySelector.

## Actions Disponíveis

### Categorias

```ts
// Buscar todas as categorias
const result = await getSupplierCategories(includeServiceCount)

// Buscar categorias hierárquicas (apenas pais com filhos)
const result = await getSupplierCategoriesHierarchy()

// Buscar subcategorias de uma categoria
const result = await getSupplierSubcategories(categoryId)

// Criar categoria
const result = await createSupplierCategory(data)

// Atualizar categoria
const result = await updateSupplierCategory(id, data)

// Deletar categoria
const result = await deleteSupplierCategory(id)

// Criar categorias padrão
const result = await createDefaultSupplierCategories()
```

### Produtos/Serviços

Os produtos agora incluem o campo `categoryId` que referencia a categoria selecionada:

```ts
const result = await createSupplierService({
  name: 'Nome do produto',
  category: 'Nome da categoria',
  categoryId: 'id-da-categoria',
  subCategory: 'Nome da subcategoria',
  // ... outros campos
})
```

## Categorias Padrão

O sistema inclui 16 categorias padrão organizadas hierarquicamente:

### Categorias Principais:
1. **Ingredientes** - Ingredientes e matérias-primas alimentícias
2. **Embalagens** - Embalagens e materiais de acondicionamento
3. **Equipamentos** - Equipamentos e utensílios para cozinha
4. **Serviços** - Serviços especializados

### Subcategorias:

**Ingredientes:**
- Temperos e Condimentos
- Proteínas  
- Laticínios
- Hortifruti

**Embalagens:**
- Delivery e Takeaway
- Armazenamento

**Equipamentos:**
- Cozinha
- Limpeza

**Serviços:**
- Consultoria
- Manutenção

## Como Usar

### 1. Criar Categorias Padrão

Na página `/supplier-categories`, se não houver categorias existentes, clique em "Criar Categorias Padrão".

### 2. Gerenciar Categorias

- Acesse `/supplier-categories`
- Use o botão "Nova Categoria" para criar categorias personalizadas
- Edite ou delete categorias existentes
- Reordene as categorias conforme necessário

### 3. Adicionar Produtos

- Acesse `/supplier-products`
- Clique em "Novo Produto"
- Use o seletor de categorias para escolher categoria e subcategoria
- O sistema salva tanto o ID da categoria quanto o nome para compatibilidade

## Páginas

- `/supplier-categories` - Gerenciamento de categorias
- `/supplier-products` - Gerenciamento de produtos (usa o CategorySelector)
- `/test-categories` - Página de teste (temporária)

## Fluxo de Dados

1. Supplier cria/seleciona categorias
2. Ao adicionar produto, seleciona categoria e subcategoria usando o CategorySelector
3. Sistema salva o produto com:
   - `categoryId`: ID da categoria/subcategoria selecionada
   - `category`: Nome da categoria principal
   - `subCategory`: Nome da subcategoria (se aplicável)

## Benefícios

1. **Organização**: Produtos bem organizados em categorias hierárquicas
2. **Busca**: Facilita filtros e busca por categoria
3. **UX**: Interface intuitiva com seletores em cascata
4. **Flexibilidade**: Permite categorias personalizadas além das padrão
5. **Compatibilidade**: Mantém campos de texto para compatibilidade com código existente

## Próximos Passos

1. Implementar filtros por categoria na listagem de produtos
2. Adicionar busca por categoria no marketplace
3. Implementar relatórios por categoria
4. Adicionar imagens às categorias
5. Implementar ordenação drag-and-drop das categorias