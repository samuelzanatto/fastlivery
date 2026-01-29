'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useCart, CartItem } from '@/contexts/cart-context'
import { createPublicOrder, addItemsToOrder, getActiveOrderForTable } from '@/actions/orders/public-orders'
import { useClientSession } from '@/hooks/use-client-session'
import { useSession } from '@/lib/auth/auth-client'
import { getMyAddresses, Address } from '@/actions/customers/customers'
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  MapPin,
  CreditCard,
  Banknote,
  X,
  ChevronDown,
  AlertCircle
} from 'lucide-react'

interface BusinessStatus {
  isOpen: boolean
  canAcceptOrders: boolean
  message?: string
  nextChange?: string
}

interface IntegratedCheckoutProps {
  businessSlug: string
  businessStatus: BusinessStatus | null
  presetOrderType?: OrderType
  lockOrderType?: boolean
  presetTableNumber?: string
  lockTableNumber?: boolean
  existingOrderId?: string // Se já existe um pedido ativo para esta mesa
  onOrderCreated?: (orderId: string, orderNumber: string) => void // Callback quando pedido é criado
  deliveryFee?: number // Taxa de entrega configurada pelo business
}

type OrderType = 'DELIVERY' | 'PICKUP' | 'DINE_IN'
type PaymentMethod = 'MONEY' | 'CREDIT' | 'DEBIT' | 'PIX'
type CheckoutStep = 'cart' | 'details' | 'payment'

