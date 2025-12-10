'use client'

import { useState, useTransition } from 'react'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DashboardHeader, DashboardHeaderButton } from '@/components/ui/dashboard-header'
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
import { AdditionalFormDialog } from '@/components/forms/additional-form-dialog'
import { 
  Plus,
  Edit,
  Trash2,
  Search,
  Settings
} from 'lucide-react'
import { useBusinessId } from '@/stores/business-store'
import { useBusinessContext } from '@/hooks/business/use-business-context'
import { notify } from '@/lib/notifications/notify'
import { cn } from '@/lib/utils'
import { deleteAdditional, getAdditionals } from '@/actions/additionals'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Additional } from '@/actions/additionals'

interface AdditionalClientItem {
  id: string
  name: string
  description?: string | null
  price: number
  isRequired: boolean
  maxOptions: number
  options: { id: string; name: string; price: number }[]
}

interface AdditionalsData {
  additionals: Additional[]
  total: number
  totalPages: number
}

interface Props {
  initialData: AdditionalsData
  initialPage: number
  initialLimit: number
  initialSearch: string
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

export function AdditionalsClientPage({ initialData, initialPage, initialLimit, initialSearch }: Props) {
  const businessId = useBusinessId()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  // Permissões de adicionais (usa permissão de products)
  const { hasPermission } = useBusinessContext()
  const canCreate = hasPermission('products', 'create') || hasPermission('products', 'manage')
  const canEdit = hasPermission('products', 'update') || hasPermission('products', 'manage')
  const canDelete = hasPermission('products', 'delete') || hasPermission('products', 'manage')
  
  const [data, setData] = useState(initialData)
  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState('all')
  const [itemsPerPage, setItemsPerPage] = useState(initialLimit.toString())
  const [currentPage] = useState(initialPage)
  const [deletingAdditional, setDeletingAdditional] = useState<AdditionalClientItem | null>(null)

  // Convert server Additional to client format
  const clientAdditionals: AdditionalClientItem[] = data.additionals.map(additional => ({
    ...additional,
    options: additional.items || []
  }))

  const filteredAdditionals = clientAdditionals.filter(additional => {
    const matchesSearch = additional.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (additional.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'required' && additional.isRequired) ||
      (statusFilter === 'optional' && !additional.isRequired)
    
    return matchesSearch && matchesStatus
  })

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams)
    params.set('search', searchTerm)
    params.set('page', '1')
    params.set('limit', itemsPerPage)
    
    router.push(`/additionals?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    params.set('limit', itemsPerPage)
    if (searchTerm) params.set('search', searchTerm)
    
    router.push(`/additionals?${params.toString()}`)
  }

  const handleLimitChange = (newLimit: string) => {
    setItemsPerPage(newLimit)
    const params = new URLSearchParams(searchParams)
    params.set('limit', newLimit)
    params.set('page', '1')
    if (searchTerm) params.set('search', searchTerm)
    
    router.push(`/additionals?${params.toString()}`)
  }

  const refreshData = async () => {
    startTransition(async () => {
      try {
        const result = await getAdditionals(currentPage, parseInt(itemsPerPage), searchTerm)
        if (result.success) {
          setData(result.data)
        }
      } catch (error) {
        console.error('Error refreshing data:', error)
      }
    })
  }

  const handleDeleteAdditional = async () => {
    if (!deletingAdditional) return

    try {
      const result = await deleteAdditional(deletingAdditional.id)
      
      if (result.success) {
        notify('success', 'Adicional deletado com sucesso')
        refreshData()
      } else {
        notify('error', result.error)
      }
    } catch (error) {
      console.error('Erro ao deletar adicional:', error)
      notify('error', 'Erro ao deletar adicional')
    } finally {
      setDeletingAdditional(null)
    }
  }

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
        title="Adicionais"
        description="Gerencie todos os adicionais do seu restaurante"
      >
        {canCreate && (
        <AdditionalFormDialog
          businessId={businessId || ''}
          onSuccess={refreshData}
        >
          <DashboardHeaderButton>
            <Plus className="h-4 w-4 mr-2" />
            Novo Adicional
          </DashboardHeaderButton>
        </AdditionalFormDialog>
        )}
      </DashboardHeader>

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
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button onClick={handleSearch} variant="outline" size="sm">
                Buscar
              </Button>
              
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
              <Select value={itemsPerPage} onValueChange={handleLimitChange}>
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
          {isPending ? (
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
                  {filteredAdditionals.map((additional) => (
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
                          {canEdit && (
                          <AdditionalFormDialog
                            businessId={businessId || ''}
                            additional={additional}
                            onSuccess={refreshData}
                          >
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </AdditionalFormDialog>
                          )}
                          {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            onClick={() => setDeletingAdditional(additional)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-gray-600">
                    Mostrando {((currentPage - 1) * parseInt(itemsPerPage)) + 1} a {Math.min(currentPage * parseInt(itemsPerPage), data.total)} de{' '}
                    {data.total} adicional(is)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1 || isPending}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-gray-600">
                      Página {currentPage} de {data.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.min(data.totalPages, currentPage + 1))}
                      disabled={currentPage >= data.totalPages || isPending}
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