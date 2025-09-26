'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { DashboardHeader } from '@/components/ui/dashboard-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Search,
  MapPin,
  Star,
  Package,
  Truck,
  Clock,
  Users,
  Eye,
  Heart,
  MessageSquare,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { searchSuppliers, type SupplierSearchResult } from '@/actions/marketplace/search-suppliers'
import type { SupplierCategory } from '@prisma/client'

interface FilterState {
  query: string
  category: SupplierCategory | 'all'
  location: string
  verified: boolean | 'all'
  minRating: number | 'all'
  sortBy: 'rating' | 'partnerships' | 'responseTime' | 'established'
  sortOrder: 'asc' | 'desc'
}

const categoryLabels: Record<SupplierCategory | 'all', string> = {
  all: 'Todas as Categorias',
  FOOD_INGREDIENTS: 'Ingredientes',
  TECHNOLOGY: 'Tecnologia',
  LOGISTICS: 'Logística',
  PACKAGING: 'Embalagens',
  CONSULTING: 'Consultoria',
  EQUIPMENT: 'Equipamentos',
  MARKETING: 'Marketing',
  SERVICES: 'Serviços',
  OTHER: 'Outros'
}

export default function MarketplacePage() {
  const [suppliers, setSuppliers] = useState<SupplierSearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [totalResults, setTotalResults] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [hasPrevPage, setHasPrevPage] = useState(false)
  
  const [filters, setFilters] = useState<FilterState>({
    query: '',
    category: 'all',
    location: '',
    verified: 'all',
    minRating: 'all',
    sortBy: 'rating',
    sortOrder: 'desc'
  })

  const fetchSuppliers = useCallback(async (page: number = 1) => {
    setSearchLoading(true)
    try {
      const searchFilters: Record<string, string | boolean | number> = {}
      
      if (filters.category !== 'all') {
        searchFilters.category = filters.category
      }
      if (filters.location) {
        searchFilters.location = filters.location
      }
      if (filters.verified !== 'all') {
        searchFilters.verified = filters.verified
      }
      if (filters.minRating !== 'all') {
        searchFilters.minRating = filters.minRating
      }

      const result = await searchSuppliers({
        query: filters.query,
        filters: searchFilters,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page,
        limit: 12
      })

      setSuppliers(result.suppliers)
      setTotalResults(result.total)
      setCurrentPage(result.page)
      setHasNextPage(result.hasNextPage)
      setHasPrevPage(result.hasPrevPage)
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    } finally {
      setSearchLoading(false)
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  const handleSearch = (newQuery: string) => {
    setFilters(prev => ({ ...prev, query: newQuery }))
    setCurrentPage(1)
  }

  const handleFilterChange = (key: keyof FilterState, value: string | boolean | number) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchSuppliers(page)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <DashboardHeader
        title="Marketplace B2B"
        description="Encontre os melhores fornecedores para seu negócio"
      />

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar fornecedores, produtos ou serviços..."
            value={filters.query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <Select 
          value={filters.category} 
          onValueChange={(value: string) => handleFilterChange('category', value)}
        >
          <SelectTrigger className="w-full lg:w-64">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Location Filter */}
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Localização"
            value={filters.location}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('location', e.target.value)}
            className="pl-10 w-full lg:w-48"
          />
        </div>

        {/* Sort */}
        <Select 
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onValueChange={(value: string) => {
            const [sortBy, sortOrder] = value.split('-') as [FilterState['sortBy'], 'asc' | 'desc']
            setFilters(prev => ({ ...prev, sortBy, sortOrder }))
          }}
        >
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating-desc">Maior avaliação</SelectItem>
            <SelectItem value="partnerships-desc">Mais parcerias</SelectItem>
            <SelectItem value="responseTime-asc">Resposta mais rápida</SelectItem>
            <SelectItem value="established-desc">Mais recente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Additional Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {/* Verified Filter */}
        <Select 
          value={String(filters.verified)} 
          onValueChange={(value: string) => handleFilterChange('verified', value === 'true' ? true : value === 'false' ? false : 'all')}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Verificados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Verificados</SelectItem>
            <SelectItem value="false">Não verificados</SelectItem>
          </SelectContent>
        </Select>

        {/* Rating Filter */}
        <Select 
          value={String(filters.minRating)} 
          onValueChange={(value: string) => handleFilterChange('minRating', value === 'all' ? 'all' : Number(value))}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Avaliação mínima" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer avaliação</SelectItem>
            <SelectItem value="4">4+ estrelas</SelectItem>
            <SelectItem value="3">3+ estrelas</SelectItem>
            <SelectItem value="2">2+ estrelas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-gray-600">
          {searchLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando fornecedores...
            </div>
          ) : (
            `${totalResults} fornecedores encontrados`
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Suppliers Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {suppliers.map((supplier) => (
            <motion.div
              key={supplier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SupplierCard supplier={supplier} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && suppliers.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum fornecedor encontrado
          </h3>
          <p className="text-gray-600">
            Tente ajustar os filtros de busca ou remover alguns critérios
          </p>
        </div>
      )}

      {/* Pagination */}
      {!loading && suppliers.length > 0 && (hasPrevPage || hasNextPage) && (
        <div className="flex justify-center mt-8">
          <div className="flex gap-2">
            {hasPrevPage && (
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Anterior
              </Button>
            )}
            <div className="flex items-center px-4 py-2 text-sm text-gray-600">
              Página {currentPage}
            </div>
            {hasNextPage && (
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Próxima
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// SupplierCard Component
function SupplierCard({ supplier }: { supplier: SupplierSearchResult }) {
  return (
    <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg line-clamp-1">
                {supplier.name}
              </CardTitle>
              {supplier.verified && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
            <Badge variant="secondary" className="text-xs">
              {categoryLabels[supplier.category as keyof typeof categoryLabels]}
            </Badge>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 line-clamp-2 mt-2">
          {supplier.description}
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Location and Rating */}
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center text-gray-600">
              <MapPin className="h-3 w-3 mr-1" />
              {supplier.location}
            </div>
            <div className="flex items-center">
              <Star className="h-3 w-3 text-yellow-400 fill-current mr-1" />
              <span className="font-medium">{supplier.rating}</span>
              <span className="text-gray-500 ml-1">
                ({supplier.reviewCount})
              </span>
            </div>
          </div>

          {/* Services */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Serviços:</p>
            <div className="flex flex-wrap gap-1">
              {supplier.services.slice(0, 3).map((service: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {service}
                </Badge>
              ))}
              {supplier.services.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{supplier.services.length - 3}
                </Badge>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {supplier.responseTime}
            </div>
            <div className="flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {supplier.partnerships}
            </div>
            <div className="flex items-center">
              <Truck className="h-3 w-3 mr-1" />
              {supplier.deliveryTime}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button size="sm" className="flex-1">
              <Eye className="h-3 w-3 mr-1" />
              Ver Perfil
            </Button>
            <Button size="sm" variant="outline">
              <MessageSquare className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline">
              <Heart className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}