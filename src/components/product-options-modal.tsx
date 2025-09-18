'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Minus, Plus } from 'lucide-react'
import Image from 'next/image'

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

interface SelectedOptions {
  [optionGroupId: string]: string[] // IDs dos itens selecionados
}

interface ProductOptionsModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onAddToCart: (product: Product, selectedOptions: SelectedOptions, quantity: number, totalPrice: number) => void
}

export function ProductOptionsModal({
  product,
  isOpen,
  onClose,
  onAddToCart
}: ProductOptionsModalProps) {
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({})
  const [quantity, setQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setSelectedOptions({})
      setQuantity(1)
    }
  }, [product])

  // Calculate total price including selected options
  const calculateTotalPrice = () => {
    if (!product) return 0
    
    const basePrice = product.price
    let optionsPrice = 0

    // Calculate price from selected options
    if (product.options) {
      product.options.forEach(optionGroup => {
        const selectedItems = selectedOptions[optionGroup.id] || []
        selectedItems.forEach(itemId => {
          const item = optionGroup.options.find(opt => opt.id === itemId)
          if (item) {
            optionsPrice += item.price
          }
        })
      })
    }

    return (basePrice + optionsPrice) * quantity
  }

  // Handle option selection
  const handleOptionChange = (optionGroupId: string, itemId: string, isChecked: boolean) => {
    const optionGroup = product?.options?.find(opt => opt.id === optionGroupId)
    if (!optionGroup) return

    setSelectedOptions(prev => {
      const currentSelections = prev[optionGroupId] || []
      
      if (optionGroup.maxOptions === 1) {
        // Radio behavior - only one selection allowed
        return {
          ...prev,
          [optionGroupId]: isChecked ? [itemId] : []
        }
      } else {
        // Checkbox behavior - multiple selections allowed
        if (isChecked) {
          // Add selection if under max limit
          if (currentSelections.length < optionGroup.maxOptions) {
            return {
              ...prev,
              [optionGroupId]: [...currentSelections, itemId]
            }
          }
          return prev // Don't add if at max limit
        } else {
          // Remove selection
          return {
            ...prev,
            [optionGroupId]: currentSelections.filter(id => id !== itemId)
          }
        }
      }
    })
  }

  // Validate required options
  const validateOptions = (): boolean => {
    if (!product?.options) return true
    
    return product.options.every(optionGroup => {
      if (!optionGroup.isRequired) return true
      const selected = selectedOptions[optionGroup.id] || []
      return selected.length > 0
    })
  }

  // Handle add to cart
  const handleAddToCart = () => {
    if (!product || !validateOptions()) return
    
    setIsLoading(true)
    const totalPrice = calculateTotalPrice()
    
    setTimeout(() => {
      onAddToCart(product, selectedOptions, quantity, totalPrice)
      setIsLoading(false)
      onClose()
    }, 500)
  }

  // Handle quantity change
  const updateQuantity = (newQuantity: number) => {
    if (newQuantity >= 1) {
      setQuantity(newQuantity)
    }
  }

  if (!product) return null

  const isValid = validateOptions()
  const totalPrice = calculateTotalPrice()
  const hasOptions = product.options && product.options.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] p-0">
        <div className="flex flex-col max-h-[90vh] px-4">
          {/* Header */}
          <DialogHeader className="py-6 pb-4">
            <div className="flex items-start gap-4">
              {/* Product Image */}
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {product.image ? (
                  <Image 
                    src={product.image} 
                    alt={product.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span className="text-xs">Sem imagem</span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1">
                <DialogTitle className="text-xl font-bold text-gray-900 mb-1">
                  {product.name}
                </DialogTitle>
                {product.description && (
                  <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                )}
                <p className="text-lg font-bold text-orange-600">
                  R$ {product.price.toFixed(2)}
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1">
            <div className="space-y-6 pb-6 px-4">
              {/* Options Groups */}
              {hasOptions && product.options?.map((optionGroup, index) => (
                <div key={optionGroup.id}>
                  {index > 0 && <Separator className="mb-6" />}
                  
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="font-semibold text-gray-900">{optionGroup.name}</h3>
                      {optionGroup.isRequired && (
                        <Badge variant="destructive" className="text-xs">
                          Obrigatório
                        </Badge>
                      )}
                      {optionGroup.maxOptions > 1 && (
                        <Badge variant="secondary" className="text-xs">
                          Até {optionGroup.maxOptions}
                        </Badge>
                      )}
                    </div>
                    
                    {optionGroup.description && (
                      <p className="text-sm text-gray-600 mb-3">{optionGroup.description}</p>
                    )}

                    <div className="space-y-3">
                      {optionGroup.maxOptions === 1 ? (
                        // Radio Group for single selection
                        <RadioGroup
                          value={selectedOptions[optionGroup.id]?.[0] || ""}
                          onValueChange={(value) => 
                            handleOptionChange(optionGroup.id, value, true)
                          }
                        >
                          {optionGroup.options.map(item => (
                            <div key={item.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                              <RadioGroupItem value={item.id} id={item.id} />
                              <Label 
                                htmlFor={item.id} 
                                className="flex-1 cursor-pointer flex justify-between items-center"
                              >
                                <span>{item.name}</span>
                                {item.price > 0 && (
                                  <span className="text-orange-600 font-medium">
                                    +R$ {item.price.toFixed(2)}
                                  </span>
                                )}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      ) : (
                        // Checkboxes for multiple selection
                        <div className="space-y-3">
                          {optionGroup.options.map(item => {
                            const isSelected = selectedOptions[optionGroup.id]?.includes(item.id) || false
                            const currentCount = selectedOptions[optionGroup.id]?.length || 0
                            const isDisabled = !isSelected && currentCount >= optionGroup.maxOptions
                            
                            return (
                              <div 
                                key={item.id} 
                                className={`flex items-center space-x-3 p-2 rounded-lg ${
                                  isDisabled ? 'opacity-50' : 'hover:bg-gray-50'
                                }`}
                              >
                                <Checkbox
                                  id={item.id}
                                  checked={isSelected}
                                  disabled={isDisabled}
                                  onCheckedChange={(checked) => 
                                    handleOptionChange(optionGroup.id, item.id, checked as boolean)
                                  }
                                />
                                <Label 
                                  htmlFor={item.id} 
                                  className={`flex-1 cursor-pointer flex justify-between items-center ${
                                    isDisabled ? 'cursor-not-allowed' : ''
                                  }`}
                                >
                                  <span>{item.name}</span>
                                  {item.price > 0 && (
                                    <span className="text-orange-600 font-medium">
                                      +R$ {item.price.toFixed(2)}
                                    </span>
                                  )}
                                </Label>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* No Options Message */}
              {!hasOptions && (
                <div className="p-4 text-center text-gray-600 bg-gray-50 rounded-lg">
                  Este produto não possui opções adicionais.
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-gray-200 py-6 bg-white px-4">
            {/* Quantity Selector */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateQuantity(quantity - 1)}
                disabled={quantity <= 1}
                className="h-10 w-10 p-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-lg font-medium w-12 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateQuantity(quantity + 1)}
                className="h-10 w-10 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <Separator className="my-4" />

            {/* Total and Add Button */}
            <div className="flex items-center justify-between gap-4">
              <div className="text-left">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-xl font-bold text-orange-600">
                  R$ {totalPrice.toFixed(2)}
                </p>
              </div>
              
              <Button
                onClick={handleAddToCart}
                disabled={!isValid || isLoading}
                className="bg-orange-500 hover:bg-orange-600 text-white px-8"
                size="lg"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Adicionando...
                  </div>
                ) : (
                  'Adicionar ao Carrinho'
                )}
              </Button>
            </div>

            {!isValid && (
              <p className="text-sm text-red-600 text-center mt-2">
                Selecione as opções obrigatórias para continuar
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}