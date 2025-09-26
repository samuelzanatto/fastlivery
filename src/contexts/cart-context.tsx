'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

export interface SelectedOptions {
  [optionGroupId: string]: string[] // IDs dos itens selecionados
}

export interface CartItem {
  id: string // Este será um ID único baseado no produto + opções
  productId: string // ID original do produto
  name: string
  description: string
  basePrice: number // Preço base do produto
  finalPrice: number // Preço final incluindo opções
  image?: string
  category: string
  quantity: number
  businessId: string
  selectedOptions?: SelectedOptions
  optionsText?: string // Texto descritivo das opções selecionadas
}

export interface CartContextType {
  items: CartItem[]
  addItem: (product: Omit<CartItem, 'quantity'>) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
  getItemQuantity: (itemId: string) => number
  // Método específico para adicionar com opções
  addItemWithOptions: (
    productId: string,
    name: string,
    description: string,
    basePrice: number,
    finalPrice: number,
    image: string | undefined,
    category: string,
    businessId: string,
    selectedOptions: SelectedOptions,
    optionsText: string,
    quantity?: number
  ) => void
}

// Função para gerar ID único baseado no produto e opções
function generateCartItemId(productId: string, selectedOptions: SelectedOptions): string {
  const optionsKey = Object.keys(selectedOptions)
    .sort()
    .map(key => `${key}:${selectedOptions[key].sort().join(',')}`)
    .join('|')
  
  return `${productId}${optionsKey ? `_${btoa(optionsKey)}` : ''}`
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = (product: Omit<CartItem, 'quantity'>) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.id === product.id)
      
      if (existingItem) {
        return currentItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      
      return [...currentItems, { ...product, quantity: 1 }]
    })
  }

  const addItemWithOptions = (
    productId: string,
    name: string,
    description: string,
    basePrice: number,
    finalPrice: number,
    image: string | undefined,
    category: string,
    businessId: string,
    selectedOptions: SelectedOptions,
    optionsText: string,
    quantity: number = 1
  ) => {
    const itemId = generateCartItemId(productId, selectedOptions)
    
    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.id === itemId)
      
      if (existingItem) {
        return currentItems.map(item =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }
      
      return [...currentItems, {
        id: itemId,
        productId,
        name,
        description,
        basePrice,
        finalPrice,
        image,
        category,
        quantity,
        businessId,
        selectedOptions,
        optionsText
      }]
    })
  }

  const removeItem = (itemId: string) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.id === itemId)
      
      if (existingItem && existingItem.quantity > 1) {
        return currentItems.map(item =>
          item.id === itemId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      }
      
      return currentItems.filter(item => item.id !== itemId)
    })
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(currentItems => currentItems.filter(item => item.id !== itemId))
      return
    }
    
    setItems(currentItems =>
      currentItems.map(item =>
        item.id === itemId
          ? { ...item, quantity }
          : item
      )
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + (item.finalPrice * item.quantity), 0)
  }

  const getItemQuantity = (itemId: string) => {
    const item = items.find(item => item.id === itemId)
    return item ? item.quantity : 0
  }

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      getTotalItems,
      getTotalPrice,
      getItemQuantity,
      addItemWithOptions
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
