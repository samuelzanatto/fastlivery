'use client'

import { useState, useEffect, useCallback } from 'react'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { SupplierCategoryFormDialog } from '@/components/forms/supplier-category-form-dialog'
import { DashboardHeader, DashboardHeaderButton } from '@/components/ui/dashboard-header'
import { 
  Plus,
  Edit,
  Trash2,
  Search,
  Package,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { useSession } from '@/lib/auth/auth-client'
import { useRouter } from 'next/navigation'
import { notify } from '@/lib/notifications/notify'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  getSupplierCategories,
  deleteSupplierCategory,
  createDefaultSupplierCategories,
  type SupplierCategory
} from '@/actions/supplier-categories/supplier-categories'

// Extended category type with all necessary properties for the UI
interface ExtendedSupplierCategory extends SupplierCategory {
  imageUrl?: string | null
  displayOrder?: number
}

const StatusBadge = ({ isActive }: { isActive: boolean }) => (
  <Badge variant={isActive ? "default" : "secondary"} className={cn(
    "font-medium",
    isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
  )}>
    {isActive ? "Ativo" : "Inativo"}
  </Badge>
)

const ExpandedCategoryRow = ({ category, onEdit, onDelete }: {
  category: ExtendedSupplierCategory
  onEdit: (category: ExtendedSupplierCategory) => void
  onDelete: (category: ExtendedSupplierCategory) => void
}) => (
  <TableRow>
    <TableCell colSpan={6} className="p-0">
      <div className="px-6 py-4 bg-white border-t">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-medium text-sm text-gray-900 mb-1">Descrição</h4>
            <p className="text-sm text-gray-600">
              {category.description || 'Nenhuma descrição'}
            </p>
          </div>
          
          {category.imageUrl && (
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-1">Imagem</h4>
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                <Image 
                  src={category.imageUrl} 
                  alt={category.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(category)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(category)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Deletar
            </Button>
          </div>
        </div>
      </div>
    </TableCell>
  </TableRow>
)

export default function SupplierCategoriesPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [categories, setCategories] = useState<ExtendedSupplierCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [itemsPerPage, setItemsPerPage] = useState('10')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [deletingCategory, setDeletingCategory] = useState<ExtendedSupplierCategory | null>(null)

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login')
    }
  }, [session, isPending, router])

  const toggleRowExpansion = (categoryId: string) => {
    const newExpandedRows = new Set(expandedRows)
    if (newExpandedRows.has(categoryId)) {
      newExpandedRows.delete(categoryId)
    } else {
      newExpandedRows.add(categoryId)
    }
    setExpandedRows(newExpandedRows)
  }

  // Separar categorias principais e todas as categorias para exibição hierárquica
  const mainCategories = categories.filter(cat => !cat.parentId)
  
  // Adicionar subcategorias às categorias principais
  mainCategories.forEach(mainCat => {
    mainCat.subcategories = categories.filter(cat => cat.parentId === mainCat.id)
  })

  // Criar lista plana para paginação e busca
  const allCategoriesFlat = mainCategories.reduce<ExtendedSupplierCategory[]>((acc, mainCat) => {
    acc.push(mainCat)
    if (mainCat.subcategories && mainCat.subcategories.length > 0) {
      acc.push(...mainCat.subcategories)
    }
    return acc
  }, [])

  const filteredCategories = allCategoriesFlat.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  )

  const startIndex = (currentPage - 1) * parseInt(itemsPerPage)
  const endIndex = startIndex + parseInt(itemsPerPage)
  const paginatedCategories = filteredCategories.slice(startIndex, endIndex)
  const totalPages = Math.ceil(filteredCategories.length / parseInt(itemsPerPage))

  const fetchCategories = useCallback(async () => {
    if (!session) return
    
    try {
      const result = await getSupplierCategories(true)
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao carregar categorias')
      }

      // Transformar dados da Server Action para o formato da página
      const transformedCategories = result.data.map((cat: SupplierCategory) => ({
        ...cat,
        imageUrl: undefined, // Not available in current SupplierCategory type
        displayOrder: cat.order || 0,
      })) as ExtendedSupplierCategory[]
      
      setCategories(transformedCategories)
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
      notify('error', 'Erro ao carregar categorias')
    } finally {
      setLoading(false)
    }
  }, [session])

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return

    if (deletingCategory._count?.services && deletingCategory._count.services > 0) {
      notify('error', 'Não é possível deletar uma categoria que possui produtos/serviços')
      return
    }

    try {
      const result = await deleteSupplierCategory(deletingCategory.id)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao deletar categoria')
      }

      notify('success', 'Categoria deletada com sucesso')
      fetchCategories()
    } catch (error) {
      console.error('Erro ao deletar categoria:', error)
      notify('error', error instanceof Error ? error.message : 'Erro ao deletar categoria')
    } finally {
      setDeletingCategory(null)
    }
  }

  const handleCreateDefaultCategories = async () => {
    try {
      const result = await createDefaultSupplierCategories()
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar categorias padrão')
      }

      notify('success', `${result.data.count} categorias padrão criadas com sucesso`)
      fetchCategories()
    } catch (error) {
      console.error('Erro ao criar categorias padrão:', error)
      notify('error', error instanceof Error ? error.message : 'Erro ao criar categorias padrão')
    }
  }

  useEffect(() => {
    if (session) {
      fetchCategories()
    }
  }, [session, fetchCategories])

  // Loading screen similar to other pages - only when session is loading
  if (!session && loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
        <div className="h-64 bg-slate-100 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <DashboardHeader
        title="Categorias de Produtos"
        description="Organize seus produtos em categorias para facilitar a navegação"
      >
        <SupplierCategoryFormDialog
          categories={categories}
          onSuccess={fetchCategories}
        >
          <DashboardHeaderButton>
            <Plus className="h-4 w-4 mr-2" />
            Nova Categoria
          </DashboardHeaderButton>
        </SupplierCategoryFormDialog>
      </DashboardHeader>

      {/* Filters and Search */}
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar categorias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 sm:w-auto w-full">
              <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Itens por página" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 por página</SelectItem>
                  <SelectItem value="10">10 por página</SelectItem>
                  <SelectItem value="20">20 por página</SelectItem>
                  <SelectItem value="50">50 por página</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-slate-600">Carregando categorias...</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Produtos</TableHead>
                      <TableHead>Ordem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCategories.length > 0 ? (
                      paginatedCategories.map((category) => [
                        <TableRow
                          key={category.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleRowExpansion(category.id)}
                        >
                          <TableCell className="w-[40px]">
                            {expandedRows.has(category.id) ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              {/* Indicador visual de subcategoria */}
                              {category.parentId && (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 border-l-2 border-gray-300 border-b-2 h-4"></div>
                                </div>
                              )}
                              {category.imageUrl && (
                                <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                                  <Image 
                                    src={category.imageUrl} 
                                    alt={category.name}
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900">{category.name}</p>
                                  {category.parentId && (
                                    <Badge variant="outline" className="text-xs px-2 py-0">
                                      Subcategoria
                                    </Badge>
                                  )}
                                </div>
                                {category.parent && (
                                  <p className="text-xs text-gray-500">
                                    Pai: {category.parent.name}
                                  </p>
                                )}
                                {category.description && (
                                  <p className="text-sm text-gray-600 truncate max-w-[200px]">
                                    {category.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-medium">
                              {category._count?.services || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">#{category.displayOrder}</span>
                          </TableCell>
                          <TableCell>
                            <StatusBadge isActive={true} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <SupplierCategoryFormDialog
                                categories={categories}
                                category={{
                                  id: category.id,
                                  name: category.name,
                                  description: category.description,
                                  parentId: category.parentId,
                                  isActive: category.isActive ?? true,
                                  order: category.order ?? category.displayOrder,
                                }}
                                onSuccess={fetchCategories}
                              >
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </SupplierCategoryFormDialog>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeletingCategory(category)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>,
                        expandedRows.has(category.id) && (
                          <ExpandedCategoryRow
                            key={`${category.id}-expanded`}
                            category={category}
                            onEdit={(_cat) => {
                              // Implementar edição inline se necessário
                            }}
                            onDelete={(cat) => setDeletingCategory(cat)}
                          />
                        )
                      ]).flat()
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 font-medium">Nenhuma categoria encontrada</p>
                          <p className="text-gray-500 text-sm mt-1 mb-4">
                            {searchTerm
                              ? 'Tente ajustar sua busca ou criar uma nova categoria.'
                              : 'Comece criando sua primeira categoria de produtos.'}
                          </p>
                          {!searchTerm && categories.length === 0 && (
                            <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
                              <Button
                                onClick={handleCreateDefaultCategories}
                                variant="outline"
                                className="flex items-center gap-2"
                              >
                                <Package className="h-4 w-4" />
                                Criar Categorias Padrão
                              </Button>
                              <span className="text-gray-400 text-sm">ou</span>
                              <SupplierCategoryFormDialog
                                categories={categories}
                                onSuccess={fetchCategories}
                              >
                                <Button className="flex items-center gap-2">
                                  <Plus className="h-4 w-4" />
                                  Nova Categoria
                                </Button>
                              </SupplierCategoryFormDialog>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {filteredCategories.length > parseInt(itemsPerPage) && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {filteredCategories.length} categoria(s)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-gray-600">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar a categoria &quot;{deletingCategory?.name}&quot;?
              Esta ação não pode ser desfeita.
              {deletingCategory && deletingCategory._count?.services && deletingCategory._count.services > 0 && (
                <span className="block mt-2 text-red-600 font-medium">
                  Esta categoria possui {deletingCategory._count.services} produto(s)/serviço(s) e não pode ser deletada.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingCategory(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-red-600 hover:bg-red-700"
              disabled={deletingCategory ? deletingCategory._count?.services ? deletingCategory._count.services > 0 : false : false}
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}