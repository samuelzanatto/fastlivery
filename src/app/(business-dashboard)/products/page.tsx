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
import { ProductFormDialog } from '@/components/forms/product-form-dialog'
import { ProductViewDialog } from '@/components/forms/product-view-dialog'
import { DashboardHeader, DashboardHeaderButton } from '@/components/ui/dashboard-header'
import { 
  Plus,
  Edit,
  Trash2,
  Search,
  Package,
  ChevronDown,
  ChevronRight,
  Eye
} from 'lucide-react'
import { useBusinessId } from '@/stores/business-store'
import { useBusinessContext } from '@/hooks/business/use-business-context'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { getProducts, deleteProduct } from '@/actions/products/products'
import { getCategories } from '@/actions/categories/categories'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  categoryId: string
  image: string | null
  isAvailable: boolean
  category: {
    id: string
    name: string
  }
  options?: Array<{
    id: string
    name: string
    description?: string
    price: number
    isRequired: boolean
    maxOptions: number
    options: Array<{
      id: string
      name: string
      price: number
    }>
  }>
}

interface Category {
  id: string
  name: string
}

const StatusBadge = ({ isAvailable }: { isAvailable: boolean }) => (
  <Badge variant={isAvailable ? "default" : "secondary"} className={cn(
    "font-medium",
    isAvailable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
  )}>
    {isAvailable ? "Disponível" : "Indisponível"}
  </Badge>
)

const PriceBadge = ({ price }: { price: number }) => (
  <Badge variant="outline" className="font-medium text-green-700 border-green-200">
    {new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price)}
  </Badge>
)

const CategoryBadge = ({ category }: { category: string }) => (
  <Badge variant="outline" className="font-medium">
    {category}
  </Badge>
)

const ExpandedProductRow = ({ product, categories, businessId, onDelete, onSuccess, canEdit, canDelete }: {
  product: Product
  categories: Category[]
  businessId: string
  onDelete: (product: Product) => void
  onSuccess: () => void
  canEdit: boolean
  canDelete: boolean
}) => (
  <TableRow>
    <TableCell colSpan={6} className="p-0">
      <div className="px-6 py-4 bg-white border-t">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-medium text-sm text-gray-900 mb-1">Descrição</h4>
            <p className="text-sm text-gray-600">
              {product.description || 'Nenhuma descrição'}
            </p>
          </div>
          
          {product.image && (
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-1">Imagem</h4>
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                <Image 
                  src={product.image} 
                  alt={product.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-end gap-2">
            <ProductViewDialog
              product={{
                id: product.id,
                name: product.name,
                description: product.description || undefined,
                price: product.price,
                image: product.image || undefined,
                category: product.category,
                isAvailable: product.isAvailable,
                options: product.options
              }}
            >
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Visualizar
              </Button>
            </ProductViewDialog>
            {canEdit && (
              <ProductFormDialog
                businessId={businessId}
                categories={categories}
                product={{
                  id: product.id,
                  name: product.name,
                  description: product.description || undefined,
                  price: product.price,
                  categoryId: product.categoryId,
                  isAvailable: product.isAvailable,
                  image: product.image || undefined
                }}
                onSuccess={onSuccess}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
              </ProductFormDialog>
            )}
            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(product)}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            )}
          </div>
        </div>
      </div>
    </TableCell>
  </TableRow>
)

