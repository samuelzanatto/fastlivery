'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePaymentStatusPolling } from '@/hooks/usePaymentStatusPolling'
import { usePaymentStatusSocket } from '@/hooks/usePaymentStatusSocket'
import { useCart } from '@/contexts/cart-context'
import { addressService, type SavedAddress } from '@/lib/address-service'
import { AddressFormBottomSheet } from '@/components/address-form-bottom-sheet'
import { MercadoPagoPaymentBrick } from '@/components/mercadopago-payment-brick'
import MercadoPagoStatusScreenBrick from '@/components/mercadopago-status-screen-brick'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  ArrowRight,
  ArrowLeft,
  Check,
  Home,
  QrCode,
  Copy,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  Smartphone
} from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

interface IntegratedCheckoutProps {
  restaurantSlug?: string
  restaurantStatus?: {
    isOpen: boolean
    canAcceptOrders: boolean
    message?: string
    nextChange?: string
  } | null
}

type CheckoutStep = 'cart' | 'address' | 'payment' | 'confirmation'
type PaymentMethod = 'pix' | 'credit_card' | 'debit_card'
type PaymentStatus = 'idle' | 'processing' | 'pending' | 'approved' | 'rejected' | 'cancelled'

const stepTitles = {
  cart: 'Pedido',
  address: 'Entrega',
  payment: 'Pagamento',
  confirmation: 'Confirmação'
}

const stepNumbers = {
  cart: 1,
  address: 2,
  payment: 3,
  confirmation: 4
}

