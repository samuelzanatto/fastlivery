'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/lib/auth/auth-client'
import { useAutoOpenClose } from '@/hooks/business/use-auto-open-close'
import { useBusinessStatus } from '@/hooks/business/use-business-status'
import { parseOpeningHours, type WeeklyHours } from '@/lib/utils/business-hours'
import { PWAHeader } from '@/components/layout/pwa-header'
import { IntegratedCheckout } from '@/components/checkout/integrated-checkout'
import { ProductOptionsModal } from '@/components/checkout/product-options-modal'
import { UserProfile } from '@/components/profile/unified-user-profile'
import { useCart } from '@/contexts/cart-context'
import { useOrderTracking } from '@/contexts/order-tracking-context'
import { getProductWithOptions } from '@/actions/products/products'
import { PWAServiceWorker } from '@/components/pwa/pwa-service-worker'
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

interface Business {
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

function BusinessPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { addItem, removeItem, getItemQuantity, addItemWithOptions } = useCart()
  const { activeOrderId, setOrderCreated } = useOrderTracking()
  const [isLoading, setIsLoading] = useState(true)
  const [business, setBusiness] = useState<Business | null>(null)
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

  // Estado para o sheet de perfil do usuário
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false)

  const tableFromQuery = searchParams.get('table') || undefined

  // Listener para o evento openProfileSheet (disparado pelo menu "Minha Conta")
  useEffect(() => {
    const handleOpenProfileSheet = () => {
      setIsProfileSheetOpen(true)
    }

    window.addEventListener('openProfileSheet', handleOpenProfileSheet)
    return () => {
      window.removeEventListener('openProfileSheet', handleOpenProfileSheet)
    }
  }, [])

  useEffect(() => {
    if (tableFromQuery) {
      setOrderType('DINE_IN')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFromQuery])

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
  useAutoOpenClose(business?.openingHours ?? null, {
    syncToServer: false,
    onStatusChange: (isOpen) => {
      setBusiness(prev => (prev ? { ...prev, isOpen } : prev))
    }
  })

  // Verificação periódica do status da empresa
  const { status: businessStatus, isLoading: statusLoading, error: _statusError } = useBusinessStatus({
    slug: params.slug as string,
    enabled: !!business,
    refreshInterval: 30000 // 30 segundos
  })

  // Validação e carregamento do negócio
  useEffect(() => {
    const validateBusiness = async () => {
      try {
        const slug = params.slug as string

        // Buscar dados do negócio da API
        const businessResponse = await fetch(`/api/business/${slug}`)

        if (!businessResponse.ok) {
          router.push('/')
          return
        }

        const businessData = await businessResponse.json()
        setBusiness(businessData)

        // Buscar produtos do negócio
        const productsResponse = await fetch(`/api/business/${slug}/products`)

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

      } catch {
        router.push('/')
      } finally {
        setIsLoading(false)
      }
    }

    validateBusiness()
  }, [params.slug, router])

  // Verificar se já existe pedido ativo para a mesa (dine-in)
  useEffect(() => {
    const checkActiveOrder = async () => {
      if (!tableFromQuery || !business?.slug) return

      try {
        const { getActiveOrderForTable } = await import('@/actions/orders/public-orders')
        const result = await getActiveOrderForTable(business.slug, undefined, tableFromQuery)

        if (result.success && result.data?.exists && result.data.order) {
          // TODO: Set active order in context if needed
          console.log('Active order found:', result.data.order)
        }
      } catch (err) {
        console.error('Erro ao verificar pedido ativo:', err)
      }
    }

    checkActiveOrder()
  }, [tableFromQuery, business?.slug])

  const addToCart = (product: Product) => {
    if (!business) return

    // Verificar se o negócio pode aceitar pedidos
    if (businessStatus && !businessStatus.canAcceptOrders) {
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
      businessId: business.id
    })
  }

  const handleProductClick = async (product: Product) => {
    // Verificar se o negócio pode aceitar pedidos
    if (businessStatus && !businessStatus.canAcceptOrders) {
      return
    }

    try {
      // Buscar opções do produto
      const result = await getProductWithOptions(product.id)
      if (result.success && result.data.product.options && result.data.product.options.length > 0) {
        const productWithOptions = { ...product, options: result.data.product.options }
        setSelectedProduct(productWithOptions)
        setIsOptionsModalOpen(true)
      } else {
        // Se não tem opções, adicionar diretamente ao carrinho
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
    if (!business) return

    // Verificar se o negócio pode aceitar pedidos
    if (businessStatus && !businessStatus.canAcceptOrders) {
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
      business.id,
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
    setOrderType(type)
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
          <p className="text-gray-600">Carregando empresa...</p>
        </div>
      </div>
    )
  }

  // Se não encontrou a empresa, não renderiza nada (redirecionou)
  if (!business) {
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

        {/* Empresa Header - Mobile PWA Optimized */}
        <div className="relative">
          {/* Banner Background - Full height from top */}
          <div className="h-48 sm:h-64 bg-gradient-to-r from-orange-500 to-orange-600">
            {business.banner ? (
              <Image
                src={business.banner}
                alt="Banner da empresa"
                width={800}
                height={256}
                className="w-full h-48 sm:h-64 object-cover"
                priority
              />
            ) : null}
          </div>

          {/* Empresa Info - No Card, Mobile First */}
          <div className="px-4 -mt-12 sm:-mt-20 relative z-10 pb-6">
            {/* Centered Avatar */}
            <div className="flex justify-center mb-4">
              <Avatar className="w-24 h-24 sm:w-28 sm:h-28 border-4 border-white shadow-lg">
                <AvatarImage src={business.avatar || "/placeholder-business.jpg"} />
                <AvatarFallback className="text-xl sm:text-2xl bg-white">
                  {business.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Empresa Details - Centered Layout */}
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <div className="text-center space-y-3">
                {/* Name and Collapsible Trigger */}
                <div className="flex items-center justify-center gap-3">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
                    {business.name}
                  </h1>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-800 p-1 h-auto ml-1">
                      <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </div>

                {/* Status Badge - Abaixo do nome */}
                {statusLoading ? (
                  <Badge variant="secondary" className="text-xs animate-pulse">Verificando...</Badge>
                ) : businessStatus?.canAcceptOrders ? (
                  <Badge className="bg-green-100 text-green-800 text-xs">Aberto - Aceitando Pedidos</Badge>
                ) : businessStatus?.isOpen ? (
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">Aberto - Não Aceitando Pedidos</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800 text-xs">Fechado</Badge>
                )}

                <CollapsibleContent className="mt-3 space-y-3">
                  {/* Description */}
                  {business.description && (
                    <p className="text-slate-600 text-sm sm:text-base max-w-sm mx-auto leading-relaxed">
                      {business.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                    {business.rating && (
                      <div className="flex items-center justify-center gap-1 text-xs text-slate-600 bg-white/80 rounded-full py-1.5 px-2">
                        <Star className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                        <span className="font-medium">{business.rating}</span>
                      </div>
                    )}

                    {business.deliveryTime && (
                      <div className="flex items-center justify-center gap-1 text-xs text-slate-600 bg-white/80 rounded-full py-1.5 px-2">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span>{business.deliveryTime} min</span>
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-1 text-xs text-slate-600 bg-white/80 rounded-full py-1.5 px-2 col-span-2">
                      <Timer className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{formatOpeningHours(business.openingHours)}</span>
                    </div>

                    {business.address && (
                      <div className="flex items-center justify-center gap-1 text-xs text-slate-600 bg-white/80 rounded-full py-1.5 px-2 col-span-2">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{business.address}</span>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>
        </div>

        {/* Order Type Selection */}
        <div className="px-4">
          <div className="text-center mb-6">
            <h2 className="text-md sm:text-2xl font-bold text-slate-800 mb-2">
              Como você gostaria de receber seu pedido?
            </h2>
          </div>

          <div className="space-y-3 max-w-md mx-auto mb-24">
            {business.acceptsDelivery && (
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

            {business.acceptsPickup && (
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

            {business.acceptsDineIn && (
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

        {/* PWA Service Worker Registration */}
        <PWAServiceWorker />

        <IntegratedCheckout
          businessSlug={params.slug as string}
          businessStatus={businessStatus}
          presetOrderType={orderType || undefined}
          lockOrderType={!!orderType}
          presetTableNumber={tableFromQuery}
          lockTableNumber={!!tableFromQuery}
          deliveryFee={business.deliveryFee}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* PWA Header - Normal with back button and white background */}
      <PWAHeader
        title={business.name}
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
                          className="whitespace-nowrap text-xs px-3 py-1.5 h-auto"
                        >
                          {mainCategory.name}
                        </Button>
                        {mainCategory.subcategories && mainCategory.subcategories.map((subcategory) => (
                          <Button
                            key={subcategory.id}
                            onClick={() => setSelectedCategory(subcategory.name)}
                            variant={selectedCategory === subcategory.name ? 'default' : 'outline'}
                            size="sm"
                            className="whitespace-nowrap text-xs px-3 py-1.5 h-auto"
                          >
                            {subcategory.name}
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
                              className="w-full justify-start text-sm"
                            >
                              {mainCategory.name}
                            </Button>
                            {mainCategory.subcategories && mainCategory.subcategories.length > 0 && (
                              <div className="ml-4 space-y-1">
                                {mainCategory.subcategories.map((subcategory) => (
                                  <Button
                                    key={subcategory.id}
                                    onClick={() => setSelectedCategory(subcategory.name)}
                                    variant={selectedCategory === subcategory.name ? 'default' : 'ghost'}
                                    className="w-full justify-start text-sm"
                                  >
                                    {subcategory.name}
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
            {/* Aviso quando empresa não aceita pedidos */}
            {businessStatus && !businessStatus.canAcceptOrders && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <Clock className="h-4 w-4" />
                  <p className="text-sm font-medium">
                    {businessStatus.message || 'Empresa não está aceitando pedidos no momento'}
                  </p>
                </div>
                {businessStatus.nextChange && (
                  <p className="text-red-600 text-xs mt-1">
                    Próxima alteração: {businessStatus.nextChange}
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
                              disabled={!!(businessStatus && !businessStatus.canAcceptOrders)}
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
                              disabled={!!(businessStatus && !businessStatus.canAcceptOrders)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleProductClick(product)}
                            className="bg-orange-500 hover:bg-orange-600 text-xs px-3 h-8"
                            disabled={!!(businessStatus && !businessStatus.canAcceptOrders)}
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

      {/* PWA Service Worker Registration */}
      <PWAServiceWorker />

      {/* Floating Checkout Cart */}
      <IntegratedCheckout
        businessSlug={params.slug as string}
        businessStatus={businessStatus}
        presetOrderType={orderType || undefined}
        lockOrderType={!!orderType}
        presetTableNumber={tableFromQuery}
        lockTableNumber={!!tableFromQuery}
        existingOrderId={activeOrderId || undefined}
        onOrderCreated={setOrderCreated}
        deliveryFee={business.deliveryFee}
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

      {/* Profile Sheet - triggered by "Minha Conta" in sidebar */}
      <UserProfile
        open={isProfileSheetOpen}
        onOpenChange={setIsProfileSheetOpen}
        mode="sheet"
        readOnly={true}
      />
    </div>
  )
}

export default function BusinessPage() {
  return <BusinessPageContent />
}
