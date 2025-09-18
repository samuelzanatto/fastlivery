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
import { AdditionalFormDialog } from '@/components/additional-form-dialog'
import { 
  Plus,
  Edit,
  Trash2,
  Search,
  Settings
} from 'lucide-react'
import { useRestaurantContext } from '@/hooks/useRestaurantContext'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AdditionalItem {
  id: string
  name: string
  price: number
}

interface Additional {
  id: string
  name: string
  description?: string | null
  price: number
  isRequired: boolean
  maxOptions: number
  options: AdditionalItem[]
}

interface ApiAdditional {
  id: string
  name: string
  description?: string | null
  price: number
  isRequired: boolean
  maxOptions: number
  items: AdditionalItem[]
}

const StatusBadge = ({ isRequired }: { isRequired: boolean }) => (
  <Badge variant={isRequired ? "default" : "secondary"} className={cn(
    "font-medium",
    isRequired ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
  )}>
    {isRequired ? "Obrigatório" : "Opcional"}
  </Badge>
)

const PriceBadge = ({ price }: { price: number }) => (
  <Badge variant="outline" className="font-medium text-green-700 border-green-200">
    {price > 0 ? (
      new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(price)
    ) : 'Grátis'}
  </Badge>
)

export default function AdditionalsPage() {
    const { restaurant, isLoading: isLoadingRestaurant } = useRestaurantContext()
  const [additionals, setAdditionals] = useState<Additional[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [itemsPerPage, setItemsPerPage] = useState('10')
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingAdditional, setDeletingAdditional] = useState<Additional | null>(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })

  const filteredAdditionals = additionals.filter(additional => {
    const matchesSearch = additional.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (additional.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'required' && additional.isRequired) ||
      (statusFilter === 'optional' && !additional.isRequired)
    
    return matchesSearch && matchesStatus
  })

  const startIndex = (currentPage - 1) * parseInt(itemsPerPage)
  const endIndex = startIndex + parseInt(itemsPerPage)
  const paginatedAdditionals = filteredAdditionals.slice(startIndex, endIndex)
  const totalPages = pagination.totalPages || Math.ceil(filteredAdditionals.length / parseInt(itemsPerPage))

    const loadAdditionals = useCallback(async () => {
    if (!restaurant?.id) return

    try {
      setLoading(true)
      const response = await fetch(`/api/additionals?restaurantId=${restaurant.id}&page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(searchTerm)}`)
      if (!response.ok) {
        throw new Error('Erro ao carregar adicionais')
      }

      const data = await response.json()
      
      // Mapear items para options para manter compatibilidade com a interface
      const mappedAdditionals = data.additionals.map((additional: ApiAdditional) => ({
        ...additional,
        options: additional.items
      }))
      
      setAdditionals(mappedAdditionals)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Erro ao carregar adicionais:', error)
      toast.error('Erro ao carregar adicionais')
    } finally {
      setLoading(false)
    }
  }, [restaurant?.id, currentPage, itemsPerPage, searchTerm])

  // Carregar adicionais quando o componente montar ou quando mudarem os parâmetros
  useEffect(() => {
    if (restaurant?.id) {
      loadAdditionals()
    }
  }, [restaurant?.id, loadAdditionals])

  const handleDeleteAdditional = async () => {
    if (!deletingAdditional) return

    try {
      const response = await fetch(`/api/additionals/${deletingAdditional.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao deletar adicional')
      }

      toast.success('Adicional deletado com sucesso')
      loadAdditionals()
    } catch (error) {
      console.error('Erro ao deletar adicional:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao deletar adicional')
    } finally {
      setDeletingAdditional(null)
    }
  }

  if (isLoadingRestaurant || !restaurant) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
        <div className="h-64 bg-slate-100 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Adicionais</h1>
          <p className="text-gray-600 mt-1">
            Gerencie todos os adicionais do seu restaurante
          </p>
        </div>

        <AdditionalFormDialog
          restaurantId={restaurant.id}
          onSuccess={loadAdditionals}
        >
          <Button className="bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Novo Adicional
          </Button>
        </AdditionalFormDialog>
      </div>



      {/* Filters and Search */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar adicionais..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="required">Obrigatórios</SelectItem>
                  <SelectItem value="optional">Opcionais</SelectItem>
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
              <p className="mt-2 text-gray-600">Carregando adicionais...</p>
            </div>
          ) : filteredAdditionals.length === 0 ? (
            <div className="p-8 text-center">
              <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Nenhum adicional encontrado' 
                  : 'Nenhum adicional cadastrado'
                }
              </h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece adicionando adicionais para seus produtos'
                }
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm border-b">
                  <TableRow>
                    <TableHead className="font-medium bg-white">Nome</TableHead>
                    <TableHead className="font-medium w-[120px] bg-white">Tipo</TableHead>
                    <TableHead className="font-medium w-[120px] bg-white">Preço Base</TableHead>
                    <TableHead className="font-medium w-[100px] bg-white">Max Opções</TableHead>
                    <TableHead className="font-medium w-[100px] bg-white">Itens</TableHead>
                    <TableHead className="font-medium w-[120px] bg-white">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAdditionals.map((additional) => (
                    <TableRow key={additional.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-medium text-gray-900">{additional.name}</p>
                          {additional.description && (
                            <p className="text-sm text-gray-600 truncate max-w-[300px]">
                              {additional.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge isRequired={additional.isRequired} />
                      </TableCell>
                      <TableCell>
                        <PriceBadge price={additional.price} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium">
                          {additional.maxOptions}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-medium">
                          {additional.options.length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AdditionalFormDialog
                            restaurantId={restaurant.id}
                            additional={additional}
                            onSuccess={loadAdditionals}
                          >
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </AdditionalFormDialog>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            onClick={() => setDeletingAdditional(additional)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-gray-600">
                    Mostrando {startIndex + 1} a {Math.min(endIndex, filteredAdditionals.length)} de{' '}
                    {filteredAdditionals.length} adicional(is)
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
      <AlertDialog open={!!deletingAdditional} onOpenChange={() => setDeletingAdditional(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o adicional &quot;{deletingAdditional?.name}&quot;?
              Esta ação não pode ser desfeita e removerá o adicional de todos os produtos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingAdditional(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAdditional}
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