export default function ProductsPage() {
  const businessId = useBusinessId()
  const { hasPermission } = useBusinessContext()
  
  // Verificar permissões
  const canCreate = hasPermission('products', 'create') || hasPermission('products', 'manage')
  const canEdit = hasPermission('products', 'update') || hasPermission('products', 'manage')
  const canDelete = hasPermission('products', 'delete') || hasPermission('products', 'manage')
  
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [itemsPerPage, setItemsPerPage] = useState('10')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)

  const toggleRowExpansion = (productId: string) => {
    const newExpandedRows = new Set(expandedRows)
    if (newExpandedRows.has(productId)) {
      newExpandedRows.delete(productId)
    } else {
      newExpandedRows.add(productId)
    }
    setExpandedRows(newExpandedRows)
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      product.category.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = categoryFilter === 'all' || product.categoryId === categoryFilter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'available' && product.isAvailable) ||
      (statusFilter === 'unavailable' && !product.isAvailable)
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  const startIndex = (currentPage - 1) * parseInt(itemsPerPage)
  const endIndex = startIndex + parseInt(itemsPerPage)
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)
  const totalPages = Math.ceil(filteredProducts.length / parseInt(itemsPerPage))

  const fetchProducts = useCallback(async () => {
    if (!businessId) return

    try {
      const result = await getProducts()
      if (result.success) {
        // Converte os produtos do server para o formato local
        const convertedProducts = result.data.map(product => ({
          ...product,
          category: product.category || { id: '', name: 'Sem categoria' }
        })) as Product[]
        setProducts(convertedProducts)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  const fetchCategories = useCallback(async () => {
    if (!businessId) return

    try {
      const result = await getCategories()
      if (!result.success) {
        throw new Error(result.error)
      }

      setCategories(result.data)
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
      toast.error('Erro ao carregar categorias')
    }
  }, [businessId])

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return

    try {
      const result = await deleteProduct(deletingProduct.id)
      
      if (result.success) {
        toast.success('Produto deletado com sucesso')
        fetchProducts()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Erro ao deletar produto:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao deletar produto')
    } finally {
      setDeletingProduct(null)
    }
  }

  useEffect(() => {
    if (businessId) {
      fetchProducts()
      fetchCategories()
    }
  }, [businessId, fetchProducts, fetchCategories])

  if (!businessId) {
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
        title="Produtos"
        description={canCreate ? "Gerencie o cardápio do seu restaurante" : "Visualize o cardápio do restaurante"}
      >
        {canCreate && (
          <ProductFormDialog
            businessId={businessId}
            categories={categories}
            onSuccess={fetchProducts}
          >
            <DashboardHeaderButton>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </DashboardHeaderButton>
          </ProductFormDialog>
        )}
      </DashboardHeader>



      {/* Filters and Search */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="available">Disponível</SelectItem>
                  <SelectItem value="unavailable">Indisponível</SelectItem>
                </SelectContent>
              </Select>
              
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
              <p className="mt-2 text-gray-600">Carregando produtos...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all' 
                  ? 'Nenhum produto encontrado' 
                  : 'Nenhum produto cadastrado'
                }
              </h3>
              <p className="text-gray-600">
                {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece adicionando produtos ao seu cardápio'
                }
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm border-b">
                  <TableRow>
                    <TableHead className="w-[40px] bg-white"></TableHead>
                    <TableHead className="font-medium bg-white">Produto</TableHead>
                    <TableHead className="font-medium w-[120px] bg-white">Preço</TableHead>
                    <TableHead className="font-medium w-[140px] bg-white">Categoria</TableHead>
                    <TableHead className="font-medium w-[120px] bg-white">Status</TableHead>
                    <TableHead className="font-medium w-[120px] bg-white">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.map((product) => (
                    <React.Fragment key={product.id}>
                      <TableRow 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleRowExpansion(product.id)}
                      >
                        <TableCell className="w-[40px]">
                          {expandedRows.has(product.id) ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            {product.image && (
                              <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                                <Image 
                                  src={product.image} 
                                  alt={product.name}
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{product.name}</p>
                              {product.description && (
                                <p className="text-sm text-gray-600 truncate max-w-[300px]">
                                  {product.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <PriceBadge price={product.price} />
                        </TableCell>
                        <TableCell>
                          <CategoryBadge category={product.category.name} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge isAvailable={product.isAvailable} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <ProductViewDialog
                              product={{
                                id: product.id,
                                name: product.name,
                                description: product.description || undefined,
                                price: product.price,
                                image: product.image || undefined,
                                category: product.category,
                                isAvailable: product.isAvailable,
                                options: product.options
                              }}
                            >
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </ProductViewDialog>
                            {canEdit && (
                            <ProductFormDialog
                              businessId={businessId}
                              categories={categories}
                              product={{
                                id: product.id,
                                name: product.name,
                                description: product.description || undefined,
                                price: product.price,
                                categoryId: product.categoryId,
                                isAvailable: product.isAvailable,
                                image: product.image || undefined
                              }}
                              onSuccess={fetchProducts}
                            >
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </ProductFormDialog>
                            )}
                            {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => setDeletingProduct(product)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {expandedRows.has(product.id) && (
                        <ExpandedProductRow
                          product={product}
                          categories={categories}
                          businessId={businessId}
                          onDelete={setDeletingProduct}
                          onSuccess={fetchProducts}
                          canEdit={canEdit}
                          canDelete={canDelete}
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
                    Mostrando {startIndex + 1} a {Math.min(endIndex, filteredProducts.length)} de{' '}
                    {filteredProducts.length} produto(s)
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
      <AlertDialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o produto &quot;{deletingProduct?.name}&quot;?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingProduct(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="bg-red-600 hover:bg-red-700"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
