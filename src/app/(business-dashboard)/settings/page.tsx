'use client'

import { useState, useEffect } from 'react'
import ReactQRCode from 'react-qr-code'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Input as FormattedInput } from '@/components/ui/input-formatted'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ImageUploadDialog } from '@/components/ui/image-upload-dialog'
import { ImageType } from '@/lib/services/image-types'
import { DashboardHeader, DashboardHeaderButton } from '@/components/ui/dashboard-header'
import Image from 'next/image'
import { 
  Store,
  Clock,
  Bell,
  Save,
  Truck,
  CreditCard
} from 'lucide-react'
import { useSession } from '@/lib/auth/auth-client'
import { useBusinessFull, useBusinessId, useBusinessStore } from '@/stores/business-store'
import { useAutoOpenClose } from '@/hooks/business/use-auto-open-close'
import { useRouter, useSearchParams } from 'next/navigation'
import { notify } from '@/lib/notifications/notify'
import { slugify } from '@/lib/utils/formatters'
import { updateBusiness, updateBusinessStatus } from '@/actions/business/business'

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const { data: session, isPending } = useSession()
  const business = useBusinessFull()
  const businessId = useBusinessId()
  const router = useRouter()

  const [businessSettings, setBusinessSettings] = useState({
    id: '',
    slug: '',
    name: 'Meu Negócio',
    description: 'Deliciosas refeições feitas com amor',
    phone: '',
    email: '',
    address: '',
    addressNumber: '',
    neighborhood: '',
    city: '',
    state: '',
    cep: '',
    category: 'Restaurante',
    avatar: '',
    banner: '',
    openingHours: '18:00 - 23:30',
    isOpen: true,
    acceptsDelivery: true,
    acceptsPickup: true,
    acceptsDineIn: true,
    minimumOrder: 20.00,
    deliveryFee: 5.00,
    deliveryTime: 30
  })

  const [notifications, setNotifications] = useState({
    newOrders: true,
    lowStock: true,
    reviews: true,
    promotions: false
  })

  const [payments, setPayments] = useState({
    acceptsCash: true,
    acceptsCard: true,
    acceptsPix: true,
    mercadoPagoEnabled: false,
    mercadoPagoPublicKey: '',
    mercadoPagoAccessToken: ''
  })

  const [hours, setHours] = useState({
    monday: { open: '08:00', close: '22:00', closed: false },
    tuesday: { open: '08:00', close: '22:00', closed: false },
    wednesday: { open: '08:00', close: '22:00', closed: false },
    thursday: { open: '08:00', close: '22:00', closed: false },
    friday: { open: '08:00', close: '23:00', closed: false },
    saturday: { open: '09:00', close: '23:00', closed: false },
    sunday: { open: '09:00', close: '21:00', closed: false }
  })

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login')
    }
  }, [session, isPending, router])

  // Função para parsear endereço completo em campos separados
  const parseAddress = (fullAddress: string) => {
    // Tentar extrair CEP (formato 12345-678 ou 12345678)
    const cepMatch = fullAddress.match(/(\d{5}-?\d{3})/)
    const cep = cepMatch ? cepMatch[1] : ''

    // Tentar extrair estado (últimas 2 letras maiúsculas antes do CEP)
    const stateMatch = fullAddress.match(/\/([A-Z]{2})/)
    const state = stateMatch ? stateMatch[1] : ''

    // Resto do parsing seria mais complexo, então por enquanto mantemos o endereço original
    return {
      address: fullAddress,
      addressNumber: '',
      neighborhood: '',
      city: '',
      state,
      cep
    }
  }

  useEffect(() => {
    if (business) {
      const addressParts = business.address ? parseAddress(business.address) : {
        address: '',
        addressNumber: '',
        neighborhood: '',
        city: '',
        state: '',
        cep: ''
      }

      setBusinessSettings(prev => ({
        ...prev,
        id: business.id,
        slug: business.slug || '',
        name: business.name || prev.name,
        description: business.description || prev.description,
        phone: business.phone || prev.phone,
        email: business.email || prev.email,
        address: addressParts.address,
        addressNumber: addressParts.addressNumber,
        neighborhood: addressParts.neighborhood,
        city: addressParts.city,
        state: addressParts.state,
        cep: addressParts.cep,
        avatar: business.avatar || prev.avatar,
        banner: business.banner || prev.banner,
        openingHours: business.openingHours || prev.openingHours,
        isOpen: business.isOpen ?? prev.isOpen,
        acceptsDelivery: business.acceptsDelivery ?? prev.acceptsDelivery,
        acceptsPickup: business.acceptsPickup ?? prev.acceptsPickup,
        acceptsDineIn: business.acceptsDineIn ?? prev.acceptsDineIn,
        minimumOrder: business.minimumOrder ?? prev.minimumOrder,
        deliveryFee: business.deliveryFee ?? prev.deliveryFee,
        deliveryTime: business.deliveryTime ?? prev.deliveryTime,
      }))
      // Preencher pagamentos
      type BusinessPaymentFields = {
        mercadoPagoConfigured?: boolean | null
        mercadoPagoPublicKey?: string | null
        mercadoPagoAccessToken?: string | null
      }
      const b = (business as unknown as BusinessPaymentFields) || {}
      setPayments({
        acceptsCash: true,
        acceptsCard: true,
        acceptsPix: true,
        mercadoPagoEnabled: b.mercadoPagoConfigured ?? false,
        mercadoPagoPublicKey: b.mercadoPagoPublicKey || '',
        mercadoPagoAccessToken: b.mercadoPagoAccessToken || ''
      })
      // Parse openingHours JSON
      try {
        if (business.openingHours && business.openingHours.trim().startsWith('{')) {
          const parsed = JSON.parse(business.openingHours)
          setHours(parsed)
        }
      } catch {}
    }
  }, [business])

  // Sincroniza abertura/fechamento automaticamente no cliente a cada minuto
  useAutoOpenClose(businessSettings.openingHours, {
    syncToServer: true,
    onStatusChange: (isOpen) => setBusinessSettings(prev => ({ ...prev, isOpen })),
    intervalMs: 60_000,
  })

  const handleSave = async () => {
    setLoading(true)
    try {
      const result = await updateBusiness({
        name: businessSettings.name,
        slug: slugify(businessSettings.slug),
        description: businessSettings.description,
        phone: businessSettings.phone,
        address: `${businessSettings.address}, ${businessSettings.addressNumber} - ${businessSettings.neighborhood}, ${businessSettings.city}/${businessSettings.state} - ${businessSettings.cep}`,
        deliveryTime: businessSettings.deliveryTime,
        deliveryFee: businessSettings.deliveryFee,
        minimumOrder: businessSettings.minimumOrder,
        acceptsDelivery: businessSettings.acceptsDelivery,
        acceptsPickup: businessSettings.acceptsPickup,
        acceptsDineIn: businessSettings.acceptsDineIn,
        openingHours: JSON.stringify(hours),
        // Pagamentos
        mercadoPagoConfigured: payments.mercadoPagoEnabled,
        mercadoPagoPublicKey: payments.mercadoPagoPublicKey || null,
        mercadoPagoAccessToken: payments.mercadoPagoAccessToken || null,
      })
      
      if (!result.success) {
        throw new Error(result.error)
      }

      notify('success', 'Perfil atualizado', { description: 'As informações da empresa foram salvas.' })
      notify('success', 'Configurações salvas', { description: 'Todas as alterações foram aplicadas' })
      
    } catch (error) {
      console.error('Erro ao salvar:', error)
      notify('error', 'Erro ao salvar', { description: error instanceof Error ? error.message : 'Não foi possível salvar as configurações' })
    } finally {
      setLoading(false)
    }
  }

  // Mercado Pago connect flow
  const [mpConnecting, setMpConnecting] = useState(false)
  const [mpAuthUrl, setMpAuthUrl] = useState<string | null>(null)
  const { refreshBusiness } = useBusinessStore()
  const searchParams = useSearchParams()

  // Se voltamos do fluxo de Mercado Pago com mp=connected, revalidar os dados do negócio
  useEffect(() => {
    try {
      const mp = searchParams?.get?.('mp')
      if (mp === 'connected') {
        refreshBusiness().catch(() => {})
        notify('success', 'Mercado Pago conectado', { description: 'A conta Mercado Pago foi conectada.' })
        router.replace('/dashboard/settings')
      }
    } catch {
      // noop
    }
  }, [searchParams, refreshBusiness, router])

  const handleConnectMercadoPago = async () => {
    setMpConnecting(true)
    try {
      const res = await fetch('/api/mercadopago/connect')
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Erro')

      // Use the official authorization URL returned by the API.
      // This is the documented OAuth authorization endpoint and is the
      // recommended flow (the provider will decide whether to open app or web).
      if (json.url) {
        setMpAuthUrl(json.url)
      } else {
        throw new Error('Resposta inválida do servidor')
      }
    } catch (error) {
      notify('error', 'Erro', { description: error instanceof Error ? error.message : 'Não foi possível iniciar conexão' })
    } finally {
      setMpConnecting(false)
    }
  }

  const handleToggleOpen = async () => {
    const newStatus = !businessSettings.isOpen
    setBusinessSettings(prev => ({ ...prev, isOpen: newStatus }))

    try {
      const result = await updateBusinessStatus(newStatus)
      
      if (!result.success) {
        throw new Error(result.error)
      }
      
      if (newStatus) {
        notify('success', 'Empresa ativada!', { description: 'Sua empresa está pronta para receber pedidos.' })
        notify('success', 'Empresa aberta', { description: 'Agora você pode receber pedidos' })
      } else {
        notify('info', 'Empresa fechada', { description: 'Novos pedidos não serão aceitos' })
      }
    } catch (error) {
      // Reverter em caso de erro
      setBusinessSettings(prev => ({ ...prev, isOpen: !newStatus }))
      notify('error', 'Erro', { description: error instanceof Error ? error.message : 'Não foi possível alterar o status' })
    }
  }

  if (isPending || !businessId) {
    return null // Sem loading visual
  }

  if (!session) {
    return null
  }

  const dayNames: { [key: string]: string } = {
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
    sunday: 'Domingo'
  }

  const tabs = [
    { id: 'general', label: 'Geral', icon: Store },
    { id: 'delivery', label: 'Entrega', icon: Truck },
    { id: 'hours', label: 'Horários', icon: Clock },
    { id: 'payments', label: 'Pagamentos', icon: CreditCard },
    { id: 'notifications', label: 'Notificações', icon: Bell },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <DashboardHeader
        title="Configurações"
        description="Gerencie as configurações da sua empresa"
      >
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${businessSettings.isOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              Empresa {businessSettings.isOpen ? 'Aberto' : 'Fechado'}
            </span>
            <Switch
              checked={businessSettings.isOpen}
              onCheckedChange={handleToggleOpen}
            />
          </div>
          
          <DashboardHeaderButton 
            onClick={handleSave} 
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </DashboardHeaderButton>
        </div>
      </DashboardHeader>

      {/* Tabs Navigation */}
      <div className="flex space-x-8 border-b border-gray-200">
        {tabs.map((tab) => {
          const IconComponent = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <IconComponent className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="space-y-6">
        <div className="max-w-6xl">
          {activeTab === 'general' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Seu Perfil</h3>
                <p className="text-sm text-gray-500">Atualize as configurações do seu perfil aqui</p>
              </div>

              {/* Profile Picture */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-900">Logo da Empresa</Label>
                <div className="flex items-center gap-6">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={businessSettings.avatar} />
                    <AvatarFallback className="bg-orange-100 text-orange-600 text-xl">
                      {businessSettings.name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2 space-x-2">
                    <ImageUploadDialog
                      entityId={businessSettings.id}
                      imageType={ImageType.BUSINESS_LOGO}
                      onImageSelect={async (image) => {
                        setBusinessSettings(prev => ({
                          ...prev,
                          avatar: image.url
                        }))
                        try {
                          const result = await updateBusiness({ avatar: image.url })
                          if (result.success) {
                            notify('success', 'Logo atualizada com sucesso!')
                          } else {
                            throw new Error(result.error)
                          }
                        } catch (error) {
                          notify('error', 'Erro ao atualizar logo', { 
                            description: error instanceof Error ? error.message : 'Erro desconhecido' 
                          })
                        }
                      }}
                      title="Selecionar Logo da Empresa"
                      description="Escolha uma imagem para representar sua empresa"
                    >
                      <Button variant="outline" size="sm">
                        Editar Logo
                      </Button>
                    </ImageUploadDialog>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      Remover
                    </Button>
                  </div>
                </div>
              </div>

              {/* Banner Image */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-900">Banner da Empresa</Label>
                <div className="space-y-4">
                  {businessSettings.banner ? (
                    <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={businessSettings.banner}
                        alt="Banner da empresa"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 800px"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                      <p className="text-gray-500 text-sm">Nenhum banner adicionado</p>
                    </div>
                  )}
                  <div className="space-x-2">
                    <ImageUploadDialog
                      entityId={businessSettings.id}
                      imageType={ImageType.BUSINESS_BANNER}
                      onImageSelect={async (image) => {
                        setBusinessSettings(prev => ({
                          ...prev,
                          banner: image.url
                        }))
                        try {
                          const result = await updateBusiness({ banner: image.url })
                          if (result.success) {
                            notify('success', 'Banner atualizado com sucesso!')
                          } else {
                            throw new Error(result.error)
                          }
                        } catch (error) {
                          notify('error', 'Erro ao atualizar banner', { 
                            description: error instanceof Error ? error.message : 'Erro desconhecido' 
                          })
                        }
                      }}
                      title="Selecionar Banner da Empresa"
                      description="Escolha uma imagem de banner para sua empresa (recomendado: 1200x600px)"
                    >
                      <Button variant="outline" size="sm">
                        {businessSettings.banner ? 'Alterar Banner' : 'Adicionar Banner'}
                      </Button>
                    </ImageUploadDialog>
                    {businessSettings.banner && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700"
                        onClick={async () => {
                          setBusinessSettings(prev => ({ ...prev, banner: '' }))
                          try {
                            const result = await updateBusiness({ banner: '' })
                            if (result.success) {
                              notify('success', 'Banner removido com sucesso!')
                            } else {
                              throw new Error(result.error)
                            }
                          } catch (error) {
                            notify('error', 'Erro ao remover banner', { 
                              description: error instanceof Error ? error.message : 'Erro desconhecido' 
                            })
                          }
                        }}
                      >
                        Remover Banner
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Recomendamos uma imagem no formato 1200x600 pixels para melhor qualidade
                  </p>
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-900">Nome da Empresa</Label>
                    <Input
                      id="name"
                      value={businessSettings.name}
                      onChange={(e) => setBusinessSettings(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Digite o nome da empresa"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug" className="text-sm font-medium text-gray-900">URL da Loja</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        {typeof window !== 'undefined' ? window.location.host : 'fastlivery.com'}/
                      </span>
                      <Input
                        id="slug"
                        value={businessSettings.slug}
                        onChange={(e) => setBusinessSettings(prev => ({ ...prev, slug: slugify(e.target.value) }))}
                        className="rounded-l-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="minha-pizzaria"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-900">Telefone</Label>
                  <FormattedInput
                    id="phone"
                    formatter="phone"
                    value={businessSettings.phone}
                    onChange={(e) => setBusinessSettings(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-900">Biografia</Label>
                  <Textarea
                    id="description"
                    value={businessSettings.description}
                    onChange={(e) => setBusinessSettings(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva sua loja e o que a torna especial..."
                    rows={4}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500">{businessSettings.description?.length || 0} caracteres restantes</p>
                </div>
              </div>
            </div>
          )}

          {/* Payments tab consolidated below (removed duplicate earlier UI) */}

          {activeTab === 'delivery' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Configurações de Entrega</h3>
                <p className="text-sm text-gray-500">Configure como você atende seus clientes</p>
              </div>

              {/* Service Types */}
              <div className="space-y-6">
                <div className="flex items-center justify-between py-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-900">Delivery</Label>
                    <p className="text-sm text-gray-500">Entrega em domicílio</p>
                  </div>
                  <Switch
                    checked={businessSettings.acceptsDelivery}
                    onCheckedChange={(checked) => setBusinessSettings(prev => ({ ...prev, acceptsDelivery: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between py-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-900">Retirada no Local</Label>
                    <p className="text-sm text-gray-500">Cliente retira no local</p>
                  </div>
                  <Switch
                    checked={businessSettings.acceptsPickup}
                    onCheckedChange={(checked) => setBusinessSettings(prev => ({ ...prev, acceptsPickup: checked }))}
                  />
                </div>
              </div>

              {/* Delivery Settings */}
              {businessSettings.acceptsDelivery && (
                <div className="space-y-6 border-t border-gray-200 pt-6">
                  <h4 className="text-base font-medium text-gray-900">Configurações de Delivery</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="deliveryTime" className="text-sm font-medium text-gray-900">Tempo de Entrega (min)</Label>
                      <FormattedInput
                        id="deliveryTime"
                        formatter="numbersOnly"
                        value={businessSettings.deliveryTime.toString()}
                        onChange={(e) => setBusinessSettings(prev => ({ ...prev, deliveryTime: parseInt(e.target.value) || 0 }))}
                        placeholder="30"
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deliveryFee" className="text-sm font-medium text-gray-900">Taxa de Entrega (R$)</Label>
                      <Input
                        id="deliveryFee"
                        type="number"
                        step="0.01"
                        value={businessSettings.deliveryFee}
                        onChange={(e) => setBusinessSettings(prev => ({ ...prev, deliveryFee: parseFloat(e.target.value) || 0 }))}
                        placeholder="5.00"
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minimumOrder" className="text-sm font-medium text-gray-900">Pedido Mínimo (R$)</Label>
                      <Input
                        id="minimumOrder"
                        type="number"
                        step="0.01"
                        value={businessSettings.minimumOrder}
                        onChange={(e) => setBusinessSettings(prev => ({ ...prev, minimumOrder: parseFloat(e.target.value) || 0 }))}
                        placeholder="20.00"
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'hours' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Horário de Funcionamento</h3>
                <p className="text-sm text-gray-500">Configure horários específicos para cada dia</p>
              </div>

              <div className="space-y-4">
                {Object.entries(hours).map(([day, schedule]) => (
                  <div key={day} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-32">
                        <Label className="text-sm font-medium text-gray-900">{dayNames[day]}</Label>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={schedule.open}
                          onChange={(e) => setHours(prev => ({
                            ...prev,
                            [day]: { ...prev[day as keyof typeof prev], open: e.target.value }
                          }))}
                          disabled={schedule.closed}
                          className="w-32 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm"
                        />
                        <span className="text-gray-500 text-sm">-</span>
                        <Input
                          type="time"
                          value={schedule.close}
                          onChange={(e) => setHours(prev => ({
                            ...prev,
                            [day]: { ...prev[day as keyof typeof prev], close: e.target.value }
                          }))}
                          disabled={schedule.closed}
                          className="w-32 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!schedule.closed}
                        onCheckedChange={(checked) => setHours(prev => ({
                          ...prev,
                          [day]: { ...prev[day as keyof typeof prev], closed: !checked }
                        }))}
                      />
                      <Label className="text-sm text-gray-600">Aberto</Label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Formas de Pagamento</h3>
                <p className="text-sm text-gray-500">Configure as formas de pagamento aceitas pela sua empresa</p>
              </div>

              {/* Métodos de Pagamento Básicos */}
              <div className="space-y-6">
                <h4 className="text-base font-medium text-gray-900">Métodos Aceitos</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-900">Dinheiro</Label>
                      <p className="text-sm text-gray-500">Aceitar pagamento em dinheiro na entrega</p>
                    </div>
                    <Switch
                      checked={payments.acceptsCash}
                      onCheckedChange={(checked) => setPayments(prev => ({ ...prev, acceptsCash: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-900">Cartão (Máquina)</Label>
                      <p className="text-sm text-gray-500">Aceitar cartão de débito e crédito na entrega</p>
                    </div>
                    <Switch
                      checked={payments.acceptsCard}
                      onCheckedChange={(checked) => setPayments(prev => ({ ...prev, acceptsCard: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-900">PIX</Label>
                      <p className="text-sm text-gray-500">Aceitar pagamento via PIX</p>
                    </div>
                    <Switch
                      checked={payments.acceptsPix}
                      onCheckedChange={(checked) => setPayments(prev => ({ ...prev, acceptsPix: checked }))}
                    />
                  </div>
                </div>
              </div>

              {/* Integração Mercado Pago */}
              <div className="space-y-6 border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-medium text-gray-900">Mercado Pago</h4>
                    <p className="text-sm text-gray-500">Configure sua conta Mercado Pago para receber pagamentos online</p>
                  </div>
                  <Switch
                    checked={payments.mercadoPagoEnabled}
                    onCheckedChange={(checked) => setPayments(prev => ({ ...prev, mercadoPagoEnabled: checked }))}
                  />
                </div>

                {payments.mercadoPagoEnabled && (
                  <div className="space-y-6 ml-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h5 className="text-sm font-medium text-blue-900 mb-2">Como configurar:</h5>
                      <ol className="text-sm text-blue-700 space-y-1">
                        <li>1. Acesse sua conta no <a href="https://developers.mercadopago.com/" target="_blank" className="underline">Mercado Pago Developers</a></li>
                        <li>2. Vá em &quot;Suas aplicações&quot; e crie uma nova aplicação</li>
                        <li>3. Copie as credenciais de teste ou produção</li>
                        <li>4. Cole as chaves nos campos abaixo</li>
                      </ol>
                    </div>

                    {/* Consolidated connect + QR layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-sm font-medium text-gray-900">Conectar Conta</h5>
                            <p className="text-sm text-gray-500">Clique em conectar para iniciar o fluxo OAuth. Depois de autorizar, você será redirecionado para completar a integração.</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button onClick={handleConnectMercadoPago} disabled={mpConnecting}>
                            {mpConnecting ? 'Conectando...' : (payments.mercadoPagoEnabled ? 'Conectar Mercado Pago' : 'Conectar Mercado Pago')}
                          </Button>

                          <a href={mpAuthUrl || '#'} target="_blank" rel="noreferrer">
                            <Button variant="outline">Abrir no navegador</Button>
                          </a>

                          <Button variant="ghost" onClick={async () => {
                            try {
                              const r = await fetch('/api/mercadopago/refresh', { method: 'POST' })
                              const j = await r.json()
                              if (!j.success) throw new Error(j.error || 'Erro')
                              notify('success', 'Token renovado', { description: 'Token do Mercado Pago renovado com sucesso' })
                            } catch (e) {
                              notify('error', 'Erro', { description: e instanceof Error ? e.message : 'Não foi possível renovar token' })
                            }
                          }}>Renovar token</Button>

                          <Button variant="destructive" onClick={async () => {
                            try {
                              const r = await fetch('/api/mercadopago/disconnect', { method: 'POST' })
                              const j = await r.json()
                              if (!j.success) throw new Error(j.error || 'Erro')
                              notify('success', 'Desconectado', { description: 'Conta Mercado Pago desconectada' })
                            } catch (e) {
                              notify('error', 'Erro', { description: e instanceof Error ? e.message : 'Não foi possível desconectar' })
                            }
                          }}>Desconectar</Button>
                        </div>

                        <div className="mt-2">
                          <p className="text-xs text-gray-500">Se preferir, copie o link e compartilhe no celular:</p>
                          <div className="mt-2 flex items-center space-x-2">
                            <input readOnly value={mpAuthUrl || ''} className="flex-1 input bg-white border-gray-200 rounded px-2 py-1 text-sm" />
                            <Button onClick={() => {
                              if (mpAuthUrl) navigator.clipboard.writeText(mpAuthUrl).then(() => notify('success','Copiado', { description: 'Link copiado para a área de transferência' })).catch(()=>{})
                            }}>Copiar</Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-center">
                        {mpAuthUrl ? (
                          <div className="bg-white p-4 rounded-md shadow">
                            <ReactQRCode value={mpAuthUrl} size={240} />
                            <p className="text-xs text-gray-500 mt-2 text-center">Escaneie com a câmera do celular</p>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">QR será exibido aqui após iniciar o fluxo</div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="mpPublicKey" className="text-sm font-medium text-gray-900">
                          Public Key
                          <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Input
                          id="mpPublicKey"
                          value={payments.mercadoPagoPublicKey}
                          onChange={(e) => setPayments(prev => ({ ...prev, mercadoPagoPublicKey: e.target.value }))}
                          placeholder="TEST-a1b2c3d4-e5f6-7890-ab12-c3d4e5f6g789"
                          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500">Chave pública para processar pagamentos no frontend</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="mpAccessToken" className="text-sm font-medium text-gray-900">
                          Access Token
                          <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Input
                          id="mpAccessToken"
                          type="password"
                          value={payments.mercadoPagoAccessToken}
                          onChange={(e) => setPayments(prev => ({ ...prev, mercadoPagoAccessToken: e.target.value }))}
                          placeholder="TEST-123456789-abcdef-ghijkl-mnopqr-stuvwxyz"
                          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500">Token de acesso para confirmar pagamentos no backend</p>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <div className="w-5 h-5 text-amber-600 mt-0.5">⚠️</div>
                        <div>
                          <h5 className="text-sm font-medium text-amber-800">Importante:</h5>
                          <p className="text-sm text-amber-700 mt-1">
                            • Use credenciais de <strong>TESTE</strong> para desenvolvimento<br/>
                            • Use credenciais de <strong>PRODUÇÃO</strong> apenas quando estiver pronto para receber pagamentos reais<br/>
                            • Mantenha suas credenciais seguras e não as compartilhe
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Notificações</h3>
                <p className="text-sm text-gray-500">Configure quando receber alertas</p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between py-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-900">Email Notification</Label>
                    <p className="text-sm text-gray-500">Você será notificado quando um novo email chegar.</p>
                  </div>
                  <Switch
                    checked={notifications.newOrders}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, newOrders: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between py-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-900">Sound Notification</Label>
                    <p className="text-sm text-gray-500">Você será notificado com som quando alguém te mandar uma mensagem.</p>
                  </div>
                  <Switch
                    checked={notifications.lowStock}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, lowStock: checked }))}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
