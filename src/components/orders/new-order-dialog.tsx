'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getProducts } from '@/actions/products/products'
import { createOrder } from '@/actions/orders/orders'
import { getTables } from '@/actions/tables/tables'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  ShoppingCart,
  User,
  MapPin,
  Clock,
  Search,
  Split,
  Trash2,
  Minus,
  Utensils,
  ChevronRight,
  Receipt,
  Armchair
} from 'lucide-react'
import { notify } from '@/lib/notifications/notify'
import { useIsMobile } from '@/hooks/ui/use-mobile'
import { cn } from '@/lib/utils'

interface Product {
  id: string
  name: string
  price: number
  description?: string | null
  isAvailable: boolean
  category: {
    id: string
    name: string
  }
}

interface OrderItem {
  productId: string
  productName: string
  quantity: number
  price: number
  observations?: string
  assignedTo?: string[]
  splitType?: 'individual' | 'shared'
}

interface Person {
  id: string
  name: string
  items: OrderItem[]
}

interface NewOrder {
  customerName: string
  customerPhone?: string
  tableNumber: string
  items: OrderItem[]
  orderType: 'dine_in' | 'pickup'
  observations?: string
  splitBill: boolean
  people: Person[]
}

interface NewOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOrderCreated?: () => void
  businessId: string
}

