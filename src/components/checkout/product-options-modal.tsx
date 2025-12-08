'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { X, Plus, Minus } from 'lucide-react'

interface ProductOptionItem {
  id: string
  name: string
  price: number
}

interface ProductOption {
  id: string
  name: string
  description?: string
  price: number
  isRequired: boolean
  maxOptions: number
  options: ProductOptionItem[]
}

interface Product {
  id: string
  name: string
  description?: string
  price: number
  image?: string
  category: string
  options?: ProductOption[]
}

interface ProductOptionsModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onAddToCart: (product: Product, selectedOptions: Record<string, string[]>, quantity: number, totalPrice: number) => void
}

export function ProductOptionsModal({
  product,
  isOpen,
  onClose,
  onAddToCart
}: ProductOptionsModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({})
  const [notes, setNotes] = useState('')

  // Reset state quando o modal abre com um novo produto
  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1)
      setSelectedOptions({})
      setNotes('')
    }
  }, [isOpen, product?.id])

  if (!isOpen || !product) return null

  const options = product.options || []

  // Calcular preço total com opções selecionadas
  const calculateTotalPrice = () => {
    let total = product.price * quantity
    
    for (const option of options) {
      const selected = selectedOptions[option.id] || []
      for (const selectedId of selected) {
        const item = option.options.find(o => o.id === selectedId)
        if (item) {
          total += item.price * quantity
        }
      }
    }
    
    return total
  }

  // Verificar se todas as opções obrigatórias foram selecionadas
  const canAddToCart = () => {
    for (const option of options) {
      if (option.isRequired) {
        const selected = selectedOptions[option.id] || []
        if (selected.length === 0) {
          return false
        }
      }
    }
    return true
  }

  const handleOptionChange = (optionId: string, itemId: string, isMultiple: boolean) => {
    setSelectedOptions(prev => {
      const current = prev[optionId] || []
      
      if (isMultiple) {
        // Checkbox - permite múltiplas seleções
        if (current.includes(itemId)) {
          return {
            ...prev,
            [optionId]: current.filter(id => id !== itemId)
          }
        } else {
          const option = options.find(o => o.id === optionId)
          if (option && current.length >= option.maxOptions) {
            return prev
          }
          return {
            ...prev,
            [optionId]: [...current, itemId]
          }
        }
      } else {
        // Radio - apenas uma seleção
        return {
          ...prev,
          [optionId]: [itemId]
        }
      }
    })
  }

  const handleAddToCart = () => {
    if (!canAddToCart()) return
    const totalPrice = calculateTotalPrice()
    onAddToCart(product, selectedOptions, quantity, totalPrice)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{product.name}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {product.description && (
            <p className="text-slate-600">{product.description}</p>
          )}

          <div className="text-xl font-bold">
            R$ {product.price.toFixed(2)}
          </div>

          {/* Opções do produto */}
          {options.map((option) => {
            const isMultiple = option.maxOptions > 1
            const selected = selectedOptions[option.id] || []

            return (
              <div key={option.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">
                    {option.name}
                    {option.isRequired && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {isMultiple && (
                    <span className="text-sm text-slate-500">
                      Máx: {option.maxOptions}
                    </span>
                  )}
                </div>

                {option.description && (
                  <p className="text-sm text-slate-500">{option.description}</p>
                )}

                {isMultiple ? (
                  // Checkbox para múltiplas opções
                  <div className="space-y-2">
                    {option.options.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-lg border">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={item.id}
                            checked={selected.includes(item.id)}
                            onCheckedChange={() => handleOptionChange(option.id, item.id, true)}
                            disabled={!selected.includes(item.id) && selected.length >= option.maxOptions}
                          />
                          <Label htmlFor={item.id} className="cursor-pointer">
                            {item.name}
                          </Label>
                        </div>
                        {item.price > 0 && (
                          <span className="text-sm text-slate-600">
                            +R$ {item.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Radio para seleção única
                  <RadioGroup
                    value={selected[0] || ''}
                    onValueChange={(value) => handleOptionChange(option.id, value, false)}
                  >
                    {option.options.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-lg border">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value={item.id} id={item.id} />
                          <Label htmlFor={item.id} className="cursor-pointer">
                            {item.name}
                          </Label>
                        </div>
                        {item.price > 0 && (
                          <span className="text-sm text-slate-600">
                            +R$ {item.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            )
          })}

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: sem cebola, bem passado..."
              rows={2}
            />
          </div>

          {/* Quantidade */}
          <div className="flex items-center justify-between">
            <Label>Quantidade</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(q => q + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Botão adicionar */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleAddToCart}
            disabled={!canAddToCart()}
          >
            Adicionar • R$ {calculateTotalPrice().toFixed(2)}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
