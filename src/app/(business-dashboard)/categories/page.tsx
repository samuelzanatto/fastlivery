'use client'

import { useState, useEffect, useCallback } from 'react'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
import { CategoryFormDialog } from '@/components/forms/category-form-dialog'
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
import { useBusinessId } from '@/stores/business-store'
import { notify } from '@/lib/notifications/notify'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  getCategories,
  deleteCategory,
  type Category
} from '@/actions/categories/categories'

// Extended category type with all necessary properties for the UI
interface ExtendedCategory extends Category {
  parentId?: string | null
  imageUrl?: string | null
  displayOrder?: number
  parent?: {
    id: string
    name: string
  } | null
  subcategories?: ExtendedCategory[]
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
  category: ExtendedCategory
  onEdit: (category: ExtendedCategory) => void
  onDelete: (category: ExtendedCategory) => void
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
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(category)}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
              disabled={category._count?.products ? category._count.products > 0 : false}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>
      </div>
    </TableCell>
  </TableRow>
)

export default function CategoriesPage() {
  const businessId = useBusinessId()
  const [categories, setCategories] = useState<ExtendedCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [itemsPerPage, setItemsPerPage] = useState('10')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [deletingCategory, setDeletingCategory] = useState<ExtendedCategory | null>(null)

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
  const allCategoriesFlat = mainCategories.reduce<ExtendedCategory[]>((acc, mainCat) => {
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
    if (!businessId) return
    
    try {
      const result = await getCategories()
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao carregar categorias')
      }
      
      // Transformar dados da Server Action para o formato da página
      const transformedCategories = result.data.map((cat: Category) => ({
        ...cat,
        parentId: undefined, // Not available in current Category type
        imageUrl: undefined, // Not available in current Category type
        displayOrder: cat.order || 0,
        parent: undefined, // Not available in current Category type
        subcategories: [], // Not available in current Category type
      })) as ExtendedCategory[]
      
      setCategories(transformedCategories)
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
      notify('error', 'Erro ao carregar categorias')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return

    if (deletingCategory._count?.products && deletingCategory._count.products > 0) {
      notify('error', 'Não é possível deletar uma categoria que possui produtos')
      return
    }

    try {
      const result = await deleteCategory(deletingCategory.id)

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

  useEffect(() => {
    if (businessId) {
      fetchCategories()
    }
  }, [businessId, fetchCategories])

  // Loading screen similar to other pages - only when business is loading
  if (!businessId && loading) {
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
        title="Categorias"
        description="Organize seus produtos em categorias para facilitar a navegação"
      >
        <CategoryFormDialog
          businessId={businessId || ''}
          categories={categories}
          onSuccess={fetchCategories}
        >
          <DashboardHeaderButton>
            <Plus className="h-4 w-4 mr-2" />
            Nova Categoria
          </DashboardHeaderButton>
        </CategoryFormDialog>
      </DashboardHeader>

      {/* Filters and Search */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar categorias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap">Itens por página:</span>
              <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
                <SelectTrigger className="w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando categorias...</p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria cadastrada'}
              </h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? 'Tente ajustar o termo de busca'
                  : 'Crie sua primeira categoria para organizar seus produtos'
                }
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm border-b">
                  <TableRow>
                    <TableHead className="w-[40px] bg-white"></TableHead>
                    <TableHead className="font-medium bg-white">Nome</TableHead>
                    <TableHead className="font-medium w-[120px] bg-white">Produtos</TableHead>
                    <TableHead className="font-medium w-[100px] bg-white">Ordem</TableHead>
                    <TableHead className="font-medium w-[100px] bg-white">Status</TableHead>
                    <TableHead className="font-medium w-[100px] bg-white">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCategories.map((category) => (
                    <React.Fragment key={category.id}>
                      <TableRow 
                        className="hover:bg-gray-50 cursor-pointer"
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
                            {category._count?.products || 0}
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
                            <CategoryFormDialog
                              businessId={businessId || ''}
                              categories={categories}
                              category={{
                                id: category.id,
                                name: category.name,
                                description: category.description,
                                parentId: category.parentId,
                                isActive: category.isActive ?? true,
                                order: category.order ?? category.displayOrder,
                                image: category.imageUrl || undefined
                              }}
                              onSuccess={fetchCategories}
                            >
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </CategoryFormDialog>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => setDeletingCategory(category)}
                              disabled={(category._count?.products || 0) > 0}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {expandedRows.has(category.id) && (
                        <ExpandedCategoryRow
                          category={category}
                          onEdit={() => {/* Edição será feita pelo CategoryFormDialog */}}
                          onDelete={setDeletingCategory}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-gray-600">
                    Mostrando {startIndex + 1} a {Math.min(endIndex, filteredCategories.length)} de{' '}
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
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar a categoria &quot;{deletingCategory?.name}&quot;?
              Esta ação não pode ser desfeita.
              {deletingCategory && deletingCategory._count?.products && deletingCategory._count.products > 0 && (
                <span className="block mt-2 text-red-600 font-medium">
                  Esta categoria possui {deletingCategory._count.products} produto(s) e não pode ser deletada.
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
              disabled={deletingCategory ? deletingCategory._count?.products ? deletingCategory._count.products > 0 : false : false}
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
