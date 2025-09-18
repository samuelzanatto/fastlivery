'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
import { 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Settings,
  DollarSign
} from 'lucide-react'
import { toast } from 'sonner'

interface ProductOptionItem {
  id: string
  name: string
  price: number
  tempId?: string // Para novos itens antes de salvar
}

interface ProductOption {
  id: string
  name: string
  description?: string
  price: number
  isRequired: boolean
  maxOptions: number
  options: ProductOptionItem[]
  tempId?: string // Para novos grupos antes de salvar
}

interface ProductOptionsManagerProps {
  productId: string | null
  options: ProductOption[]
  onOptionsChange: (options: ProductOption[]) => void
  disabled?: boolean
}

export function ProductOptionsManager({
  productId: _productId,
  options,
  onOptionsChange,
  disabled = false
}: ProductOptionsManagerProps) {
  const [localOptions, setLocalOptions] = useState<ProductOption[]>(options)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'group' | 'item'
    groupId: string
    itemId?: string
  } | null>(null)

  // Sync with parent when options change
  useEffect(() => {
    setLocalOptions(options)
  }, [options])

  // Generate temporary ID for new items
  const generateTempId = () => `temp_${Date.now()}_${Math.random()}`

  // Add new option group
  const addOptionGroup = () => {
    const newGroup: ProductOption = {
      id: generateTempId(),
      name: '',
      description: '',
      price: 0,
      isRequired: false,
      maxOptions: 1,
      options: [],
      tempId: generateTempId()
    }

    const updatedOptions = [...localOptions, newGroup]
    setLocalOptions(updatedOptions)
    onOptionsChange(updatedOptions)
    
    // Expand the new group
    setExpandedGroups(prev => new Set([...prev, newGroup.id]))
  }

  // Update option group
  const updateOptionGroup = (groupId: string, updates: Partial<ProductOption>) => {
    const updatedOptions = localOptions.map(group =>
      group.id === groupId ? { ...group, ...updates } : group
    )
    setLocalOptions(updatedOptions)
    onOptionsChange(updatedOptions)
  }

  // Delete option group
  const deleteOptionGroup = (groupId: string) => {
    const updatedOptions = localOptions.filter(group => group.id !== groupId)
    setLocalOptions(updatedOptions)
    onOptionsChange(updatedOptions)
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      newSet.delete(groupId)
      return newSet
    })
    toast.success('Grupo de opções removido')
  }

  // Add new option item
  const addOptionItem = (groupId: string) => {
    const newItem: ProductOptionItem = {
      id: generateTempId(),
      name: '',
      price: 0,
      tempId: generateTempId()
    }

    const updatedOptions = localOptions.map(group =>
      group.id === groupId
        ? { ...group, options: [...group.options, newItem] }
        : group
    )
    setLocalOptions(updatedOptions)
    onOptionsChange(updatedOptions)
  }

  // Update option item
  const updateOptionItem = (groupId: string, itemId: string, updates: Partial<ProductOptionItem>) => {
    const updatedOptions = localOptions.map(group =>
      group.id === groupId
        ? {
            ...group,
            options: group.options.map(item =>
              item.id === itemId ? { ...item, ...updates } : item
            )
          }
        : group
    )
    setLocalOptions(updatedOptions)
    onOptionsChange(updatedOptions)
  }

  // Delete option item
  const deleteOptionItem = (groupId: string, itemId: string) => {
    const updatedOptions = localOptions.map(group =>
      group.id === groupId
        ? {
            ...group,
            options: group.options.filter(item => item.id !== itemId)
          }
        : group
    )
    setLocalOptions(updatedOptions)
    onOptionsChange(updatedOptions)
    toast.success('Item removido')
  }

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Adicionais do Produto</h3>
          <p className="text-sm text-gray-600">
            Configure opções como tamanhos, sabores, complementos, etc.
          </p>
        </div>
        <Button
          onClick={addOptionGroup}
          disabled={disabled}
          size="sm"
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Grupo
        </Button>
      </div>

      <ScrollArea className="max-h-96 pr-4">
        <div className="space-y-3">
          {localOptions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex items-center justify-center p-8 text-center">
                <div>
                  <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Nenhum adicional configurado</p>
                  <p className="text-sm text-gray-500">
                    Clique em &ldquo;Novo Grupo&rdquo; para adicionar opções como tamanhos, sabores, etc.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            localOptions.map((group) => {
              const isExpanded = expandedGroups.has(group.id)
              const _hasValidItems = group.options.some(item => item.name.trim())
              
              return (
                <Card key={group.id} className="border border-gray-200">
                  <CardHeader className="pb-2">
                    <Collapsible>
                      <div className="flex items-center justify-between">
                        <CollapsibleTrigger
                          onClick={() => toggleGroup(group.id)}
                          className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded-md flex-1"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {group.name || 'Grupo sem nome'}
                              </span>
                              {group.isRequired && (
                                <Badge variant="destructive" className="text-xs">
                                  Obrigatório
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                {group.options.length} itens
                              </Badge>
                            </div>
                            {group.description && (
                              <p className="text-sm text-gray-600">{group.description}</p>
                            )}
                          </div>
                        </CollapsibleTrigger>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm({ type: 'group', groupId: group.id })}
                          disabled={disabled}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <CollapsibleContent>
                        {isExpanded && (
                          <CardContent className="pt-4 space-y-4">
                            {/* Group Settings */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor={`group-name-${group.id}`}>Nome do Grupo *</Label>
                                <Input
                                  id={`group-name-${group.id}`}
                                  value={group.name}
                                  onChange={(e) => updateOptionGroup(group.id, { name: e.target.value })}
                                  placeholder="Ex: Tamanho, Sabores, Complementos"
                                  disabled={disabled}
                                />
                              </div>

                              <div>
                                <Label htmlFor={`group-max-${group.id}`}>Máximo de Seleções</Label>
                                <Input
                                  id={`group-max-${group.id}`}
                                  type="number"
                                  min="1"
                                  value={group.maxOptions}
                                  onChange={(e) => updateOptionGroup(group.id, { maxOptions: parseInt(e.target.value) || 1 })}
                                  disabled={disabled}
                                />
                              </div>

                              <div className="md:col-span-2">
                                <Label htmlFor={`group-desc-${group.id}`}>Descrição (opcional)</Label>
                                <Textarea
                                  id={`group-desc-${group.id}`}
                                  value={group.description || ''}
                                  onChange={(e) => updateOptionGroup(group.id, { description: e.target.value })}
                                  placeholder="Descreva este grupo de opções"
                                  disabled={disabled}
                                  rows={2}
                                />
                              </div>

                              <div className="flex items-center space-x-2">
                                <Switch
                                  id={`group-required-${group.id}`}
                                  checked={group.isRequired}
                                  onCheckedChange={(checked) => updateOptionGroup(group.id, { isRequired: checked })}
                                  disabled={disabled}
                                />
                                <Label htmlFor={`group-required-${group.id}`}>Seleção obrigatória</Label>
                              </div>
                            </div>

                            <Separator />

                            {/* Option Items */}
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <Label className="text-sm font-medium">Itens do Grupo</Label>
                                <Button
                                  onClick={() => addOptionItem(group.id)}
                                  disabled={disabled}
                                  size="sm"
                                  variant="outline"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Adicionar Item
                                </Button>
                              </div>

                              <div className="space-y-2">
                                {group.options.length === 0 ? (
                                  <p className="text-sm text-gray-500 text-center py-4 border border-dashed rounded-md">
                                    Nenhum item adicionado. Clique em &ldquo;Adicionar Item&rdquo; para começar.
                                  </p>
                                ) : (
                                  group.options.map((item) => (
                                    <div key={item.id} className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
                                      <div className="flex-1">
                                        <Input
                                          value={item.name}
                                          onChange={(e) => updateOptionItem(group.id, item.id, { name: e.target.value })}
                                          placeholder="Nome do item (ex: Pequeno, Banana, Granola)"
                                          disabled={disabled}
                                          className="mb-1 bg-white"
                                        />
                                      </div>
                                      
                                      <div className="w-32">
                                        <div className="relative">
                                          <DollarSign className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={item.price}
                                            onChange={(e) => updateOptionItem(group.id, item.id, { price: parseFloat(e.target.value) || 0 })}
                                            placeholder="0.00"
                                            disabled={disabled}
                                            className="pl-7 bg-white"
                                          />
                                        </div>
                                      </div>

                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeleteConfirm({ type: 'item', groupId: group.id, itemId: item.id })}
                                        disabled={disabled}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </CardContent>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </CardHeader>
                </Card>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirm?.type === 'group' ? 'Excluir Grupo de Opções' : 'Excluir Item'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === 'group' 
                ? 'Tem certeza que deseja excluir este grupo e todos os seus itens? Esta ação não pode ser desfeita.'
                : 'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm) {
                  if (deleteConfirm.type === 'group') {
                    deleteOptionGroup(deleteConfirm.groupId)
                  } else if (deleteConfirm.itemId) {
                    deleteOptionItem(deleteConfirm.groupId, deleteConfirm.itemId)
                  }
                  setDeleteConfirm(null)
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}