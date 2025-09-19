'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from '@/lib/auth-client'
import { toastHelpers } from '@/lib/toast-helpers'
import { useAutoOpenClose } from '@/hooks/use-auto-open-close'
import { useRestaurantStatus } from '@/hooks/use-restaurant-status'
import { parseOpeningHours, type WeeklyHours } from '@/lib/utils-app'
import { PWAHeader } from '@/components/pwa-header'
import { UserProfileSheet } from '@/components/user-profile-sheet'
import { IntegratedCheckout } from '@/components/integrated-checkout'
import { ProductOptionsModal } from '@/components/product-options-modal'
import { CartProvider, useCart } from '@/contexts/cart-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import Image from 'next/image'
import { 
  MapPin,
  Clock, 
  Star,
  Bike,
  Store,
  Users,
  Plus,
  Minus,
  Timer,
  ChevronDown
} from 'lucide-react'

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

interface CategoryHierarchy {
  id: string
  name: string
  parentId: string | null
  order: number
  parent?: {
    id: string
    name: string
    order: number
  } | null
  subcategories: {
    id: string
    name: string
    order: number
  }[]
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

interface Restaurant {
  id: string
  name: string
  slug: string
  isOpen: boolean
  category: string
  description?: string
  rating?: number
  deliveryTime?: number
  address?: string
  openingHours?: string
  acceptsDelivery?: boolean
  acceptsPickup?: boolean
  acceptsDineIn?: boolean
  deliveryFee?: number
  minimumOrder?: number
  avatar?: string
  banner?: string
}

function RestaurantPageContent() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { addItem, removeItem, getItemQuantity, addItemWithOptions } = useCart()
  const [isLoading, setIsLoading] = useState(true)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [_products, setProducts] = useState<Product[]>([])
  const [productsByCategory, setProductsByCategory] = useState<Record<string, Product[]>>({})
  const [_categories, setCategories] = useState<string[]>([])
  const [categoriesHierarchy, setCategoriesHierarchy] = useState<CategoryHierarchy[]>([])
  const [orderType, setOrderType] = useState<'DELIVERY' | 'PICKUP' | 'DINE_IN' | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  // Estados para o modal de opções
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false)

  // Função para formatar horários de funcionamento
  const formatOpeningHours = (openingHours?: string | null): string => {
    if (!openingHours) return 'Horários não definidos'
    
    try {
      // Tentar parsear como JSON (formato completo)
      const hours = parseOpeningHours(openingHours)
      const today = new Date().getDay() // 0 = domingo, 1 = segunda, etc.
      const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const todayKey = dayKeys[today] as keyof WeeklyHours
      const todaySchedule = hours[todayKey]
      
      if (todaySchedule.closed) {
        return 'Fechado hoje'
      }
      
      return `${todaySchedule.open} - ${todaySchedule.close}`
    } catch {
      // Se não conseguir parsear como JSON, retornar como string simples
      return openingHours
    }
  }

  // Auto abre/fecha apenas para refletir na UI (não persiste no servidor na página pública)
  useAutoOpenClose(restaurant?.openingHours ?? null, {
    syncToServer: false,
    onStatusChange: (isOpen) => {
      setRestaurant(prev => (prev ? { ...prev, isOpen } : prev))
    }
  })

  // Verificação periódica do status do restaurante
  const { status: restaurantStatus, isLoading: statusLoading, error: _statusError } = useRestaurantStatus({
    slug: params.slug as string,
    enabled: !!restaurant,
    refreshInterval: 30000 // 30 segundos
  })

  // Validação e carregamento do restaurante
  useEffect(() => {
    const validateRestaurant = async () => {
      try {
        const slug = params.slug as string
        
        // Buscar dados do restaurante da API
        const restaurantResponse = await fetch(`/api/restaurant/${slug}`)
        
        if (!restaurantResponse.ok) {
          toastHelpers.system.error('Restaurante não encontrado')
          router.push('/')
          return
        }
        
        const restaurantData = await restaurantResponse.json()
        setRestaurant(restaurantData)
        
        // Buscar produtos do restaurante
        const productsResponse = await fetch(`/api/restaurant/${slug}/products`)
        
        if (productsResponse.ok) {
          const productsData = await productsResponse.json()
          console.log('Dados recebidos da API:', {
            categoriesHierarchy: productsData.categoriesHierarchy,
            categories: productsData.categories
          })
          
          setProducts(productsData.products)
          setProductsByCategory(productsData.productsByCategory)
          setCategories(productsData.categories)
          setCategoriesHierarchy(productsData.categoriesHierarchy || [])
          
          // Definir primeira categoria como selecionada
          if (productsData.categories.length > 0) {
            setSelectedCategory(productsData.categories[0])
          }
        }
        
        toastHelpers.system.success('Cardápio carregado com sucesso!')
      } catch {
        toastHelpers.system.error('Erro ao carregar o restaurante')
        router.push('/')
      } finally {
        setIsLoading(false)
      }
    }

    validateRestaurant()
  }, [params.slug, router])

  const addToCart = (product: Product) => {
    if (!restaurant) return
    
    // Verificar se o restaurante pode aceitar pedidos
    if (restaurantStatus && !restaurantStatus.canAcceptOrders) {
      toastHelpers.system.error(
        restaurantStatus.message || 'Restaurante não está aceitando pedidos no momento'
      )
      return
    }
    
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      description: product.description || '',
      basePrice: product.price,
      finalPrice: product.price,
      image: product.image,
      category: product.category,
      restaurantId: restaurant.id
    })
  }

  const handleProductClick = async (product: Product) => {
    // Verificar se o restaurante pode aceitar pedidos
    if (restaurantStatus && !restaurantStatus.canAcceptOrders) {
      toastHelpers.system.error(
        restaurantStatus.message || 'Restaurante não está aceitando pedidos no momento'
      )
      return
    }
    
    try {
      // Buscar opções do produto
      const response = await fetch(`/api/products/${product.id}/options`)
      if (response.ok) {
        const data = await response.json()
        const productWithOptions = { ...product, options: data.product.options }
        
        // Se o produto tem opções, abrir modal
        if (data.product.options && data.product.options.length > 0) {
          setSelectedProduct(productWithOptions)
          setIsOptionsModalOpen(true)
        } else {
          // Se não tem opções, adicionar diretamente ao carrinho
          addToCart(product)
        }
      } else {
        // Em caso de erro, adicionar sem opções
        addToCart(product)
      }
    } catch (error) {
      console.error('Erro ao buscar opções do produto:', error)
      // Em caso de erro, adicionar sem opções
      addToCart(product)
    }
  }

  const handleAddToCartWithOptions = (
    product: Product, 
    selectedOptions: { [optionGroupId: string]: string[] }, 
    quantity: number, 
    totalPrice: number
  ) => {
    if (!restaurant) return

    // Verificar se o restaurante pode aceitar pedidos
    if (restaurantStatus && !restaurantStatus.canAcceptOrders) {
      toastHelpers.system.error(
        restaurantStatus.message || 'Restaurante não está aceitando pedidos no momento'
      )
      return
    }

    // Gerar texto descritivo das opções
    const optionsText = generateOptionsText(product, selectedOptions)
    
    addItemWithOptions(
      product.id,
      product.name,
      product.description || '',
      product.price,
      totalPrice / quantity, // Preço unitário final
      product.image,
      product.category,
      restaurant.id,
      selectedOptions,
      optionsText,
      quantity
    )
  }

  const generateOptionsText = (product: Product, selectedOptions: { [optionGroupId: string]: string[] }): string => {
    if (!product.options) return ''
    
    const texts: string[] = []
    
    product.options.forEach(optionGroup => {
      const selectedItems = selectedOptions[optionGroup.id] || []
      if (selectedItems.length > 0) {
        const itemNames = selectedItems
          .map((itemId: string) => {
            const item = optionGroup.options.find(opt => opt.id === itemId)
            return item ? item.name : ''
          })
          .filter(Boolean)
        
        if (itemNames.length > 0) {
          texts.push(`${optionGroup.name}: ${itemNames.join(', ')}`)
        }
      }
    })
    
    return texts.join(' | ')
  }

  const removeFromCart = (productId: string) => {
    removeItem(productId)
  }

  const handleOrderTypeSelect = (type: 'DELIVERY' | 'PICKUP' | 'DINE_IN') => {
    // Para delivery, verificar se o usuário está logado
    if (type === 'DELIVERY') {
      if (!session?.user) {
        toastHelpers.auth.error('É necessário fazer login para pedidos delivery')
        router.push(`/customer-login?redirectTo=${encodeURIComponent(`/${params.slug}`)}`)
        return
      }
    }
    
    setOrderType(type)
    toastHelpers.system.success(`Modalidade selecionada: ${
      type === 'DELIVERY' ? 'Delivery' : 
      type === 'PICKUP' ? 'Retirada' : 
      'Consumo Local'
    }`)
  }

  const getCartItemQuantity = (productId: string) => {
    return getItemQuantity(productId)
  }

  // Estado de carregamento
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando restaurante...</p>
        </div>
      </div>
    )
  }

  // Se não encontrou o restaurante, não renderiza nada (redirecionou)
  if (!restaurant) {
    return null
  }

  if (!orderType) {
    return (
      <div className="min-h-screen bg-white">
        {/* PWA Header - Menu only, transparent initially, blur on scroll */}
        <PWAHeader 
          menuOnly={true}
          scrollBlur={true}
          className="lg:hidden"
        />
        
        {/* Restaurant Header - Mobile PWA Optimized */}
        <div className="relative">
          {/* Banner Background - Full height from top */}
          <div className="h-48 sm:h-64 bg-gradient-to-r from-orange-500 to-orange-600">
            {restaurant.banner ? (
              <Image 
                src={restaurant.banner} 
                alt="Banner do restaurante"
                width={800}
                height={256}
                className="w-full h-48 sm:h-64 object-cover"
                priority
              />
            ) : null}
          </div>
          
          {/* Restaurant Info - No Card, Mobile First */}
          <div className="px-4 -mt-12 sm:-mt-20 relative z-10 pb-6">
            {/* Centered Avatar */}
            <div className="flex justify-center mb-4">
              <Avatar className="w-24 h-24 sm:w-28 sm:h-28 border-4 border-white shadow-lg">
                <AvatarImage src={restaurant.avatar || "/placeholder-restaurant.jpg"} />
                <AvatarFallback className="text-xl sm:text-2xl bg-white">
                  {restaurant.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            
            {/* Restaurant Details - Centered Layout */}
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <div className="text-center space-y-3">
                {/* Name, Status and Collapsible Trigger */}
                <div className="flex items-center justify-center gap-3">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
                    {restaurant.name}
                  </h1>
                  {/* Status Badge - Atualizado com status em tempo real */}
                  {statusLoading ? (
                    <Badge variant="secondary" className="text-xs animate-pulse">Verificando...</Badge>
                  ) : restaurantStatus?.canAcceptOrders ? (
                    <Badge className="bg-green-100 text-green-800 text-xs">Aberto - Aceitando Pedidos</Badge>
                  ) : restaurantStatus?.isOpen ? (
                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">Aberto - Não Aceitando Pedidos</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800 text-xs">Fechado</Badge>
                  )}
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-800 p-1 h-auto ml-1">
                      <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent className="mt-3 space-y-3">
                  {/* Description */}
                  {restaurant.description && (
                    <p className="text-slate-600 text-sm sm:text-base max-w-sm mx-auto leading-relaxed">
                      {restaurant.description}
                    </p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                    {restaurant.rating && (
                      <div className="flex items-center justify-center gap-1 text-xs text-slate-600 bg-white/80 rounded-full py-1.5 px-2">
                        <Star className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                        <span className="font-medium">{restaurant.rating}</span>
                      </div>
                    )}
                    
                    {restaurant.deliveryTime && (
                      <div className="flex items-center justify-center gap-1 text-xs text-slate-600 bg-white/80 rounded-full py-1.5 px-2">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span>{restaurant.deliveryTime} min</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-center gap-1 text-xs text-slate-600 bg-white/80 rounded-full py-1.5 px-2 col-span-2">
                      <Timer className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{formatOpeningHours(restaurant.openingHours)}</span>
                    </div>
                    
                    {restaurant.address && (
                      <div className="flex items-center justify-center gap-1 text-xs text-slate-600 bg-white/80 rounded-full py-1.5 px-2 col-span-2">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{restaurant.address}</span>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>
        </div>

        {/* Order Type Selection - Mobile PWA Optimized */}
        <div className="px-4">
          <div className="text-center mb-6">
            <h2 className="text-md sm:text-2xl font-bold text-slate-800 mb-2">
              Como você gostaria de receber seu pedido?
            </h2>
          </div>
          
          {/* Stack vertically on mobile */}
          <div className="space-y-3 max-w-md mx-auto">
            {restaurant.acceptsDelivery && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-orange-200 active:border-orange-300"
                  onClick={() => handleOrderTypeSelect('DELIVERY')}
                >
                  <CardContent className='h-2'>
                    <div className="flex items-center h-2 justify-center gap-3">
                      <Bike className="h-5 w-5 text-orange-600" />
                      <h3 className="text-base font-semibold text-slate-800">
                        Delivery
                      </h3>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
            
            {restaurant.acceptsPickup && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full"
              >
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-blue-200 active:border-blue-300"
                  onClick={() => handleOrderTypeSelect('PICKUP')}
                >
                  <CardContent className='h-2'>
                    <div className="flex items-center h-2 justify-center gap-3">
                      <Store className="h-5 w-5 text-blue-600" />
                      <h3 className="text-base font-semibold text-slate-800">
                        Retirar no Balcão
                      </h3>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
            
            {restaurant.acceptsDineIn && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full"
              >
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-green-200 active:border-green-300"
                  onClick={() => handleOrderTypeSelect('DINE_IN')}
                >
                  <CardContent className='h-2'>
                    <div className="flex items-center h-2 justify-center gap-3">
                      <Users className="h-5 w-5 text-green-600" />
                      <h3 className="text-base font-semibold text-slate-800">
                        Estou no Local
                      </h3>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
        
        {/* User Profile Sheet - Global */}
        <UserProfileSheet />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* PWA Header - Normal with back button and white background */}
      <PWAHeader 
        title={restaurant.name}
        showBackButton={true}
        noBorder
        onBack={() => setOrderType(null)}
        className="lg:hidden bg-white"
      />

      {/* Menu Section - Mobile PWA Optimized */}
      <div className="px-4 py-4 pt-20">
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Categories - Horizontal scroll on mobile */}
          <div className="lg:col-span-1 order-1">
            <div className="lg:sticky lg:top-24">
              {/* Mobile: Horizontal scroll categories */}
              <div className="lg:hidden mb-4">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <Button
                    key="all"
                    onClick={() => setSelectedCategory('')}
                    variant={selectedCategory === '' ? 'default' : 'outline'}
                    size="sm"
                    className="whitespace-nowrap text-xs px-3 py-1.5 h-auto"
                  >
                    Todos
                  </Button>
                  {categoriesHierarchy.length > 0 ? (
                    categoriesHierarchy.map((mainCategory) => (
                      <React.Fragment key={mainCategory.id}>
                        <Button
                          onClick={() => setSelectedCategory(mainCategory.name)}
                          variant={selectedCategory === mainCategory.name ? 'default' : 'outline'}
                          size="sm"
                          className="whitespace-nowrap text-xs px-3 py-1.5 h-auto font-semibold bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100"
                        >
                          📁 {mainCategory.name}
                        </Button>
                        {mainCategory.subcategories && mainCategory.subcategories.map((subcategory) => (
                          <Button
                            key={subcategory.id}
                            onClick={() => setSelectedCategory(subcategory.name)}
                            variant={selectedCategory === subcategory.name ? 'default' : 'outline'}
                            size="sm"
                            className="whitespace-nowrap text-xs px-3 py-1.5 h-auto bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100"
                          >
                            📂 {subcategory.name}
                          </Button>
                        ))}
                      </React.Fragment>
                    ))
                  ) : (
                    // Fallback para categorias simples se não há hierarquia
                    _categories.map((category) => (
                      <Button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        variant={selectedCategory === category ? 'default' : 'outline'}
                        size="sm"
                        className="whitespace-nowrap text-xs px-3 py-1.5 h-auto"
                      >
                        {category}
                      </Button>
                    ))
                  )}
                </div>
              </div>
              
              {/* Desktop: Vertical categories */}
              <Card className="hidden lg:block">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Categorias</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {categoriesHierarchy.length === 0 && _categories.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <p className="text-sm">Nenhuma categoria disponível</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                    <Button
                      key="all"
                      onClick={() => setSelectedCategory('')}
                      variant={selectedCategory === '' ? 'default' : 'ghost'}
                      className="w-full justify-start text-sm"
                    >
                      Todos os itens
                    </Button>
                    {categoriesHierarchy.length > 0 ? (
                      categoriesHierarchy.map((mainCategory) => (
                        <div key={mainCategory.id} className="space-y-1">
                          <Button
                            onClick={() => setSelectedCategory(mainCategory.name)}
                            variant={selectedCategory === mainCategory.name ? 'default' : 'ghost'}
                            className="w-full justify-start text-sm font-semibold bg-blue-50 hover:bg-blue-100 text-blue-900"
                          >
                            📁 {mainCategory.name}
                          </Button>
                          {mainCategory.subcategories && mainCategory.subcategories.length > 0 && (
                            <div className="ml-4 space-y-1">
                              {mainCategory.subcategories.map((subcategory) => (
                                <Button
                                  key={subcategory.id}
                                  onClick={() => setSelectedCategory(subcategory.name)}
                                  variant={selectedCategory === subcategory.name ? 'default' : 'ghost'}
                                  className="w-full justify-start text-sm bg-orange-50 hover:bg-orange-100 text-orange-800"
                                >
                                  📂 {subcategory.name}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      // Fallback para categorias simples
                      _categories.map((category) => (
                        <Button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          variant={selectedCategory === category ? 'default' : 'ghost'}
                          className="w-full justify-start text-sm"
                        >
                          {category}
                        </Button>
                      ))
                    )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Products - Mobile optimized */}
          <div className="lg:col-span-3 order-2">
            {/* Aviso quando restaurante não aceita pedidos */}
            {restaurantStatus && !restaurantStatus.canAcceptOrders && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <Clock className="h-4 w-4" />
                  <p className="text-sm font-medium">
                    {restaurantStatus.message || 'Restaurante não está aceitando pedidos no momento'}
                  </p>
                </div>
                {restaurantStatus.nextChange && (
                  <p className="text-red-600 text-xs mt-1">
                    Próxima alteração: {restaurantStatus.nextChange}
                  </p>
                )}
              </div>
            )}
            
            <div className="space-y-4">
              {selectedCategory && (
                <div className="hidden lg:block">
                  <h2 className="text-2xl font-bold text-slate-800 mb-4">
                    {selectedCategory}
                  </h2>
                </div>
              )}
                
                <div className="space-y-4">
                {(productsByCategory[selectedCategory] || []).map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="pb-4 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center gap-4">
                      {/* Imagem do produto à esquerda */}
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
                            <Store className="h-8 w-8" />
                          </div>
                        )}
                      </div>

                      {/* Informações do produto */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-800 mb-1 truncate">
                          {product.name}
                        </h3>
                        <p className="text-slate-600 text-sm mb-3 line-clamp-2">
                          {product.description}
                        </p>
                      </div>

                      {/* Preço e botão à direita */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <p className="text-lg font-bold text-orange-600">
                          R$ {product.price.toFixed(2)}
                        </p>
                        
                        {getCartItemQuantity(product.id) > 0 ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeFromCart(product.id)}
                              className="h-8 w-8 p-0"
                              disabled={!!(restaurantStatus && !restaurantStatus.canAcceptOrders)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium text-sm">
                              {getCartItemQuantity(product.id)}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => addToCart(product)}
                              className="bg-orange-500 hover:bg-orange-600 h-8 w-8 p-0"
                              disabled={!!(restaurantStatus && !restaurantStatus.canAcceptOrders)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleProductClick(product)}
                            className="bg-orange-500 hover:bg-orange-600 text-xs px-3 h-8"
                            disabled={!!(restaurantStatus && !restaurantStatus.canAcceptOrders)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Adicionar
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* User Profile Sheet - Global */}
      <UserProfileSheet />
      
      {/* Floating Checkout Cart */}
      <IntegratedCheckout 
        restaurantSlug={params.slug as string} 
        restaurantStatus={restaurantStatus}
      />
      
      {/* Product Options Modal */}
      <ProductOptionsModal
        product={selectedProduct}
        isOpen={isOptionsModalOpen}
        onClose={() => {
          setIsOptionsModalOpen(false)
          setSelectedProduct(null)
        }}
        onAddToCart={handleAddToCartWithOptions}
      />
    </div>
  )
}

export default function RestaurantPage() {
  return (
    <CartProvider>
      <RestaurantPageContent />
    </CartProvider>
  )
}
