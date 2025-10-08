import { prisma } from '@/lib/database/prisma'

export interface DefaultCategory {
  id: string
  name: string
  description: string
  parentId?: string
  order: number
}

export const defaultSupplierCategories: DefaultCategory[] = [
  // Categorias principais
  {
    id: 'cat_ingredients',
    name: 'Ingredientes',
    description: 'Ingredientes e matérias-primas alimentícias',
    order: 1
  },
  {
    id: 'cat_packaging',
    name: 'Embalagens',
    description: 'Embalagens e materiais de acondicionamento',
    order: 2
  },
  {
    id: 'cat_equipment',
    name: 'Equipamentos',
    description: 'Equipamentos e utensílios para cozinha',
    order: 3
  },
  {
    id: 'cat_services',
    name: 'Serviços',
    description: 'Serviços especializados',
    order: 4
  },
  
  // Subcategorias de Ingredientes
  {
    id: 'subcat_spices',
    name: 'Temperos e Condimentos',
    description: 'Temperos, especiarias e condimentos',
    parentId: 'cat_ingredients',
    order: 1
  },
  {
    id: 'subcat_proteins',
    name: 'Proteínas',
    description: 'Carnes, peixes e proteínas vegetais',
    parentId: 'cat_ingredients',
    order: 2
  },
  {
    id: 'subcat_dairy',
    name: 'Laticínios',
    description: 'Leites, queijos e derivados',
    parentId: 'cat_ingredients',
    order: 3
  },
  {
    id: 'subcat_vegetables',
    name: 'Hortifruti',
    description: 'Frutas, verduras e legumes',
    parentId: 'cat_ingredients',
    order: 4
  },
  
  // Subcategorias de Embalagens
  {
    id: 'subcat_takeaway',
    name: 'Delivery e Takeaway',
    description: 'Embalagens para delivery e takeaway',
    parentId: 'cat_packaging',
    order: 1
  },
  {
    id: 'subcat_storage',
    name: 'Armazenamento',
    description: 'Embalagens para armazenamento e conservação',
    parentId: 'cat_packaging',
    order: 2
  },
  
  // Subcategorias de Equipamentos
  {
    id: 'subcat_kitchen',
    name: 'Cozinha',
    description: 'Equipamentos de cozinha e preparo',
    parentId: 'cat_equipment',
    order: 1
  },
  {
    id: 'subcat_cleaning',
    name: 'Limpeza',
    description: 'Equipamentos de limpeza e higienização',
    parentId: 'cat_equipment',
    order: 2
  },
  
  // Subcategorias de Serviços
  {
    id: 'subcat_consulting',
    name: 'Consultoria',
    description: 'Consultoria e assessoria especializada',
    parentId: 'cat_services',
    order: 1
  },
  {
    id: 'subcat_maintenance',
    name: 'Manutenção',
    description: 'Serviços de manutenção e reparo',
    parentId: 'cat_services',
    order: 2
  }
]

/**
 * Cria categorias padrão para um supplier recém-criado
 */
export async function createDefaultSupplierCategories(companyId: string) {
  try {
    // Verificar se já existem categorias para esta company
    const existingCategories = await prisma.supplierServiceCategory.count({
      where: { companyId }
    })

    if (existingCategories > 0) {
      console.log(`Company ${companyId} já possui categorias. Pulando criação.`)
      return { success: true, message: 'Categorias já existem' }
    }

    // Mapa para armazenar IDs reais das categorias criadas
    const categoryIdMap: Record<string, string> = {}

    // Criar categorias principais primeiro
    const mainCategories = defaultSupplierCategories.filter(cat => !cat.parentId)
    
    for (const category of mainCategories) {
      const created = await prisma.supplierServiceCategory.create({
        data: {
          companyId,
          name: category.name,
          description: category.description,
          parentId: null,
          order: category.order,
          isActive: true
        }
      })
      categoryIdMap[category.id] = created.id
    }

    // Criar subcategorias
    const subCategories = defaultSupplierCategories.filter(cat => cat.parentId)
    
    for (const category of subCategories) {
      const parentRealId = categoryIdMap[category.parentId!]
      if (!parentRealId) {
        console.warn(`Categoria pai ${category.parentId} não encontrada para ${category.name}`)
        continue
      }

      await prisma.supplierServiceCategory.create({
        data: {
          companyId,
          name: category.name,
          description: category.description,
          parentId: parentRealId,
          order: category.order,
          isActive: true
        }
      })
    }

    console.log(`Criadas ${defaultSupplierCategories.length} categorias padrão para company ${companyId}`)
    
    return { 
      success: true, 
      message: `${defaultSupplierCategories.length} categorias criadas com sucesso` 
    }

  } catch (error) {
    console.error('Erro ao criar categorias padrão:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }
  }
}

/**
 * Remove todas as categorias de um supplier (para testes)
 */
export async function removeAllSupplierCategories(companyId: string) {
  try {
    await prisma.supplierServiceCategory.deleteMany({
      where: { companyId }
    })
    
    return { success: true, message: 'Todas as categorias foram removidas' }
  } catch (error) {
    console.error('Erro ao remover categorias:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }
  }
}