export default function NewOrderDialog({ open, onOpenChange, onOrderCreated, businessId }: NewOrderDialogProps) {
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [newOrder, setNewOrder] = useState<NewOrder>({
    customerName: '',
    customerPhone: '',
    tableNumber: '',
    items: [],
    orderType: 'dine_in',
    splitBill: false,
    people: []
  })

  const [tables, setTables] = useState<any[]>([])

  const isMobile = useIsMobile()
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  // Load tables on mount
  useEffect(() => {
    getTables().then(res => {
      if (res.success) {
        setTables(res.data)
      }
    })
  }, [])

  // Load products
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      const result = await getProducts()
      if (result.success) {
        const convertedProducts = result.data.map(product => ({
          ...product,
          category: product.category || { id: '', name: 'Outros' }
        })) as Product[]
        setProducts(convertedProducts)
      } else {
        throw new Error(result.error)
      }
    } catch {
      notify('error', 'Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && products.length === 0) {
      loadProducts()
    }
  }, [open, products.length, loadProducts])

  useEffect(() => {
    if (!open) {
      setNewOrder({
        customerName: '',
        customerPhone: '',
        tableNumber: '',
        items: [],
        orderType: 'dine_in',
        splitBill: false,
        people: []
      })
      setSearchTerm('')
      setSelectedCategory('all')
    }
  }, [open])

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category.name))).sort()
    return ['all', ...cats]
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'all' || product.category.name === selectedCategory
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesCategory && matchesSearch && product.isAvailable
    })
  }, [products, selectedCategory, searchTerm])

  const getItemQuantity = (productId: string) => {
    const item = newOrder.items.find(i => i.productId === productId)
    return item ? item.quantity : 0
  }

  const addItemToOrder = useCallback((product: Product) => {
    setNewOrder(prev => {
      const existingItem = prev.items.find(item => item.productId === product.id)
      if (existingItem) {
        return {
          ...prev,
          items: prev.items.map(item =>
            item.productId === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        }
      } else {
        return {
          ...prev,
          items: [...prev.items, {
            productId: product.id,
            productName: product.name,
            quantity: 1,
            price: product.price
          }]
        }
      }
    })
  }, [])

  const updateItemQuantity = useCallback((productId: string, quantity: number) => {
    setNewOrder(prev => {
      if (quantity <= 0) {
        return {
          ...prev,
          items: prev.items.filter(item => item.productId !== productId)
        }
      }
      return {
        ...prev,
        items: prev.items.map(item =>
          item.productId === productId
            ? { ...item, quantity }
            : item
        )
      }
    })
  }, [])

  const calculateTotal = useCallback(() => {
    return newOrder.items.reduce((total, item) => total + (item.price * item.quantity), 0)
  }, [newOrder.items])

  // --- Person Management (Split Bill) ---
  const addPerson = useCallback(() => {
    const personId = `person-${Date.now()}`
    setNewOrder(prev => ({
      ...prev,
      people: [...prev.people, { id: personId, name: '', items: [] }]
    }))
  }, [])

  const updatePersonName = useCallback((personId: string, name: string) => {
    setNewOrder(prev => ({
      ...prev,
      people: prev.people.map(person => person.id === personId ? { ...person, name } : person)
    }))
  }, [])

  const removePerson = useCallback((personId: string) => {
    setNewOrder(prev => ({
      ...prev,
      people: prev.people.filter(person => person.id !== personId)
    }))
  }, [])

  const assignItemToPerson = useCallback((itemId: string, personId: string) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.productId === itemId) {
          const currentAssigned = item.assignedTo || []
          const isAssigned = currentAssigned.includes(personId)
          return {
            ...item,
            assignedTo: isAssigned ? currentAssigned.filter(id => id !== personId) : [...currentAssigned, personId],
            splitType: 'individual'
          }
        }
        return item
      })
    }))
  }, [])

  const splitItemEqually = useCallback((itemId: string) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.productId === itemId) {
          return {
            ...item,
            assignedTo: prev.people.map(person => person.id),
            splitType: 'shared'
          }
        }
        return item
      })
    }))
  }, [])

  const getUnassignedItems = useCallback(() => {
    return newOrder.items.filter(item => !item.assignedTo || item.assignedTo.length === 0)
  }, [newOrder.items])

  // --- Submit ---
  const handleSubmitOrder = useCallback(async () => {
    if (!newOrder.customerName.trim() || newOrder.items.length === 0) {
      notify('error', 'Preencha todos os campos obrigatórios')
      return
    }
    if (newOrder.orderType === 'dine_in' && !newOrder.tableNumber.trim()) {
      notify('error', 'Número da mesa é obrigatório')
      return
    }
    if (newOrder.splitBill) {
      if (newOrder.people.length === 0) {
        notify('error', 'Adicione pessoas para dividir a conta')
        return
      }
      if (newOrder.people.some(p => !p.name.trim())) {
        notify('error', 'Preencha o nome de todas as pessoas')
        return
      }
      if (getUnassignedItems().length > 0) {
        notify('error', 'Existem itens não atribuídos')
        return
      }
    }

    try {
      setLoading(true)

      // 1. Resolve Table ID if dine_in
      let tableId = null
      if (newOrder.orderType === 'dine_in') {
        const table = tables.find(t => t.number === newOrder.tableNumber)
        if (!table) {
          notify('error', `Mesa ${newOrder.tableNumber} não encontrada`)
          setLoading(false)
          return
        }
        tableId = table.id
      }

      // 2. Prepare and Create Orders
      if (newOrder.splitBill) {
        // Multi-order creation logic
        let successCount = 0

        for (const person of newOrder.people) {
          // Get individual items
          const personItems = newOrder.items.filter(item =>
            item.assignedTo?.includes(person.id)
          )

          // If no items, skip
          if (personItems.length === 0) continue

          // Prepare items for DB
          // NOTE: Shared items are assigned fully to the first person in the list to avoid complex backend splitting logic (price overrides)
          // Ideally backend should support fractional quantities or custom prices
          const dbItems = personItems.map(item => {
            // If shared, check if this person is the "primary" (first) assignee
            if (item.splitType === 'shared') {
              const isPrimary = item.assignedTo?.[0] === person.id
              if (!isPrimary) return null // Skip for others
              // Primary pays full price for shared item
            }
            return {
              productId: item.productId,
              quantity: item.quantity,
              notes: item.observations
            }
          }).filter(Boolean) as any[]

          if (dbItems.length === 0) continue

          const result = await createOrder({
            businessId,
            type: newOrder.orderType === 'dine_in' ? 'DINE_IN' : 'PICKUP',
            customerName: person.name, // Use person name as customer
            customerPhone: newOrder.customerPhone || 'Não informado',
            tableId: tableId || undefined,
            items: dbItems,
            notes: newOrder.observations
          })

          if (result.success) {
            successCount++
          } else {
            console.error('Erro ao criar pedido para', person.name, result.error)
            notify('error', `Erro ao criar pedido para ${person.name}`)
          }
        }

        if (successCount > 0) {
          notify('success', `${successCount} pedidos criados com sucesso!`)
          onOpenChange(false)
          onOrderCreated?.()
        }

      } else {
        // Single Order
        const dbItems = newOrder.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.observations
        }))

        const result = await createOrder({
          businessId,
          type: newOrder.orderType === 'dine_in' ? 'DINE_IN' : 'PICKUP',
          customerName: newOrder.customerName,
          customerPhone: newOrder.customerPhone || 'Não informado',
          tableId: tableId || undefined,
          items: dbItems,
          notes: newOrder.observations
        })

        if (result.success) {
          notify('success', 'Pedido criado com sucesso!')
          onOpenChange(false)
          onOrderCreated?.()
        } else {
          notify('error', result.error || 'Erro ao criar pedido')
        }
      }

    } catch (err) {
      console.error(err)
      notify('error', 'Erro interno ao criar pedido')
    } finally {
      setLoading(false)
    }
  }, [newOrder, getUnassignedItems, onOpenChange, onOrderCreated, tables])

  // --- Render Helpers ---

  // Category Tabs
  const renderCategoryTabs = () => (
    <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide border-b border-slate-100" ref={categoryScrollRef}>
      <button
        onClick={() => setSelectedCategory('all')}
        className={cn(
          "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
          selectedCategory === 'all'
            ? "bg-slate-900 text-white shadow-md"
            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
        )}
      >
        Todas
      </button>
      {categories.filter(c => c !== 'all').map(cat => (
        <button
          key={cat}
          onClick={() => setSelectedCategory(cat)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
            selectedCategory === cat
              ? "bg-slate-900 text-white shadow-md"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  )

  // Product Grid
  const renderProductGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 lg:pb-0">
      {filteredProducts.map(product => {
        const qty = getItemQuantity(product.id)
        return (
          <div
            key={product.id}
            className={cn(
              "group relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md bg-white",
              qty > 0 ? "border-orange-200 ring-1 ring-orange-100" : "border-slate-100"
            )}
            onClick={() => addItemToOrder(product)}
          >
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-slate-800 leading-tight">{product.name}</h3>
                <span className="font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded-md text-sm border border-slate-100">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                </span>
              </div>
              <p className="text-sm text-slate-500 line-clamp-2 min-h-[2.5em]">
                {product.description || 'Sem descrição disponível.'}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
              <Badge variant="outline" className="text-xs font-normal text-slate-400 bg-slate-50 border-slate-100">
                {product.category.name}
              </Badge>

              {qty > 0 ? (
                <div className="flex items-center bg-white border border-orange-200 rounded-lg shadow-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="px-3 py-1 hover:bg-orange-50 text-orange-600 transition-colors"
                    onClick={() => updateItemQuantity(product.id, qty - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-sm font-bold text-orange-700 w-6 text-center">{qty}</span>
                  <button
                    className="px-3 py-1 hover:bg-orange-50 text-orange-600 transition-colors"
                    onClick={() => updateItemQuantity(product.id, qty + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
                  <Plus className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  // Right Panel (Order Summary to look like a receipt/bill)
  const renderOrderSummaryPanel = () => (
    <div className="flex flex-col h-full bg-slate-50 border-l border-slate-200">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-white">
        <h2 className="font-bold text-lg flex items-center gap-2 text-slate-800">
          <Receipt className="h-5 w-5 text-orange-500" />
          Detalhes do Pedido
        </h2>
      </div>

      {/* Form Fields */}
      <div className="p-5 space-y-4 bg-white border-b border-slate-200">
        <div className="space-y-3">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Nome do Cliente"
              value={newOrder.customerName}
              onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
              className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
            />
          </div>

          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center">
              <span className="text-slate-400 font-bold text-xs">📞</span>
            </div>
            <Input
              placeholder="Telefone (Opcional)"
              value={newOrder.customerPhone || ''}
              onChange={(e) => setNewOrder({ ...newOrder, customerPhone: e.target.value })}
              className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              value={newOrder.orderType}
              onValueChange={(v: any) => setNewOrder({ ...newOrder, orderType: v })}
            >
              <SelectTrigger className="bg-slate-50 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dine_in">
                  <span className="flex items-center gap-2"><Utensils className="h-4 w-4" /> No Local</span>
                </SelectItem>
                <SelectItem value="pickup">
                  <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Retirada</span>
                </SelectItem>
              </SelectContent>
            </Select>

            {newOrder.orderType === 'dine_in' && (
              <div className="relative">
                <Armchair className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Mesa"
                  value={newOrder.tableNumber}
                  onChange={(e) => setNewOrder({ ...newOrder, tableNumber: e.target.value })}
                  className="pl-9 bg-slate-50 border-slate-200"
                />
              </div>
            )}
          </div>

          {newOrder.orderType === 'dine_in' && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="splitBill"
                checked={newOrder.splitBill}
                onChange={(e) => setNewOrder({ ...newOrder, splitBill: e.target.checked, people: e.target.checked ? newOrder.people : [] })}
                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
              />
              <label htmlFor="splitBill" className="text-sm text-slate-600 font-medium cursor-pointer select-none">Dividir conta entre pessoas</label>
            </div>
          )}
        </div>

        {newOrder.splitBill && (
          <div className="bg-orange-50 rounded-lg p-3 border border-orange-100 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-orange-800 uppercase tracking-wide">Pessoas na Mesa</span>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-orange-700 hover:bg-orange-100" onClick={addPerson}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-orange-200">
              {newOrder.people.length === 0 && <p className="text-xs text-orange-400 italic text-center py-2">Nenhuma pessoa adicionada</p>}
              {newOrder.people.map(p => (
                <div key={p.id} className="flex gap-2">
                  <Input
                    placeholder="Nome da pessoa"
                    value={p.name}
                    onChange={(e) => updatePersonName(p.id, e.target.value)}
                    className="h-8 text-xs bg-white border-orange-200 focus:border-orange-400"
                  />
                  <Button size="sm" variant="ghost" onClick={() => removePerson(p.id)} className="h-8 w-8 p-0 text-orange-400 hover:text-red-500 hover:bg-white">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Itens do Pedido ({newOrder.items.length})</h3>

        {newOrder.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <ShoppingCart className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Carrinho vazio</p>
          </div>
        ) : (
          <div className="space-y-3">
            {newOrder.items.map(item => (
              <div key={item.productId} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2 group hover:border-orange-300 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{item.productName}</p>
                    <p className="text-xs text-slate-500">
                      {item.quantity}x {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900 text-sm">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price * item.quantity)}
                  </span>
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-1 opacity-100 lg:opacity-60 lg:group-hover:opacity-100 transition-opacity">
                  {/* Split Actions */}
                  {newOrder.splitBill && newOrder.people.length > 0 ? (
                    <div className="flex gap-1 flex-wrap">
                      <Button size="icon" variant="ghost" className="h-6 w-6" title="Dividir igualmente" onClick={() => splitItemEqually(item.productId)}>
                        <Split className="h-3 w-3 text-slate-500" />
                      </Button>
                      {newOrder.people.map(p => (
                        <button
                          key={p.id}
                          onClick={() => assignItemToPerson(item.productId, p.id)}
                          className={cn(
                            "h-6 w-6 rounded-full text-[10px] font-bold flex items-center justify-center border transition-all",
                            item.assignedTo?.includes(p.id)
                              ? "bg-orange-100 text-orange-700 border-orange-300 transform scale-110"
                              : "bg-slate-50 text-slate-400 border-slate-200 hover:border-orange-200"
                          )}
                          title={p.name}
                        >
                          {p.name.charAt(0).toUpperCase() || '?'}
                        </button>
                      ))}
                    </div>
                  ) : <div />}

                  <div className="flex items-center gap-2 bg-slate-50 rounded-md p-0.5 border border-slate-100">
                    <button onClick={() => updateItemQuantity(item.productId, item.quantity - 1)} className="p-1 hover:bg-white rounded text-slate-500 hover:text-red-500 transition-colors"><Minus className="h-3 w-3" /></button>
                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateItemQuantity(item.productId, item.quantity + 1)} className="p-1 hover:bg-white rounded text-slate-500 hover:text-green-500 transition-colors"><Plus className="h-3 w-3" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Totals */}
      <div className="p-5 bg-white border-t border-slate-200 space-y-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Total do Pedido</p>
            {newOrder.items.length > 0 && <p className="text-xs text-slate-400">{newOrder.items.length} itens</p>}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateTotal())}
          </h1>
        </div>

        {newOrder.splitBill && getUnassignedItems().length > 0 && (
          <div className="bg-red-50 text-red-600 px-3 py-2 rounded-md text-xs font-medium flex items-center gap-2 animate-pulse">
            <Split className="h-3 w-3" />
            Existem {getUnassignedItems().length} itens não divididos!
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="col-span-1 border-slate-200 hover:bg-slate-50 text-slate-700">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmitOrder}
            disabled={!newOrder.customerName.trim() || newOrder.items.length === 0}
            className="col-span-2 bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20"
          >
            <Clock className="h-4 w-4 mr-2" />
            Confirmar Pedido
          </Button>
        </div>
      </div>
    </div>
  )

  // --- Main Content (Wrapper) ---
  const MainContent = (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-slate-50/50">
      {/* Left Column: Catalog */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Bar */}
        <div className="p-4 sm:p-6 pb-2 space-y-4 bg-white/50 backdrop-blur-sm z-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Buscar no cardápio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-base rounded-xl border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-slate-900/10 transition-all"
            />
          </div>
          {renderCategoryTabs()}
        </div>

        {/* Grid */}
        <ScrollArea className="flex-1 p-4 sm:p-6 pt-2">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin h-8 w-8 border-2 border-slate-900 rounded-full border-t-transparent"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <p>Nenhum produto encontrado.</p>
            </div>
          ) : (
            renderProductGrid()
          )}
        </ScrollArea>
      </div>

      {/* Right Column: Order Panel (Desktop only - creates split view) */}
      {!isMobile && (
        <div className="w-[400px] flex-shrink-0 h-full bg-white shadow-xl z-20">
          {renderOrderSummaryPanel()}
        </div>
      )}
    </div>
  )

  // Mobile Sheet View
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[95vh] p-0 rounded-t-[20px] overflow-hidden flex flex-col border-none shadow-2xl">
          <SheetTitle className="sr-only">Novo Pedido</SheetTitle>
          <div className="h-1.5 w-12 bg-slate-300 rounded-full mx-auto mt-3 mb-1 opacity-50" />
          {/* Navigation/Tabs for Mobile? Or just stacked? 
              For mobile, we might want to toggle between Catalog and Cart if space is tight, 
              or just keep the Cart at the bottom sheet style. 
              
              Let's make it simple: Catalog View with a Floating "View Cart" button if items > 0, 
              or a bottom bar summary. 
          */}

          <div className="flex-1 overflow-hidden relative">
            {MainContent}

            {/* Mobile Sticky Footer representing Mini Cart */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Total Previsto</span>
                  <span className="text-xl font-bold text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateTotal())}</span>
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">{newOrder.items.length} itens</Badge>
              </div>

              {/* Expandable Cart / Finalize Drawer Trigger would go here normally, 
                    but to keep it simple, we can put the form fields in a separate 'Checkout' step 
                    or just render the SummaryPanel in a nested Sheet or Tab.
                    
                    For now, reusing OrderSummaryPanel in a tab/mode logic or just stacking it 
                    might be too complex for this single-file refactor.
                    
                    Let's use a "Review Order" Overlay on Mobile.
                */}

              <Sheet>
                <SheetTrigger asChild>
                  <Button className="w-full h-12 text-base font-semibold bg-slate-900 text-white mb-safe">
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Revisar & Finalizar
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[90vh] p-0 rounded-t-[20px] overflow-hidden">
                  <SheetTitle className="sr-only">Revisar Pedido</SheetTitle>
                  {renderOrderSummaryPanel()}
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop Dialog View
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden border-none bg-transparent shadow-2xl">
        <DialogTitle className="sr-only">Novo Pedido</DialogTitle>
        <div className="h-full bg-white rounded-lg overflow-hidden flex">
          {MainContent}
        </div>
      </DialogContent>
    </Dialog>
  )
}