const paymentStatusConfig = {
  idle: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Aguardando' },
  processing: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Processando...' },
  pending: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-100', label: 'Pendente' },
  approved: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100', label: 'Aprovado' },
  rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100', label: 'Rejeitado' },
  cancelled: { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Cancelado' }
}

interface PaymentState {
  method: PaymentMethod | null
  status: PaymentStatus
  paymentData: Record<string, unknown> | null
  pixData: {
    qr_code?: string
    qr_code_base64?: string
    ticket_url?: string
  } | null
}

// Componente de indicador de progresso das etapas
const StepIndicator = ({ currentStep }: { currentStep: CheckoutStep }) => {
  const steps = Object.keys(stepTitles) as CheckoutStep[]
  
  return (
    <div className="flex items-center justify-center mb-6">
      {steps.map((step, index) => {
        const isActive = step === currentStep
        const isCompleted = stepNumbers[currentStep] > stepNumbers[step]
        
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                transition-all duration-300
                ${isActive 
                  ? 'bg-orange-500 text-white shadow-md' 
                  : isCompleted 
                  ? 'bg-green-500 text-white shadow-md' 
                  : 'bg-gray-200 text-gray-500'
                }
              `}>
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span>{stepNumbers[step]}</span>
                )}
              </div>
              
              <p className={`
                text-xs mt-1 text-center font-medium
                ${isActive ? 'text-orange-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}
              `}>
                {stepTitles[step]}
              </p>
            </div>
            
            {index < steps.length - 1 && (
              <div className={`
                w-8 h-0.5 mx-2 mt-[-12px] transition-all duration-300
                ${stepNumbers[currentStep] > stepNumbers[step] ? 'bg-green-500' : 'bg-gray-200'}
              `} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// Componente de status do pagamento (removido temporariamente - só usado quando necessário)
const _PaymentStatusIndicator = ({ status }: { status: PaymentStatus }) => {
  const config = paymentStatusConfig[status]
  const Icon = config.icon
  
  return (
    <Card className={`${config.bg} border-0`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Icon className={`w-6 h-6 ${config.color} ${status === 'processing' ? 'animate-spin' : ''}`} />
          <div>
            <p className={`font-medium ${config.color}`}>{config.label}</p>
            {status === 'pending' && (
              <p className="text-sm text-gray-600">Escaneie o QR Code ou copie o código PIX</p>
            )}
            {status === 'approved' && (
              <p className="text-sm text-gray-600">Pagamento aprovado com sucesso!</p>
            )}
            {status === 'rejected' && (
              <p className="text-sm text-gray-600">Verifique os dados e tente novamente</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Componente PIX QR Code
const PixPayment = ({ pixData, onCopy }: { 
  pixData: { qr_code?: string, qr_code_base64?: string, ticket_url?: string }
  onCopy: (text: string) => void 
}) => {
  const [copySuccess, setCopySuccess] = useState(false)
  
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      onCopy(text)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Erro ao copiar:', err)
    }
  }
  
  if (!pixData?.qr_code_base64 && !pixData?.qr_code) {
    return <div>Erro ao carregar dados do PIX</div>
  }
  
  return (
    <Card>
      <CardHeader className="text-center pb-4">
        <CardTitle className="flex items-center justify-center gap-2">
          <QrCode className="w-5 h-5 text-blue-600" />
          Pagamento PIX
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code */}
        {pixData.qr_code_base64 && (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
              <Image 
                src={`data:image/jpeg;base64,${pixData.qr_code_base64}`}
                alt="QR Code PIX"
                width={160}
                height={160}
                className="mx-auto"
                unoptimized={true}
              />
            </div>
            <p className="text-sm text-gray-600 text-center">
              Abra o app do seu banco e escaneie o QR Code
            </p>
          </div>
        )}
        
        {/* Código PIX para copiar */}
        {pixData.qr_code && (
          <div className="space-y-2">
            <Label htmlFor="pix-code">Ou copie o código PIX:</Label>
            <div className="flex gap-2">
              <Input
                id="pix-code"
                value={pixData.qr_code}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleCopy(pixData.qr_code!)}
                className={copySuccess ? 'bg-green-100 border-green-300' : ''}
              >
                {copySuccess ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            {copySuccess && (
              <p className="text-xs text-green-600">Código copiado!</p>
            )}
          </div>
        )}
        
        {/* Instruções */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex gap-2">
            <Smartphone className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Como pagar com PIX:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Abra o app do seu banco</li>
                <li>Escolha a opção PIX</li>
                <li>Escaneie o QR Code ou cole o código</li>
                <li>Confirme o pagamento</li>
              </ol>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface ApiAddress {
  id: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
  isDefault: boolean
}

interface AddressFormData {
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
  isDefault?: boolean
}

// Componente principal do carrinho flutuante
export function IntegratedCheckout({ restaurantSlug, restaurantStatus }: IntegratedCheckoutProps) {
  const searchParams = useSearchParams()
  const debug = searchParams?.get('mpDebug') === '1'
  const pushDebug = useCallback((...parts: unknown[]) => {
    if (!debug) return
    try {
      const w = window as unknown as { __MP_CHECKOUT_LOGS__?: unknown[] }
      if (!w.__MP_CHECKOUT_LOGS__) w.__MP_CHECKOUT_LOGS__ = []
      w.__MP_CHECKOUT_LOGS__.push({ ts: Date.now(), parts })
    } catch {}
    console.debug('[MP CHECKOUT]', ...parts)
  }, [debug])
  const { items, addItem, removeItem, clearCart } = useCart()
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('cart')
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false)
  const [isAddressSheetOpen, setIsAddressSheetOpen] = useState(false)
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: ''
  })
  
  // Estados do pagamento integrado
  const [paymentState, setPaymentState] = useState<PaymentState>({
    method: null,
    status: 'idle',
    paymentData: null,
    pixData: null
  })
  const [orderNumber, setOrderNumber] = useState('')
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [_loadingPublicKey, setLoadingPublicKey] = useState(false)
  
  const totalItems = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items])
  const deliveryFee = 5.00
  const totalPrice = useMemo(() => {
    const itemsTotal = items.reduce((acc, item) => acc + (item.finalPrice * item.quantity), 0)
    return itemsTotal + deliveryFee
  }, [items, deliveryFee])

  // Evitar spam de logs: logar somente quando step OU status mudarem
  const lastLogRef = useRef<{step: string; status: string} | null>(null)
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    const current = { step: currentStep, status: paymentState.status }
    if (!lastLogRef.current || lastLogRef.current.step !== current.step || lastLogRef.current.status !== current.status) {
      console.log('[IntegratedCheckout] Re-render raiz. step:', current.step, 'status pagamento:', current.status)
      lastLogRef.current = current
    }
  }, [currentStep, paymentState.status])

  const hasLoggedUnmountRef = useRef(false)
  useEffect(() => {
    return () => {
      if (!hasLoggedUnmountRef.current) {
        console.debug('[IntegratedCheckout] Unmount completo do componente de checkout')
        hasLoggedUnmountRef.current = true
      }
    }
  }, [])
  
  if (debug) pushDebug('mount-or-render', { items: items.length, totalItems })
  
  // Carregar endereços salvos da API
  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const response = await fetch('/api/customer/addresses')
        if (response.ok) {
          const data = await response.json()
          const addresses = data.addresses || []
          
          // Converter para o formato esperado pelo componente
          const formattedAddresses = addresses.map((addr: ApiAddress) => ({
            id: addr.id,
            type: 'Endereço',
            street: addr.street,
            number: addr.number,
            neighborhood: addr.neighborhood,
            city: addr.city,
            state: addr.state,
            cep: addr.zipCode,
            fullAddress: `${addr.street}, ${addr.number} - ${addr.neighborhood}, ${addr.city} - ${addr.state}`,
            reference: addr.complement || undefined
          }))
          
          setSavedAddresses(formattedAddresses)
          
          // Selecionar endereço principal automaticamente
          const defaultAddress = addresses.find((addr: ApiAddress) => addr.isDefault)
          if (defaultAddress && !selectedAddress) {
            const formattedDefault = {
              id: defaultAddress.id,
              type: 'Endereço Principal',
              street: defaultAddress.street,
              number: defaultAddress.number,
              neighborhood: defaultAddress.neighborhood,
              city: defaultAddress.city,
              state: defaultAddress.state,
              cep: defaultAddress.zipCode,
              fullAddress: `${defaultAddress.street}, ${defaultAddress.number} - ${defaultAddress.neighborhood}, ${defaultAddress.city} - ${defaultAddress.state}`,
              reference: defaultAddress.complement || undefined
            }
            setSelectedAddress(formattedDefault)
          } else if (formattedAddresses.length > 0 && !selectedAddress) {
            setSelectedAddress(formattedAddresses[0])
          }
        } else {
          console.error('Erro ao carregar endereços da API')
          // Fallback para localStorage caso API falhe
          const addresses = addressService.getSavedAddresses()
          setSavedAddresses(addresses)
          if (addresses.length > 0 && !selectedAddress) {
            setSelectedAddress(addresses[0])
          }
        }
      } catch (error) {
        console.error('Erro ao carregar endereços:', error)
        // Fallback para localStorage
        const addresses = addressService.getSavedAddresses()
        setSavedAddresses(addresses)
        if (addresses.length > 0 && !selectedAddress) {
          setSelectedAddress(addresses[0])
        }
      }
    }
    loadAddresses()
  }, [selectedAddress])

  // Buscar public key do restaurante
  useEffect(() => {
    let ignore = false
    async function fetchKey() {
      if (!restaurantSlug) {
        pushDebug('fetchKey:skip-no-slug')
        return
      }
      pushDebug('fetchKey:start', { restaurantSlug })
      setLoadingPublicKey(true)
      try {
        const res = await fetch(`/api/restaurants/${restaurantSlug}/mp-public-key`)
        pushDebug('fetchKey:response', { ok: res.ok, status: res.status })
        if (res.ok) {
          const data = await res.json()
          pushDebug('fetchKey:data', { hasKey: !!data.publicKey })
          if (!ignore) setPublicKey(data.publicKey || null)
        } else {
          const text = await res.text()
            .catch(() => '')
          pushDebug('fetchKey:bad-status', { status: res.status, body: text.slice(0,200) })
          if (!ignore) setPublicKey(null)
        }
      } catch (e) {
        pushDebug('fetchKey:error', e)
        if (!ignore) setPublicKey(null)
      } finally {
        pushDebug('fetchKey:done')
        if (!ignore) setLoadingPublicKey(false)
      }
    }
    fetchKey()
    return () => { ignore = true }
  }, [restaurantSlug, debug, pushDebug])

  // Copiar código PIX
  const handlePixCopy = (_text: string) => {
    toast.success('Código PIX copiado! Cole no seu banco.')
  }
  
  // Salvar novo endereço
  const handleSaveAddress = async (addressData: AddressFormData) => {
    try {
      setIsSavingAddress(true)
      
      const response = await fetch('/api/customer/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressData)
      })
      
      if (response.ok) {
        toast.success('Endereço adicionado com sucesso!')
        
        // Recarregar endereços
        const addressResponse = await fetch('/api/customer/addresses')
        if (addressResponse.ok) {
          const data = await addressResponse.json()
          const addresses = data.addresses || []
          
          const formattedAddresses = addresses.map((addr: ApiAddress) => ({
            id: addr.id,
            type: 'Endereço',
            street: addr.street,
            number: addr.number,
            neighborhood: addr.neighborhood,
            city: addr.city,
            state: addr.state,
            cep: addr.zipCode,
            fullAddress: `${addr.street}, ${addr.number} - ${addr.neighborhood}, ${addr.city} - ${addr.state}`,
            reference: addr.complement || undefined
          }))
          
          setSavedAddresses(formattedAddresses)
          
          // Selecionar o novo endereço
          const newAddress = formattedAddresses.find((addr: SavedAddress) => addr.street === addressData.street && addr.number === addressData.number)
          if (newAddress) {
            setSelectedAddress(newAddress)
          }
        }
        
        setIsAddressSheetOpen(false)
        setIsAddingNewAddress(false)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao adicionar endereço')
      }
    } catch (error) {
      console.error('Erro ao salvar endereço:', error)
      toast.error('Erro ao salvar endereço')
    } finally {
      setIsSavingAddress(false)
    }
  }
  
  // WebSocket realtime para atualizar status de pagamento
  const { lastUpdate } = usePaymentStatusSocket({
    restaurantId: restaurantSlug,
    orderId: undefined, 
    onUpdate: (u) => {
      if (paymentState.status !== 'pending') return
      if (u.status === 'APPROVED') {
        setPaymentState(prev => ({ ...prev, status: 'approved' }))
        setCurrentStep('confirmation')
        toast.success('Pagamento aprovado!')
      } else if (u.status === 'REJECTED' || u.status === 'CANCELLED') {
        setPaymentState(prev => ({ ...prev, status: 'rejected' }))
        toast.error('Pagamento não aprovado.')
      }
    }
  })

  // Fallback: se websocket não atualizar, ativa polling
  const { data: _pollFallback, isRunning: fallbackPolling } = usePaymentStatusPolling({
    orderNumber,
    enabled: !!orderNumber && paymentState.status === 'pending' && !lastUpdate,
    intervalMs: 8000,
    stopOn: d => ['APPROVED','REJECTED','CANCELLED'].includes(d.order.paymentStatus),
    onUpdate: (d) => {
      if (d.order.paymentStatus === 'APPROVED') {
        setPaymentState(prev => ({ ...prev, status: 'approved' }))
        setCurrentStep('confirmation')
        toast.success('Pagamento aprovado!')
      } else if (d.order.paymentStatus === 'REJECTED' || d.order.paymentStatus === 'CANCELLED') {
        setPaymentState(prev => ({ ...prev, status: 'rejected' }))
        toast.error('Pagamento não aprovado.')
      }
    }
  })
  
  // Navegação entre steps
  const nextStep = useCallback(() => {
    switch (currentStep) {
      case 'cart':
        setCurrentStep('address')
        break
      case 'address':
        if (!selectedAddress) {
          toast.error('Selecione um endereço de entrega')
          return
        }
        setCurrentStep('payment')
        break
      case 'payment':
        // Payment Brick é exibido automaticamente, não precisa validar método
        break
    }
  }, [currentStep, selectedAddress])
  
  const prevStep = useCallback(() => {
    switch (currentStep) {
      case 'address':
        setCurrentStep('cart')
        break
      case 'payment':
        setCurrentStep('address')
        setPaymentState({
          method: null,
          status: 'idle',
          paymentData: null,
          pixData: null
        })
        break
      case 'confirmation':
        setCurrentStep('payment')
        break
    }
  }, [currentStep])
  
  // Renderizar conteúdo do carrinho
  const renderCartStep = () => (
    <div>
      {/* Aviso quando restaurante não aceita pedidos */}
      {restaurantStatus && !restaurantStatus.canAcceptOrders && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <div>
              <p className="text-sm font-medium">
                {restaurantStatus.message || 'Restaurante não está aceitando pedidos no momento'}
              </p>
              {restaurantStatus.nextChange && (
                <p className="text-red-600 text-xs mt-1">
                  Próxima alteração: {restaurantStatus.nextChange}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      <ScrollArea className="max-h-80">
        <div className="space-y-0">
          {items.map((item, index) => (
            <div key={item.id}>
              <div className="py-4">
                <div className="flex items-center gap-3">
                  {item.image && (
                    <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                      <Image 
                        src={item.image} 
                        alt={item.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                    {item.description && (
                      <p className="text-sm text-gray-600 truncate">{item.description}</p>
                    )}
                    {/* Mostrar opções selecionadas se existirem */}
                    {item.optionsText && (
                      <p className="text-xs text-gray-500 truncate mt-1">{item.optionsText}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-lg font-bold text-orange-600">
                        R$ {(item.finalPrice * item.quantity).toFixed(2)}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-8 h-8 p-0 rounded-full"
                          onClick={() => removeItem(item.id)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-8 h-8 p-0 rounded-full"
                          onClick={() => addItem(item)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Divisor entre produtos, exceto no último */}
              {index < items.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
  
  // Renderizar etapa de endereço
  const renderAddressStep = () => (
    <div className="space-y-4">
      {/* Informações do cliente */}
      <Card className='border-none shadow-none py-2'>
        <CardHeader>
          <CardTitle className="text-lg">Informações de Contato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="customer-name" className="mb-1 block">Nome</Label>
            <Input
              id="customer-name"
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Seu nome completo"
            />
          </div>
          <div>
            <Label htmlFor="customer-phone" className="mb-1 block">Telefone</Label>
            <Input
              id="customer-phone"
              type="tel"
              value={customerInfo.phone}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="(11) 99999-9999"
            />
          </div>
          <div>
            <Label htmlFor="customer-email" className="mb-1 block">E-mail</Label>
            <Input
              id="customer-email"
              type="email"
              value={customerInfo.email}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
              placeholder="seu@email.com"
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Endereços */}
      <Card className='border-none shadow-none py-2'>
        <CardHeader>
          <CardTitle className="text-lg">Endereço de Entrega</CardTitle>
        </CardHeader>
        <CardContent>
          {savedAddresses.length > 0 && !isAddingNewAddress ? (
            <div className="space-y-3">
              <RadioGroup 
                value={selectedAddress?.id || ''} 
                onValueChange={(value) => {
                  const address = savedAddresses.find(addr => addr.id === value)
                  if (address) setSelectedAddress(address)
                }}
              >
                {savedAddresses.map((address) => (
                  <div key={address.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={address.id} id={address.id} />
                    <label 
                      htmlFor={address.id}
                      className="flex-1 cursor-pointer p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-start gap-2">
                        <Home className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <p className="font-medium">{address.type}</p>
                          <p className="text-sm text-gray-600">
                            {address.street}, {address.number} - {address.neighborhood}
                          </p>
                          <p className="text-sm text-gray-500">
                            {address.city}, {address.state} - {address.cep}
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </RadioGroup>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setIsAddingNewAddress(true)}
              >
                <Plus className="mr-2 w-4 h-4" />
                Adicionar novo endereço
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">Você ainda não tem endereços cadastrados</p>
              <Button 
                onClick={() => setIsAddressSheetOpen(true)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="mr-2 w-4 h-4" />
                Cadastrar Endereço
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsAddingNewAddress(false)}
                className="ml-2"
              >
                Cancelar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
  
  // Renderizar etapa de pagamento
  const renderPaymentStep = () => (
    <div>
      {debug && !publicKey && (
        <div className="mb-4 p-3 border border-amber-300 bg-amber-50 rounded text-amber-800 text-xs">
          <p className="font-semibold mb-1">[DEBUG] Public Key ausente</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Verifique registro em restaurants: campos mercadoPagoPublicKey e mercadoPagoConfigured.</li>
            <li>Endpoint: /api/restaurants/{restaurantSlug}/mp-public-key retornou null.</li>
            <li>Pode usar fallback env MP_PUBLIC_KEY ou NEXT_PUBLIC_MP_PUBLIC_KEY.</li>
            <li>Após atualizar banco, recarregue com ?mpDebug=1.</li>
          </ul>
        </div>
      )}
      {/* Status pendente */}
      {paymentState.status === 'pending' && (
        <Card className="border-amber-200">
          <CardContent className="p-4 space-y-2 text-sm text-amber-700">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Pagamento pendente ou aguardando confirmação.</span>
            </div>
            {fallbackPolling && <p className="text-xs text-amber-600">Aguardando atualização...</p>}
          </CardContent>
        </Card>
      )}

      {/* Status rejeitado */}
      {paymentState.status === 'rejected' && (
        <Card className="border-red-200">
          <CardContent className="p-4 space-y-3 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>Pagamento não aprovado. Tente novamente.</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setPaymentState(prev => ({ ...prev, status: 'idle', method: null }))}
              >
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* PIX Payment */}
      {paymentState.pixData && (
        <PixPayment 
          pixData={paymentState.pixData}
          onCopy={handlePixCopy}
        />
      )}
      {/* Payment Brick Oficial do Mercado Pago */}
      {(() => {
        const canRender = (paymentState.status === 'idle' || paymentState.status === 'processing') && !paymentState.pixData && !!publicKey
        if (!canRender && debug) {
          pushDebug('payment-brick:skip', {
            status: paymentState.status,
            hasPix: !!paymentState.pixData,
            hasPublicKey: !!publicKey
          })
        } else if (canRender && debug) {
          pushDebug('payment-brick:render', {
            status: paymentState.status,
            hasPublicKey: !!publicKey
          })
        }
        return canRender ? (
        <div id="payment-brick-wrapper" className="-mx-2">
          <MercadoPagoPaymentBrick
            key="stable-payment-brick" // Chave estável para evitar re-mounts
            publicKey={publicKey}
            amount={totalPrice}
            customerInfo={{
              name: customerInfo.name || 'Cliente',
              email: customerInfo.email || 'cliente@exemplo.com',
              phone: customerInfo.phone || ''
            }}
            items={items.map(item => ({
              id: item.id,
              name: item.name,
              price: item.finalPrice,
              quantity: item.quantity
            }))}
            selectedAddress={selectedAddress ? {
              street: selectedAddress.street || '',
              number: selectedAddress.number || '',
              complement: selectedAddress.reference,
              neighborhood: selectedAddress.neighborhood || '',
              city: selectedAddress.city || '',
              state: selectedAddress.state || '',
              zipcode: selectedAddress.cep || ''
            } : undefined}
            restaurantSlug={restaurantSlug || ''}
            debug={debug}
            onPaymentSuccess={(result) => {
              console.log('🟢 Payment Success:', result)
              const paymentResult = result as Record<string, unknown>
              if (paymentResult?.type === 'pix_payment') {
                setPaymentState(prev => ({
                  ...prev,
                  status: 'pending',
                  pixData: {
                    qr_code: paymentResult.qr_code as string,
                    qr_code_base64: paymentResult.qr_code_base64 as string,
                    ticket_url: paymentResult.ticket_url as string
                  },
                  paymentData: paymentResult
                }))
                setOrderNumber((paymentResult.order_number as string) || `ORD-${Date.now()}`)
              } else if (paymentResult?.status === 'approved') {
                setPaymentState(prev => ({ ...prev, status: 'approved', paymentData: paymentResult }))
                setTimeout(() => setCurrentStep('confirmation'), 500)
              } else if (paymentResult?.status === 'in_process' || paymentResult?.status === 'pending') {
                setPaymentState(prev => ({ ...prev, status: 'pending', paymentData: paymentResult }))
              } else {
                setPaymentState(prev => ({ ...prev, status: 'rejected', paymentData: paymentResult }))
              }
            }}
            onPaymentError={(error) => {
              console.error('🔴 Payment Error:', error)
              setPaymentState(prev => ({ ...prev, status: 'rejected' }))
              toast.error(error.message || 'Erro no pagamento')
            }}
          />
        </div>
        ) : null
      })()}
      {debug && (
        <div className="mt-4 border rounded bg-gray-50 p-2 text-[10px] font-mono">
          <p className="font-semibold mb-1">Checkout Debug</p>
          <pre className="max-h-48 overflow-auto">{JSON.stringify({
            step: currentStep,
            paymentStatus: paymentState.status,
            hasPixData: !!paymentState.pixData,
            publicKeyPresent: !!publicKey,
            items: items.length,
            totalPrice,
            restaurantSlug,
            loadingPublicKey: _loadingPublicKey
          }, null, 2)}</pre>
        </div>
      )}
      <div className="flex gap-4 pt-3 border-t border-gray-100 mt-3 px-2">
        <Button 
          variant="outline" 
          onClick={prevStep} 
          className="flex-1 h-12 border-2 hover:border-orange-300 hover:bg-orange-50"
        >
          <ArrowLeft className="mr-2 w-4 h-4" />
          Voltar
        </Button>
      </div>
    </div>
  )
  
  // Renderizar etapa de confirmação
  const renderConfirmationStep = () => {
    // Se temos paymentId, usar o Status Screen Brick oficial
    const paymentId = paymentState.paymentData?.payment_id as string
    
    if (paymentId) {
      return (
        <div className="space-y-4">
          <MercadoPagoStatusScreenBrick
            paymentId={paymentId}
            onReady={() => {
              console.log('Status Screen Brick carregado para payment:', paymentId)
            }}
            onError={(error) => {
              console.error('Erro no Status Screen Brick:', error)
              toast.error('Erro ao carregar status do pagamento')
            }}
            backUrls={{
              return: `${window.location.origin}`,
              error: `${window.location.origin}/error`
            }}
          />
          
          {/* Botão para fazer novo pedido */}
          <div className="mt-6 pt-4 border-t">
            <Button 
              className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => {
                clearCart()
                setCurrentStep('cart')
                setPaymentState({
                  method: null,
                  status: 'idle',
                  paymentData: null,
                  pixData: null
                })
              }}
            >
              Fazer novo pedido
            </Button>
          </div>
        </div>
      )
    }
    
    // Fallback para a tela customizada caso não tenhamos paymentId
    return (
      <div className="space-y-4 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Pedido Confirmado!</h3>
          <p className="text-gray-600 mb-4">
            Seu pagamento foi processado com sucesso
          </p>
          
          {orderNumber && (
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Número do pedido:</p>
                <p className="font-mono font-bold text-lg">{orderNumber}</p>
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Você receberá uma confirmação por e-mail
          </p>
          <p className="text-sm text-gray-600">
            Tempo estimado de entrega: 30-45 minutos
          </p>
        </div>
        
        <Button 
          className="w-full h-12 bg-green-500 hover:bg-green-600 text-white mt-4"
          onClick={() => {
            clearCart()
            setCurrentStep('cart')
            setPaymentState({
              method: null,
              status: 'idle',
              paymentData: null,
              pixData: null
            })
          }}
        >
          Fazer novo pedido
        </Button>
      </div>
    )
  }
  
  // Renderizar conteúdo baseado na etapa atual
  const renderStepContent = () => {
    switch (currentStep) {
      case 'cart':
        return renderCartStep()
      case 'address':
        return renderAddressStep()
      case 'payment':
        return renderPaymentStep()
      case 'confirmation':
        return renderConfirmationStep()
      default:
        return renderCartStep()
    }
  }
  
  if (totalItems === 0) {
    console.log('IntegratedCheckout - Não renderizando: totalItems === 0')
    return null
  }
  
  // console.log('IntegratedCheckout - Renderizando botão flutuante, totalItems:', totalItems)

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              size="lg"
              className="relative w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-600 shadow-lg border-2 border-white transition-colors duration-200"
            >
              <ShoppingCart className="w-5 h-5 text-white" />
              <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs h-5 w-5 rounded-full flex items-center justify-center p-0 border-2 border-white">
                {totalItems}
              </Badge>
            </Button>
          </div>
        </SheetTrigger>
        
        <SheetContent 
          side="bottom" 
          className="rounded-t-3xl h-[94vh] border-0 shadow-2xl bg-white flex flex-col pt-6"
          style={{
            // Força posicionamento fixo para evitar movimento com teclado
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            top: 'unset',
            height: 'min(94vh, 94dvh)',
            maxHeight: 'min(94vh, 94dvh)',
            transform: 'translateX(0) translateY(0)',
            // CSS adicional para iOS
            WebkitTransform: 'translateX(0) translateY(0)',
            // Z-index adequado
            zIndex: 9998
          }}
          onOpenAutoFocus={(e) => {
            // Previne auto-focus que pode triggerar o teclado
            e.preventDefault()
          }}
        >
          <SheetHeader className={`${currentStep === 'payment' ? 'pb-1 pt-0' : 'pb-0 pt-0'} px-6 flex-shrink-0 transition-all`}> 
              <SheetTitle className="text-center text-xl font-bold text-gray-800">
                {stepTitles[currentStep]}
              </SheetTitle>
              <div className={`${currentStep === 'payment' ? 'mt-4 mb-0' : 'mt-4'}`}>
                <StepIndicator currentStep={currentStep} />
              </div>
          </SheetHeader>
          
          {/* Área de conteúdo com scroll otimizado */}
          <div className={`flex-1 overflow-auto ${currentStep === 'payment' ? 'px-4 pt-0 pb-2' : currentStep === 'address' ? 'px-0 pt-0 pb-4' : 'px-6 pt-0 pb-4'}`}>
            <div className={
              currentStep === 'payment'
                ? 'space-y-0 -mt-12'
                : currentStep === 'address'
                  ? 'space-y-0 [&_*]:mt-0 first:mt-0'
                  : ''
            }>
              {renderStepContent()}
            </div>
          </div>

          {/* Footer fixo com botões de navegação */}
          {currentStep !== 'confirmation' && (
            <div className={`flex-shrink-0 border-t border-gray-100 bg-white px-6 ${currentStep === 'payment' ? 'py-0' : 'py-4'}`}>
              {/* Resumo de valores para etapa do carrinho */}
              {currentStep === 'cart' && (
                <div className="mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>R$ {(totalPrice - deliveryFee).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Taxa de entrega</span>
                    <span>R$ {deliveryFee.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-orange-600">R$ {totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                {currentStep !== 'cart' && currentStep !== 'payment' && (
                  <Button 
                    variant="outline" 
                    onClick={prevStep} 
                    className="flex-1 h-12 border-2 hover:border-orange-300 hover:bg-orange-50"
                  >
                    <ArrowLeft className="mr-2 w-4 h-4" />
                    Voltar
                  </Button>
                )}
                
                {currentStep === 'cart' && (
                  <Button 
                    onClick={() => {
                      // Verificar se o restaurante pode aceitar pedidos
                      if (restaurantStatus && !restaurantStatus.canAcceptOrders) {
                        toast.error(restaurantStatus.message || 'Restaurante não está aceitando pedidos no momento')
                        return
                      }
                      nextStep()
                    }}
                    className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={!!(restaurantStatus && !restaurantStatus.canAcceptOrders)}
                  >
                    {restaurantStatus && !restaurantStatus.canAcceptOrders 
                      ? 'Restaurante Fechado' 
                      : 'Continuar'
                    }
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                )}

                {currentStep === 'address' && (
                  <Button 
                    onClick={() => {
                      // Verificar se o restaurante pode aceitar pedidos
                      if (restaurantStatus && !restaurantStatus.canAcceptOrders) {
                        toast.error(restaurantStatus.message || 'Restaurante não está aceitando pedidos no momento')
                        return
                      }
                      nextStep()
                    }}
                    className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={!selectedAddress || !customerInfo.name || !customerInfo.email || !!(restaurantStatus && !restaurantStatus.canAcceptOrders)}
                  >
                    {restaurantStatus && !restaurantStatus.canAcceptOrders 
                      ? 'Restaurante Fechado' 
                      : 'Continuar'
                    }
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      
      {/* Sheet para Formulário de Endereço */}
      <Sheet open={isAddressSheetOpen} onOpenChange={setIsAddressSheetOpen}>
        <SheetContent 
          side="bottom" 
          className="h-[90vh] max-h-[90vh] rounded-t-3xl border-0 shadow-2xl"
          style={{ 
            height: 'min(90vh, 90dvh)', 
            maxHeight: 'min(90vh, 90dvh)',
            // Força posicionamento fixo para evitar movimento com teclado
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            top: 'unset',
            transform: 'translateX(0) translateY(0)',
            // CSS adicional para iOS
            WebkitTransform: 'translateX(0) translateY(0)',
            // Previne redimensionamento
            resize: 'none',
            // Z-index alto para garantir que fique acima
            zIndex: 9999
          }}
          onOpenAutoFocus={(e) => {
            // Previne auto-focus que pode triggerar o teclado
            e.preventDefault()
          }}
        >
          <VisuallyHidden>
            <SheetTitle>
              Adicionar Novo Endereço
            </SheetTitle>
          </VisuallyHidden>
          <AddressFormBottomSheet
            onSave={handleSaveAddress}
            onCancel={() => setIsAddressSheetOpen(false)}
            isLoading={isSavingAddress}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}