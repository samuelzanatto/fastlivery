'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Search, 
  Package, 
  DollarSign,
  Settings,
  ExternalLink
} from 'lucide-react'
import { notify } from '@/lib/notifications/notify'
import { getAdditionals, type Additional } from '@/actions/additionals/additionals'

interface ProductAdditionalsSelectorProps {
  businessId: string
  selectedAdditionals: string[]
  onSelectionChange: (selectedIds: string[]) => void
  disabled?: boolean
}

export function ProductAdditionalsSelector({
  businessId,
  selectedAdditionals,
  onSelectionChange,
  disabled = false
}: ProductAdditionalsSelectorProps) {
  const [additionals, setAdditionals] = useState<Additional[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredAdditionals = additionals.filter(additional =>
    additional.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (additional.description && additional.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const loadAdditionals = useCallback(async () => {
    try {
      setLoading(true)
      const result = await getAdditionals(1, 100) // page=1, limit=100
      if (!result.success) throw new Error(result.error)
      
      // Mapear items para manter compatibilidade
      const mappedAdditionals = result.data.additionals.map((additional) => ({
        ...additional,
        items: additional.items || []
      }))
      
      setAdditionals(mappedAdditionals)
    } catch (error) {
      console.error('Erro ao carregar adicionais:', error)
  notify('error', 'Erro ao carregar adicionais da empresa')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (businessId) {
      loadAdditionals()
    }
  }, [businessId, loadAdditionals])

  const handleAdditionalToggle = (additionalId: string) => {
    if (disabled) return

    const newSelection = selectedAdditionals.includes(additionalId)
      ? selectedAdditionals.filter(id => id !== additionalId)
      : [...selectedAdditionals, additionalId]

    onSelectionChange(newSelection)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Package className="h-5 w-5" />
            Adicionais do Produto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded flex-1 animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (additionals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Package className="h-5 w-5" />
            Adicionais do Produto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum adicional cadastrado
            </h3>
            <p className="text-gray-600 mb-4">
              Crie adicionais para o sua empresa primeiro
            </p>
            <Button 
              variant="outline"
              onClick={() => window.open('/additionals', '_blank')}
              className="border-orange-300 text-orange-600 hover:bg-orange-50"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Gerenciar Adicionais
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Package className="h-5 w-5" />
          Adicionais do Produto
          <Badge variant="secondary" className="ml-auto">
            {selectedAdditionals.length} selecionados
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        {additionals.length > 5 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar adicionais..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              disabled={disabled}
            />
          </div>
        )}

        {/* Lista de Adicionais */}
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {filteredAdditionals.map((additional) => (
            <div
              key={additional.id}
              className={`border rounded-lg p-3 transition-colors ${
                selectedAdditionals.includes(additional.id)
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              } ${disabled ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  id={`additional-${additional.id}`}
                  checked={selectedAdditionals.includes(additional.id)}
                  onCheckedChange={() => handleAdditionalToggle(additional.id)}
                  disabled={disabled}
                  className="mt-1"
                />
                
                <div className="flex-1 min-w-0">
                  <Label
                    htmlFor={`additional-${additional.id}`}
                    className="text-sm font-medium text-gray-900 cursor-pointer"
                  >
                    {additional.name}
                  </Label>
                  
                  {additional.description && (
                    <p className="text-xs text-gray-600 mt-1">
                      {additional.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={additional.isRequired ? "destructive" : "secondary"} className="text-xs">
                      {additional.isRequired ? 'Obrigatório' : 'Opcional'}
                    </Badge>
                    
                    {additional.price > 0 && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        R$ {additional.price.toFixed(2)}
                      </Badge>
                    )}
                    
                    <Badge variant="outline" className="text-xs">
                      {additional.items?.length || 0} {(additional.items?.length || 0) === 1 ? 'item' : 'itens'}
                    </Badge>
                    
                    {additional.maxOptions > 1 && (
                      <Badge variant="outline" className="text-xs">
                        Máx: {additional.maxOptions}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredAdditionals.length === 0 && searchTerm && (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">
              Nenhum adicional encontrado para &ldquo;{searchTerm}&rdquo;
            </p>
          </div>
        )}

        {/* Footer com informações */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {selectedAdditionals.length} de {additionals.length} selecionados
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open('/additionals', '_blank')}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 p-0 h-auto"
            >
              <Settings className="h-4 w-4 mr-1" />
              Gerenciar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}