export function IntegratedCheckout({
  businessSlug,
  businessStatus,
  presetOrderType,
  lockOrderType,
  presetTableNumber,
  lockTableNumber,
  existingOrderId: initialExistingOrderId,
  onOrderCreated,
  deliveryFee: businessDeliveryFee
}: IntegratedCheckoutProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { items, updateQuantity, removeItem, clearCart, getTotalPrice, getTotalItems } = useCart()
  const { registerSession } = useClientSession()
  const { data: session } = useSession()
  const [isExpanded, setIsExpanded] = useState(false)
  const [step, setStep] = useState<CheckoutStep>('cart')
  const [orderType, setOrderType] = useState<OrderType>('DELIVERY')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estado para pedido existente (dine-in)
  const [existingOrderId, setExistingOrderId] = useState<string | null>(initialExistingOrderId || searchParams.get('order') || null)
  const [existingOrderNumber, setExistingOrderNumber] = useState<string | null>(null)
  const [isCheckingExistingOrder, setIsCheckingExistingOrder] = useState(false)
  const [tableNumber, setTableNumber] = useState('')

  // Customer info
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [notes, setNotes] = useState('')

  // Delivery address
  const [street, setStreet] = useState('')
  const [number, setNumber] = useState('')
  const [complement, setComplement] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')

  // Saved addresses for logged-in users
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [hasAutoFilled, setHasAutoFilled] = useState(false)

  // Auto-fill user data when logged in
  useEffect(() => {
    if (session?.user && !hasAutoFilled) {
      // Fill name and email from session
      if (session.user.name && !customerName) {
        setCustomerName(session.user.name)
      }
      if (session.user.email && !customerEmail) {
        setCustomerEmail(session.user.email)
      }

      // Fetch saved addresses
      getMyAddresses().then((result) => {
        if (result.success && result.data && result.data.length > 0) {
          setSavedAddresses(result.data)

          // Auto-select default address
          const defaultAddress = result.data.find(addr => addr.isDefault) || result.data[0]
          if (defaultAddress && !street) {
            setSelectedAddressId(defaultAddress.id)
            setStreet(defaultAddress.street)
            setNumber(defaultAddress.number)
            setComplement(defaultAddress.complement || '')
            setNeighborhood(defaultAddress.neighborhood)
            setCity(defaultAddress.city)
          }
        }
      })

      setHasAutoFilled(true)
    }
  }, [session, hasAutoFilled, customerName, customerEmail, street])

  // Handle address selection change
  const handleAddressSelect = (addressId: string) => {
    const address = savedAddresses.find(a => a.id === addressId)
    if (address) {
      setSelectedAddressId(addressId)
      setStreet(address.street)
      setNumber(address.number)
      setComplement(address.complement || '')
      setNeighborhood(address.neighborhood)
      setCity(address.city)
    }
  }

  const subtotal = getTotalPrice()
  const deliveryFee = orderType === 'DELIVERY' ? (businessDeliveryFee ?? 0) : 0
  const total = subtotal + deliveryFee
  const itemCount = getTotalItems()

  const canAcceptOrders = businessStatus?.canAcceptOrders ?? true

  // Verificar se já existe pedido ativo para a mesa (dine-in)
  useEffect(() => {
    if (orderType === 'DINE_IN' && presetTableNumber && !existingOrderId) {
      setIsCheckingExistingOrder(true)
      getActiveOrderForTable(businessSlug, undefined, presetTableNumber)
        .then((result) => {
          if (result.success && result.data?.exists && result.data.order) {
            setExistingOrderId(result.data.order.id)
            setExistingOrderNumber(result.data.order.orderNumber)
          }
        })
        .finally(() => setIsCheckingExistingOrder(false))
    }
  }, [orderType, presetTableNumber, businessSlug, existingOrderId])

  // Fechar quando não há itens
  useEffect(() => {
    if (items.length === 0) {
      setIsExpanded(false)
      setStep('cart')
    }
  }, [items.length])

  // Sync preset order type from parent (e.g., delivery vs pickup chosen earlier)
  useEffect(() => {
    if (presetOrderType && presetOrderType !== orderType) {
      setOrderType(presetOrderType)
    }
  }, [presetOrderType, orderType])

  useEffect(() => {
    if (presetTableNumber && presetTableNumber !== tableNumber) {
      setTableNumber(presetTableNumber)
    }
  }, [presetTableNumber, tableNumber])

  const isOrderTypeLocked = !!presetOrderType && lockOrderType !== false
  const isTableNumberLocked = !!presetTableNumber && lockTableNumber !== false

  // Handler para adicionar itens a pedido existente
  const handleAddItemsToExisting = async () => {
    if (!existingOrderId || items.length === 0) return

    setIsSubmitting(true)
    try {
      const result = await addItemsToOrder({
        orderId: existingOrderId,
        businessSlug,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.finalPrice,
          notes: item.optionsText || undefined,
          selectedOptions: item.selectedOptions
        }))
      })

      if (result.success) {
        clearCart()
        setIsExpanded(false)
        setStep('cart')
        // Atualizar sessão e notificar adição de itens
        if (existingOrderNumber) {
          await registerSession(existingOrderId, businessSlug, tableNumber || presetTableNumber)
          onOrderCreated?.(existingOrderId, existingOrderNumber)
        }
      } else {
        alert(result.error || 'Erro ao adicionar itens')
      }
    } catch (error) {
      console.error('Erro ao adicionar itens:', error)
      alert('Erro ao adicionar itens ao pedido')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitOrder = async () => {
    if (!customerName || !customerPhone) {
      return
    }

    if (orderType === 'DELIVERY' && (!street || !number || !neighborhood || !city)) {
      return
    }

    if (orderType === 'DINE_IN' && !tableNumber.trim()) {
      return
    }

    setIsSubmitting(true)


    try {
      const deliveryAddress = orderType === 'DELIVERY'
        ? `${street}, ${number}${complement ? ` - ${complement}` : ''}, ${neighborhood}, ${city}`
        : undefined

      const result = await createPublicOrder({
        businessSlug,
        type: orderType,
        paymentMethod,
        customerName,
        customerPhone,
        customerEmail: customerEmail || undefined,
        notes: notes || undefined,
        deliveryAddress,
        tableNumber: orderType === 'DINE_IN' ? tableNumber.trim() : undefined,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.finalPrice,
          notes: item.optionsText || undefined,
          selectedOptions: item.selectedOptions
        })),
        deliveryFee
      })

      if (result.success && result.data) {
        clearCart()
        setIsExpanded(false)
        setStep('cart')
        // Reset form
        setCustomerName('')
        setCustomerPhone('')
        setCustomerEmail('')
        setNotes('')
        setStreet('')
        setNumber('')
        setComplement('')
        setNeighborhood('')
        setCity('')
        setTableNumber('')

        // Registrar sessão e notificar criação do pedido
        if (result.data.id && result.data.orderNumber) {
          // Registrar no banco de dados
          await registerSession(result.data.id, businessSlug, tableNumber || presetTableNumber)

          // Chamar callback
          onOrderCreated?.(result.data.id, result.data.orderNumber)
        }
      } else if (!result.success && (result as { code?: string }).code === 'ACTIVE_ORDER_EXISTS') {
        // Já existe pedido ativo para esta mesa
        const data = (result as { data?: { existingOrderId: string; existingOrderNumber: string } }).data
        if (data?.existingOrderId) {
          setExistingOrderId(data.existingOrderId)
          setExistingOrderNumber(data.existingOrderNumber)
        }
      }
    } catch (error) {
      console.error('Erro ao criar pedido:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Floating button quando minimizado
  if (!isExpanded && items.length > 0) {
    return (
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsExpanded(true)}
          disabled={!canAcceptOrders}
          className="w-16 h-16 rounded-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 shadow-2xl flex items-center justify-center transition-all"
        >
          <ShoppingBag className="h-7 w-7 text-white" />
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </motion.button>
      </motion.div>
    )
  }

  if (items.length === 0) {
    return null
  }

  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}
      <motion.div
        key="checkout-card"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 right-0 left-0 md:left-auto md:right-4 md:bottom-4 z-50"
      >
        <Card className="w-full md:w-[400px] max-h-[85vh] gap-0 shadow-2xl border-t md:border rounded-t-2xl md:rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row mb-2 items-center justify-between px-4 py-2 border-b">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <CardTitle className="text-base">
                {step === 'cart' && 'Seu Carrinho'}
                {step === 'details' && 'Seus Dados'}
                {step === 'payment' && 'Pagamento'}
              </CardTitle>
              <span className="text-sm text-slate-500">({itemCount} itens)</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsExpanded(false)}
              >
                <ChevronDown className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setIsExpanded(false)
                  setStep('cart')
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="px-3 py-2 overflow-y-auto max-h-[calc(85vh-130px)] flex flex-col">
            <AnimatePresence mode="wait">
              {/* Step: Cart */}
              {step === 'cart' && (
                <motion.div
                  key="step-cart"
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -300, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3 flex-1">
                  {items.map((item, index) => (
                    <CartItemCard
                      key={`${item.id}-${index}`}
                      item={item}
                      onUpdateQuantity={updateQuantity}
                      onRemove={removeItem}
                    />
                  ))}

                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>R$ {subtotal.toFixed(2)}</span>
                    </div>
                    {orderType === 'DELIVERY' && (
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>Taxa de entrega</span>
                        <span>R$ {deliveryFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total</span>
                      <span>R$ {total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Se já existe pedido para esta mesa, mostrar opção de adicionar itens */}
                  {existingOrderId && orderType === 'DINE_IN' ? (
                    <div className="space-y-3">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-amber-800 mb-2">
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-medium text-sm">Mesa com pedido em andamento</span>
                        </div>
                        <p className="text-xs text-amber-700">
                          Pedido #{existingOrderNumber || existingOrderId.slice(0, 8)} já está aberto para esta mesa.
                        </p>
                      </div>
                      <Button
                        className="w-full bg-orange-500 hover:bg-orange-600"
                        disabled={isSubmitting || isCheckingExistingOrder}
                        onClick={handleAddItemsToExisting}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {isSubmitting ? 'Adicionando...' : 'Adicionar ao Pedido Existente'}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-sm"
                        onClick={() => router.push(`/${businessSlug}/pedido/${existingOrderId}`)}
                      >
                        Ver Pedido Atual
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      disabled={!canAcceptOrders || isCheckingExistingOrder}
                      onClick={() => setStep('details')}
                    >
                      {isCheckingExistingOrder ? 'Verificando...' : canAcceptOrders ? 'Continuar' : 'Estabelecimento fechado'}
                    </Button>
                  )}
                </motion.div>
              )}

              {/* Step: Details */}
              {step === 'details' && (
                <motion.div
                  key="step-details"
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -300, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6 flex-1">
                  <div>
                    <Label htmlFor="name" className="mb-1 block">Nome *</Label>
                    <Input
                      id="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="mb-1 block">Telefone *</Label>
                    <Input
                      id="phone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="mb-1 block">Email (opcional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="seu@email.com"
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block">Tipo de Pedido</Label>
                    {isOrderTypeLocked ? (
                      <div className="p-3 border rounded-lg bg-slate-50 text-sm font-medium">
                        {orderType === 'DELIVERY' && 'Entrega'}
                        {orderType === 'PICKUP' && 'Retirada'}
                        {orderType === 'DINE_IN' && 'Comer no local'}
                      </div>
                    ) : (
                      <RadioGroup
                        value={orderType}
                        onValueChange={(v) => setOrderType(v as OrderType)}
                        className="mt-0"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="DELIVERY" id="delivery" />
                          <Label htmlFor="delivery">Entrega</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="PICKUP" id="pickup" />
                          <Label htmlFor="pickup">Retirada</Label>
                        </div>
                      </RadioGroup>
                    )}
                  </div>

                  {orderType === 'DELIVERY' && (
                    <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <Label>Endereço de Entrega</Label>
                      </div>

                      {/* Address selector for logged-in users with saved addresses */}
                      {savedAddresses.length > 0 && (
                        <div className="space-y-2 mb-3">
                          <Label className="text-xs text-slate-600">Seus endereços salvos</Label>
                          <select
                            className="w-full p-2 border rounded-lg bg-white text-sm"
                            value={selectedAddressId || ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAddressSelect(e.target.value)
                              } else {
                                setSelectedAddressId(null)
                                setStreet('')
                                setNumber('')
                                setComplement('')
                                setNeighborhood('')
                                setCity('')
                              }
                            }}
                          >
                            <option value="">Digite um novo endereço</option>
                            {savedAddresses.map((addr) => (
                              <option key={addr.id} value={addr.id}>
                                {addr.street}, {addr.number} - {addr.neighborhood}
                                {addr.isDefault && ' (Padrão)'}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <Input
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Rua *"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={number}
                          onChange={(e) => setNumber(e.target.value)}
                          placeholder="Número *"
                        />
                        <Input
                          value={complement}
                          onChange={(e) => setComplement(e.target.value)}
                          placeholder="Complemento"
                        />
                      </div>
                      <Input
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        placeholder="Bairro *"
                      />
                      <Input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Cidade *"
                      />
                    </div>
                  )}

                  {orderType === 'DINE_IN' && (
                    <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <Label>Número da mesa</Label>
                      </div>
                      {isTableNumberLocked ? (
                        <div className="p-3 border rounded-lg bg-white text-sm font-medium">
                          {tableNumber || 'Mesa não informada'}
                        </div>
                      ) : (
                        <Input
                          value={tableNumber}
                          onChange={(e) => setTableNumber(e.target.value)}
                          placeholder="Ex: 12"
                        />
                      )}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="notes" className="mb-1 block">Observações</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Alguma observação para o pedido?"
                      rows={2}
                    />
                  </div>

                </motion.div>
              )}

              {/* Step: Payment */}
              {step === 'payment' && (
                <motion.div
                  key="step-payment"
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -300, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2 flex-1">
                  <div>
                    <Label className="mb-2 block">Forma de Pagamento</Label>
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2 p-3 border rounded-lg">
                        <RadioGroupItem value="PIX" id="pix" />
                        <Label htmlFor="pix" className="flex items-center gap-2 cursor-pointer">
                          <CreditCard className="h-4 w-4" />
                          PIX
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg">
                        <RadioGroupItem value="CREDIT" id="credit" />
                        <Label htmlFor="credit" className="flex items-center gap-2 cursor-pointer">
                          <CreditCard className="h-4 w-4" />
                          Cartão de Crédito
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg">
                        <RadioGroupItem value="DEBIT" id="debit" />
                        <Label htmlFor="debit" className="flex items-center gap-2 cursor-pointer">
                          <CreditCard className="h-4 w-4" />
                          Cartão de Débito
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg">
                        <RadioGroupItem value="MONEY" id="money" />
                        <Label htmlFor="money" className="flex items-center gap-2 cursor-pointer">
                          <Banknote className="h-4 w-4" />
                          Dinheiro
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>R$ {subtotal.toFixed(2)}</span>
                    </div>
                    {orderType === 'DELIVERY' && (
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>Taxa de entrega</span>
                        <span>R$ {deliveryFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total</span>
                      <span>R$ {total.toFixed(2)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>

          {/* Footer com botões fixos */}
          {(step === 'details' || step === 'payment') && (
            <div className="border-t px-4 py-2 mt-2 bg-white">
              {step === 'details' && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('cart')}>
                    Voltar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => setStep('payment')}
                    disabled={!customerName || !customerPhone}
                  >
                    Continuar
                  </Button>
                </div>
              )}
              {step === 'payment' && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('details')}>
                    Voltar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSubmitOrder}
                    disabled={
                      isSubmitting ||
                      (orderType === 'DELIVERY' && (!street || !number || !neighborhood || !city)) ||
                      (orderType === 'DINE_IN' && !tableNumber.trim())
                    }
                  >
                    {isSubmitting ? 'Enviando...' : 'Finalizar Pedido'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

// Componente separado para item do carrinho
function CartItemCard({
  item,
  onUpdateQuantity,
  onRemove
}: {
  item: CartItem
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.name}</p>
        {item.optionsText && (
          <p className="text-xs text-slate-500 truncate">{item.optionsText}</p>
        )}
        <p className="text-sm text-slate-600">
          R$ {item.finalPrice.toFixed(2)}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-6 text-center text-sm">{item.quantity}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-500 ml-1"
          onClick={() => onRemove(item.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
