'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
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
  UtensilsCrossed,
  Search,
  Users,
  Split,
  Trash2
} from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { toastHelpers } from '@/lib/toast-helpers'
import { useIsMobile } from '@/hooks/use-mobile'

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
  assignedTo?: string[] // IDs das pessoas que vão pagar por este item
  splitType?: 'individual' | 'shared' // individual = uma pessoa específica, shared = dividido igualmente
}

interface Person {
  id: string
  name: string
  items: OrderItem[]
}

interface NewOrder {
  customerName: string
  tableNumber: string
  items: OrderItem[]
  orderType: 'dine_in' | 'pickup'
  observations?: string
  splitBill: boolean
  people: Person[]
}

export default function WaiterOrdersPage() {
  const [loading, setLoading] = useState(true)
  const [firstRender, setFirstRender] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false)
  const [newOrder, setNewOrder] = useState<NewOrder>({
    customerName: '',
    tableNumber: '',
    items: [],
    orderType: 'dine_in',
    splitBill: false,
    people: []
  })
  
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const isMobile = useIsMobile()

  // Buscar produtos reais
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/products', { headers: { 'Cache-Control': 'no-cache' } })
      if (!res.ok) {
        if (res.status === 404) {
          setProducts([])
          return
        }
        throw new Error('Falha ao buscar produtos')
      }
      const data: Product[] = await res.json()
      setProducts(data)
  } catch {
      toastHelpers.system.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }, [])

  // Carregar quando sessão disponível
  useEffect(() => {
    if (firstRender) setFirstRender(false)
    if (isPending) return
    if (!session) {
      router.push('/login')
      return
    }
    if (loading) {
      loadProducts()
    }
  }, [session, isPending, router, loading, loadProducts, firstRender])

  // Memoizar categorias para evitar recálculo
  const categories = useMemo(() => {
    return ['all', ...Array.from(new Set(products.map(p => p.category.name)))]
  }, [products])

  // Memoizar produtos filtrados
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'all' || product.category.name === selectedCategory
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesCategory && matchesSearch && product.isAvailable
    })
  }, [products, selectedCategory, searchTerm])

  // Funções estáveis com useCallback para evitar re-renders
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
      if (quantity === 0) {
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

  // Funções para divisão de conta
  const addPerson = useCallback(() => {
    const personId = `person-${Date.now()}`
    setNewOrder(prev => ({
      ...prev,
      people: [...prev.people, {
        id: personId,
        name: '',
        items: []
      }]
    }))
  }, [])

  const updatePersonName = useCallback((personId: string, name: string) => {
    setNewOrder(prev => ({
      ...prev,
      people: prev.people.map(person => 
        person.id === personId ? { ...person, name } : person
      )
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
            assignedTo: isAssigned 
              ? currentAssigned.filter(id => id !== personId)
              : [...currentAssigned, personId],
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

  const calculatePersonTotal = useCallback((personId: string) => {
    return newOrder.items.reduce((total, item) => {
      if (!item.assignedTo?.includes(personId)) return total
      
      const itemTotal = item.price * item.quantity
      if (item.splitType === 'shared' && item.assignedTo) {
        return total + (itemTotal / item.assignedTo.length)
      }
      return total + itemTotal
    }, 0)
  }, [newOrder.items])

  const getUnassignedItems = useCallback(() => {
    return newOrder.items.filter(item => !item.assignedTo || item.assignedTo.length === 0)
  }, [newOrder.items])

  const handleSubmitOrder = useCallback(async () => {
    if (!newOrder.customerName.trim() || newOrder.items.length === 0) {
      toastHelpers.system.error('Preencha todos os campos obrigatórios')
      return
    }

    if (newOrder.orderType === 'dine_in' && !newOrder.tableNumber.trim()) {
      toastHelpers.system.error('Número da mesa é obrigatório para pedidos no local')
      return
    }

    if (newOrder.splitBill) {
      if (newOrder.people.length === 0) {
        toastHelpers.system.error('Adicione pelo menos uma pessoa para dividir a conta')
        return
      }

      const peopleWithoutNames = newOrder.people.filter(person => !person.name.trim())
      if (peopleWithoutNames.length > 0) {
        toastHelpers.system.error('Todos os nomes das pessoas devem ser preenchidos')
        return
      }

      const unassignedItems = getUnassignedItems()
      if (unassignedItems.length > 0) {
        toastHelpers.system.error(`${unassignedItems.length} itens não foram atribuídos a ninguém`)
        return
      }
    }

    try {
      if (newOrder.splitBill) {
        // Se for divisão de conta, criar um pedido para cada pessoa
        for (const person of newOrder.people) {
          const personItems = newOrder.items.filter(item => 
            item.assignedTo?.includes(person.id)
          ).map(item => {
            if (item.splitType === 'shared' && item.assignedTo) {
              return {
                ...item,
                quantity: item.quantity / item.assignedTo.length,
                price: item.price
              }
            }
            return item
          })

          const personOrder = {
            ...newOrder,
            customerName: `${person.name} (Mesa ${newOrder.tableNumber})`,
            items: personItems,
            splitBill: false,
            people: []
          }

          console.log(`Enviando pedido para ${person.name}:`, personOrder)
        }
        
        toastHelpers.system.success(`${newOrder.people.length} pedidos criados com sucesso (conta dividida)!`)
      } else {
        console.log('Enviando pedido:', newOrder)
        toastHelpers.system.success('Pedido criado com sucesso!')
      }
      
      setNewOrder({
        customerName: '',
        tableNumber: '',
        items: [],
        orderType: 'dine_in',
        splitBill: false,
        people: []
      })
      
      setIsNewOrderOpen(false)
      
    } catch (err) {
      console.error('Erro ao criar pedido:', err)
      toastHelpers.system.error('Erro ao criar pedido')
    }
  }, [newOrder, getUnassignedItems])

  // Componente do conteúdo do formulário otimizado
  const NewOrderFormContent = useMemo(() => (
    <div className="space-y-6">
      {/* Filtros de produtos */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.filter(cat => cat !== 'all').map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de Produtos Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Produtos Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
            {filteredProducts.map(product => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium text-slate-800 text-sm">{product.name}</h3>
                  <p className="text-xs text-slate-600 line-clamp-1">{product.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {product.category.name}
                    </Badge>
                    <span className="font-bold text-orange-600 text-sm">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(product.price)}
                    </span>
                  </div>
                </div>
                
                <Button 
                  size="sm"
                  onClick={() => addItemToOrder(product)}
                  className="bg-orange-500 hover:bg-orange-600 ml-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dados do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <User className="h-5 w-5 mr-2" />
            Dados do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Nome do Cliente *
            </label>
            <Input
              placeholder="Digite o nome..."
              value={newOrder.customerName}
              onChange={(e) => setNewOrder(prev => ({
                ...prev,
                customerName: e.target.value
              }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Tipo de Pedido *
            </label>
            <Select 
              value={newOrder.orderType} 
              onValueChange={(value: 'dine_in' | 'pickup') => 
                setNewOrder(prev => ({ ...prev, orderType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dine_in">
                  <div className="flex items-center">
                    <UtensilsCrossed className="h-4 w-4 mr-2" />
                    No Local (Mesa)
                  </div>
                </SelectItem>
                <SelectItem value="pickup">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Retirada no Balcão
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {newOrder.orderType === 'dine_in' && (
            <div>
              <label className="text-sm font-medium text-slate-700">
                Número da Mesa *
              </label>
              <Input
                placeholder="Ex: 12"
                value={newOrder.tableNumber}
                onChange={(e) => setNewOrder(prev => ({
                  ...prev,
                  tableNumber: e.target.value
                }))}
              />
            </div>
          )}

          {/* Opção de dividir conta */}
          {newOrder.orderType === 'dine_in' && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="splitBill"
                checked={newOrder.splitBill}
                onChange={(e) => setNewOrder(prev => ({
                  ...prev,
                  splitBill: e.target.checked,
                  people: e.target.checked ? prev.people : []
                }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="splitBill" className="text-sm font-medium text-slate-700 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Dividir conta entre pessoas
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gerenciamento de Pessoas (quando divisão está ativada) */}
      {newOrder.splitBill && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Pessoas na Mesa ({newOrder.people.length})
              </div>
              <Button
                size="sm"
                onClick={addPerson}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Plus className="h-3 w-3 mr-1" />
                Adicionar Pessoa
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {newOrder.people.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                Adicione pessoas para dividir a conta
              </p>
            ) : (
              newOrder.people.map(person => (
                <div key={person.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Input
                    placeholder="Nome da pessoa..."
                    value={person.name}
                    onChange={(e) => updatePersonName(person.id, e.target.value)}
                    className="flex-1"
                  />
                  <div className="text-sm font-medium text-slate-700">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(calculatePersonTotal(person.id))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removePerson(person.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
            
            {getUnassignedItems().length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-800">
                  ⚠️ {getUnassignedItems().length} itens não foram atribuídos a ninguém
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Carrinho */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Carrinho ({newOrder.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {newOrder.items.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              Nenhum item adicionado
            </p>
          ) : (
            <div className="space-y-3">
              {newOrder.items.map(item => (
                <div key={item.productId} className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.productName}</p>
                      <p className="text-xs text-slate-600">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(item.price)}
                      </p>
                      {item.assignedTo && item.assignedTo.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {item.splitType === 'shared' 
                              ? `Dividido entre ${item.assignedTo.length} pessoas`
                              : `Atribuído a ${item.assignedTo.length} pessoa(s)`
                            }
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  
                  {/* Opções de divisão para o item */}
                  {newOrder.splitBill && newOrder.people.length > 0 && (
                    <div className="ml-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => splitItemEqually(item.productId)}
                          className="text-xs"
                        >
                          <Split className="h-3 w-3 mr-1" />
                          Dividir Igualmente
                        </Button>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {newOrder.people.map(person => (
                          <Button
                            key={person.id}
                            size="sm"
                            variant={item.assignedTo?.includes(person.id) ? "default" : "outline"}
                            onClick={() => assignItemToPerson(item.productId, person.id)}
                            className="text-xs"
                          >
                            {person.name || `Pessoa ${newOrder.people.indexOf(person) + 1}`}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              <Separator />
              
              {/* Resumo da divisão de conta */}
              {newOrder.splitBill && newOrder.people.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Resumo por pessoa:</p>
                  {newOrder.people.map(person => (
                    <div key={person.id} className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">
                        {person.name || `Pessoa ${newOrder.people.indexOf(person) + 1}`}:
                      </span>
                      <span className="font-medium">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(calculatePersonTotal(person.id))}
                      </span>
                    </div>
                  ))}
                  <Separator />
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-700">Total:</span>
                <span className="font-bold text-lg text-orange-600">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(calculateTotal())}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  ), [
    searchTerm,
    selectedCategory,
    categories,
    filteredProducts,
    addItemToOrder,
    newOrder,
    addPerson,
    updatePersonName,
    calculatePersonTotal,
    removePerson,
    getUnassignedItems,
    updateItemQuantity,
    assignItemToPerson,
    splitItemEqually,
    calculateTotal
  ])

  // Footer do formulário otimizado
  const NewOrderFooter = useMemo(() => (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        onClick={() => setIsNewOrderOpen(false)}
        className="flex-1"
      >
        Cancelar
      </Button>
      <Button 
        onClick={handleSubmitOrder}
        disabled={!newOrder.customerName.trim() || newOrder.items.length === 0}
        className="bg-orange-500 hover:bg-orange-600 flex-1"
      >
        <Clock className="h-4 w-4 mr-2" />
        Enviar Pedido
      </Button>
    </div>
  ), [handleSubmitOrder, newOrder.customerName, newOrder.items.length])

  // Não retornar tela cheia aqui; layout já cuida do bootstrap inicial.
  if (isPending) {
    return (
      <div className="p-6">
        <div className="animate-pulse text-sm text-slate-500">Preparando sessão...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-1/3 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Pedidos dos Garçons</h1>
          <p className="text-sm sm:text-base text-slate-600">Crie pedidos para clientes no balcão ou nas mesas</p>
        </div>
        
        <div className="flex items-center justify-end">
          {/* Botão que abre Dialog no desktop e Sheet no mobile */}
          {isMobile ? (
            <Sheet open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
              <SheetTrigger asChild>
                <Button className="bg-orange-500 hover:bg-orange-600 w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Pedido
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[96vh] overflow-hidden rounded-t-2xl px-4 flex flex-col">
                <SheetHeader className='pt-8 px-0'>
                  <SheetTitle>Criar Novo Pedido</SheetTitle>
                  <SheetDescription>
                    Adicione produtos ao carrinho e finalize o pedido do cliente
                  </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto py-4">
                  {NewOrderFormContent}
                </div>

                <SheetFooter className="border-t pt-4 bg-white">
                  {NewOrderFooter}
                </SheetFooter>
              </SheetContent>
            </Sheet>
          ) : (
            <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Pedido
                </Button>
              </DialogTrigger>
              <DialogContent className="min-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Criar Novo Pedido</DialogTitle>
                  <DialogDescription>
                    Adicione produtos ao carrinho e finalize o pedido do cliente
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
                  {NewOrderFormContent}
                </div>

                <DialogFooter className="border-t pt-4 bg-white">
                  {NewOrderFooter}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  )
}
