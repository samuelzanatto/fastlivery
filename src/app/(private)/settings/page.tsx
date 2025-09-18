'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Input as FormattedInput } from '@/components/ui/input-formatted'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ImageUploadDialog } from '@/components/ui/image-upload-dialog'
import { ImageType } from '@/lib/image-types'
import { 
  Store,
  Clock,
  Bell,
  Save,
  ImageIcon,
  Truck,
  ExternalLink
} from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { useRestaurantContext } from '@/hooks/useRestaurantContext'
import { useAutoOpenClose } from '@/hooks/use-auto-open-close'
import { useRouter } from 'next/navigation'
import { toastHelpers } from '@/lib/toast-helpers'
import { toast } from 'sonner'
import { slugify, buildPublicStoreUrl } from '@/lib/utils-app'
import { MercadoPagoConfig } from '@/components/mercadopago-config'

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const { data: session, isPending } = useSession()
    const { restaurant, isLoading: isLoadingRestaurant } = useRestaurantContext()
  const router = useRouter()
  
  const [restaurantSettings, setRestaurantSettings] = useState({
    id: '',
    slug: '',
    name: 'Meu Restaurante',
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

  const [uploading] = useState(false)

  const [notifications, setNotifications] = useState({
    newOrders: true,
    lowStock: true,
    reviews: true,
    promotions: false
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
    if (restaurant) {
      const addressParts = restaurant.address ? parseAddress(restaurant.address) : {
        address: '',
        addressNumber: '',
        neighborhood: '',
        city: '',
        state: '',
        cep: ''
      }

      setRestaurantSettings(prev => ({
        ...prev,
        id: restaurant.id,
        slug: restaurant.slug || '',
        name: restaurant.name || prev.name,
        description: restaurant.description || prev.description,
        phone: restaurant.phone || prev.phone,
        email: restaurant.email || prev.email,
        address: addressParts.address,
        addressNumber: addressParts.addressNumber,
        neighborhood: addressParts.neighborhood,
        city: addressParts.city,
        state: addressParts.state,
        cep: addressParts.cep,
        avatar: restaurant.avatar || prev.avatar,
        banner: restaurant.banner || prev.banner,
        openingHours: restaurant.openingHours || prev.openingHours,
        isOpen: restaurant.isOpen ?? prev.isOpen,
        acceptsDelivery: restaurant.acceptsDelivery ?? prev.acceptsDelivery,
        acceptsPickup: restaurant.acceptsPickup ?? prev.acceptsPickup,
        acceptsDineIn: restaurant.acceptsDineIn ?? prev.acceptsDineIn,
        minimumOrder: restaurant.minimumOrder ?? prev.minimumOrder,
        deliveryFee: restaurant.deliveryFee ?? prev.deliveryFee,
        deliveryTime: restaurant.deliveryTime ?? prev.deliveryTime,
      }))
      // Parse openingHours JSON
      try {
        if (restaurant.openingHours && restaurant.openingHours.trim().startsWith('{')) {
          const parsed = JSON.parse(restaurant.openingHours)
          setHours(parsed)
        }
      } catch {}
    }
  }, [restaurant])

  // Sincroniza abertura/fechamento automaticamente no cliente a cada minuto
  useAutoOpenClose(restaurantSettings.openingHours, {
    syncToServer: true,
    onStatusChange: (isOpen) => setRestaurantSettings(prev => ({ ...prev, isOpen })),
    intervalMs: 60_000,
  })

  const handleSave = async () => {
    setLoading(true)
    try {
      const payload = {
        name: restaurantSettings.name,
        slug: slugify(restaurantSettings.slug),
        description: restaurantSettings.description,
        phone: restaurantSettings.phone,
        email: restaurantSettings.email,
        address: `${restaurantSettings.address}, ${restaurantSettings.addressNumber} - ${restaurantSettings.neighborhood}, ${restaurantSettings.city}/${restaurantSettings.state} - ${restaurantSettings.cep}`,
        deliveryTime: restaurantSettings.deliveryTime,
        deliveryFee: restaurantSettings.deliveryFee,
        minimumOrder: restaurantSettings.minimumOrder,
        acceptsDelivery: restaurantSettings.acceptsDelivery,
        acceptsPickup: restaurantSettings.acceptsPickup,
        acceptsDineIn: restaurantSettings.acceptsDineIn,
        openingHours: hours,
      }
      const resp = await fetch('/api/restaurant/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!resp.ok) throw new Error('Falha ao salvar')

      toastHelpers.restaurant.profileUpdated()
      toastHelpers.system.success('Configurações salvas', 'Todas as alterações foram aplicadas')
      
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toastHelpers.system.error('Erro ao salvar', 'Não foi possível salvar as configurações')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleOpen = async () => {
    const newStatus = !restaurantSettings.isOpen
    setRestaurantSettings(prev => ({ ...prev, isOpen: newStatus }))
    
    try {
      await fetch('/api/restaurant/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen: newStatus })
      })
      
      if (newStatus) {
        toastHelpers.restaurant.activated()
        toastHelpers.system.success('Restaurante aberto', 'Agora você pode receber pedidos')
      } else {
        toastHelpers.system.info('Restaurante fechado', 'Novos pedidos não serão aceitos')
      }
    } catch {
      // Reverter em caso de erro
      setRestaurantSettings(prev => ({ ...prev, isOpen: !newStatus }))
      toastHelpers.system.error('Erro', 'Não foi possível alterar o status')
    }
  }

  if (isPending || isLoadingRestaurant) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    )
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
          <p className="text-slate-600">Gerencie as configurações do seu restaurante</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${restaurantSettings.isOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              Restaurante {restaurantSettings.isOpen ? 'Aberto' : 'Fechado'}
            </span>
            <Switch
              checked={restaurantSettings.isOpen}
              onCheckedChange={handleToggleOpen}
            />
          </div>
          
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Restaurant Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Store className="h-5 w-5 mr-2" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={restaurantSettings.avatar} />
                  <AvatarFallback>
                    {restaurantSettings.name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <ImageUploadDialog
                    entityId={restaurantSettings.id}
                    imageType={ImageType.RESTAURANT_LOGO}
                    onImageSelect={(image) => {
                      setRestaurantSettings(prev => ({
                        ...prev,
                        avatar: image.url
                      }))
                      // Salvar no banco de dados
                      fetch('/api/restaurant/update', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ avatar: image.url })
                      }).then(() => {
                        toast.success('Logo atualizada com sucesso!')
                      }).catch(() => {
                        toast.error('Erro ao atualizar logo')
                      })
                    }}
                    title="Selecionar Logo do Restaurante"
                    description="Escolha uma imagem para representar seu restaurante"
                  >
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                          Enviando...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Alterar Logo
                        </>
                      )}
                    </Button>
                  </ImageUploadDialog>
                  <p className="text-sm text-slate-500 mt-1">
                    Recomendado: 400x400px, formato PNG ou JPG
                  </p>
                </div>
              </div>

              {/* Banner */}
              <div className="flex flex-col gap-2 mb-6">
                <Label>Banner</Label>
                <div className="relative w-full h-32 bg-slate-100 rounded-md overflow-hidden">
                  {restaurantSettings.banner ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={restaurantSettings.banner} alt="Banner" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-slate-50 to-slate-100 border-2 border-dashed border-slate-300">
                      <div className="text-center">
                        <ImageIcon className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-600">Adicione um banner para sua loja</p>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <ImageUploadDialog
                    entityId={restaurantSettings.id}
                    imageType={ImageType.RESTAURANT_BANNER}
                    onImageSelect={(image) => {
                      setRestaurantSettings(prev => ({
                        ...prev,
                        banner: image.url
                      }))
                      // Salvar no banco de dados
                      fetch('/api/restaurant/update', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ banner: image.url })
                      }).then(() => {
                        toast.success('Banner atualizado com sucesso!')
                      }).catch(() => {
                        toast.error('Erro ao atualizar banner')
                      })
                    }}
                    title="Selecionar Banner do Restaurante"
                    description="Escolha uma imagem para o banner do seu restaurante"
                  >
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                          Enviando...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-4 w-4 mr-2" />
                          {restaurantSettings.banner ? 'Alterar Banner' : 'Adicionar Banner'}
                        </>
                      )}
                    </Button>
                  </ImageUploadDialog>
                  <p className="text-sm text-slate-500 mt-1">Recomendado: 1440x360px</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Restaurante</Label>
                  <Input
                    id="name"
                    value={restaurantSettings.name}
                    onChange={(e) => setRestaurantSettings(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Pizzaria do João"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL da Loja</Label>
                  <div className="space-y-1">
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        {typeof window !== 'undefined' ? window.location.host : 'zaplivery.com'}/
                      </span>
                      <Input
                        id="slug"
                        value={restaurantSettings.slug}
                        onChange={(e) => setRestaurantSettings(prev => ({ ...prev, slug: slugify(e.target.value) }))}
                        className="rounded-l-none"
                        placeholder="minha-pizzaria"
                      />
                    </div>
                    {restaurantSettings.slug && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <a 
                          href={buildPublicStoreUrl(restaurantSettings.slug)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:text-orange-700 flex items-center gap-1"
                        >
                          {buildPublicStoreUrl(restaurantSettings.slug)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={restaurantSettings.description}
                  onChange={(e) => setRestaurantSettings(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva sua loja e o que a torna especial..."
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    value={restaurantSettings.category}
                    onChange={(e) => setRestaurantSettings(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Ex: Pizzaria, Hamburgueria, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <FormattedInput
                    id="phone"
                    formatter="phone"
                    value={restaurantSettings.phone}
                    onChange={(e) => setRestaurantSettings(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={restaurantSettings.email}
                    onChange={(e) => setRestaurantSettings(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <FormattedInput
                    id="cep"
                    formatter="cep"
                    value={restaurantSettings.cep}
                    onChange={(e) => setRestaurantSettings(prev => ({ ...prev, cep: e.target.value }))}
                    onAddressFound={(addressData) => {
                      setRestaurantSettings(prev => ({
                        ...prev,
                        address: addressData.address,
                        neighborhood: addressData.neighborhood,
                        city: addressData.city,
                        state: addressData.state
                      }))
                    }}
                    placeholder="12345-678"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={restaurantSettings.address}
                    onChange={(e) => setRestaurantSettings(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Rua das Flores"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressNumber">Número</Label>
                  <Input
                    id="addressNumber"
                    value={restaurantSettings.addressNumber}
                    onChange={(e) => setRestaurantSettings(prev => ({ ...prev, addressNumber: e.target.value }))}
                    placeholder="123"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={restaurantSettings.neighborhood}
                    onChange={(e) => setRestaurantSettings(prev => ({ ...prev, neighborhood: e.target.value }))}
                    placeholder="Centro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={restaurantSettings.city}
                    onChange={(e) => setRestaurantSettings(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="São Paulo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={restaurantSettings.state}
                    onChange={(e) => setRestaurantSettings(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Operation Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Truck className="h-5 w-5 mr-2" />
                Configurações de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base">Delivery</Label>
                    <p className="text-sm text-slate-500">Entrega em domicílio</p>
                  </div>
                  <Switch
                    checked={restaurantSettings.acceptsDelivery}
                    onCheckedChange={(checked) => setRestaurantSettings(prev => ({ ...prev, acceptsDelivery: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base">Retirada</Label>
                    <p className="text-sm text-slate-500">Cliente retira no local</p>
                  </div>
                  <Switch
                    checked={restaurantSettings.acceptsPickup}
                    onCheckedChange={(checked) => setRestaurantSettings(prev => ({ ...prev, acceptsPickup: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base">Consumo Local</Label>
                    <p className="text-sm text-slate-500">Comer no restaurante</p>
                  </div>
                  <Switch
                    checked={restaurantSettings.acceptsDineIn}
                    onCheckedChange={(checked) => setRestaurantSettings(prev => ({ ...prev, acceptsDineIn: checked }))}
                  />
                </div>
              </div>

              {restaurantSettings.acceptsDelivery && (
                <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryTime">Tempo de Entrega (min)</Label>
                    <FormattedInput
                      id="deliveryTime"
                      formatter="numbersOnly"
                      value={restaurantSettings.deliveryTime.toString()}
                      onChange={(e) => setRestaurantSettings(prev => ({ ...prev, deliveryTime: parseInt(e.target.value) || 0 }))}
                      placeholder="30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryFee">Taxa de Entrega (R$)</Label>
                    <Input
                      id="deliveryFee"
                      type="number"
                      step="0.01"
                      value={restaurantSettings.deliveryFee}
                      onChange={(e) => setRestaurantSettings(prev => ({ ...prev, deliveryFee: parseFloat(e.target.value) || 0 }))}
                      placeholder="5.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minimumOrder">Pedido Mínimo (R$)</Label>
                    <Input
                      id="minimumOrder"
                      type="number"
                      step="0.01"
                      value={restaurantSettings.minimumOrder}
                      onChange={(e) => setRestaurantSettings(prev => ({ ...prev, minimumOrder: parseFloat(e.target.value) || 0 }))}
                      placeholder="20.00"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <Label className="text-base">Loja Aberta</Label>
                  <p className="text-sm text-slate-500">
                    Controle se a loja está aceitando pedidos
                  </p>
                </div>
                <Switch
                  checked={restaurantSettings.isOpen}
                  onCheckedChange={handleToggleOpen}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="openingHours">Horários de Funcionamento</Label>
                <Input
                  id="openingHours"
                  value={restaurantSettings.openingHours}
                  onChange={(e) => setRestaurantSettings(prev => ({ ...prev, openingHours: e.target.value }))}
                  placeholder="Ex: 18:00 - 23:30"
                />
                <p className="text-sm text-slate-500 mt-1">
                  Formato sugerido: HH:MM - HH:MM
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Business Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Horário de Funcionamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(hours).map(([day, schedule]) => (
                  <div key={day} className="flex items-center space-x-4">
                    <div className="w-32">
                      <Label>{dayNames[day]}</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2 flex-1">
                      <Input
                        type="time"
                        value={schedule.open}
                        onChange={(e) => setHours(prev => ({
                          ...prev,
                          [day]: { ...prev[day as keyof typeof prev], open: e.target.value }
                        }))}
                        disabled={schedule.closed}
                        className="w-24"
                      />
                      <span className="text-slate-500">às</span>
                      <Input
                        type="time"
                        value={schedule.close}
                        onChange={(e) => setHours(prev => ({
                          ...prev,
                          [day]: { ...prev[day as keyof typeof prev], close: e.target.value }
                        }))}
                        disabled={schedule.closed}
                        className="w-24"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={!schedule.closed}
                        onCheckedChange={(checked) => setHours(prev => ({
                          ...prev,
                          [day]: { ...prev[day as keyof typeof prev], closed: !checked }
                        }))}
                      />
                      <Label className="text-sm">Aberto</Label>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const resp = await fetch('/api/restaurant/update', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ openingHours: hours })
                      })
                      if (!resp.ok) throw new Error()
                      toastHelpers.system.success('Horário atualizado', 'Abertura/fechamento ajustados automaticamente')
                    } catch {
                      toastHelpers.system.error('Erro', 'Não foi possível atualizar os horários')
                    }
                  }}
                >
                  Salvar horários
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notificações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="newOrders">Novos Pedidos</Label>
                <Switch
                  id="newOrders"
                  checked={notifications.newOrders}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, newOrders: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="lowStock">Estoque Baixo</Label>
                <Switch
                  id="lowStock"
                  checked={notifications.lowStock}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, lowStock: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="reviews">Novas Avaliações</Label>
                <Switch
                  id="reviews"
                  checked={notifications.reviews}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, reviews: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="promotions">Promoções</Label>
                <Switch
                  id="promotions"
                  checked={notifications.promotions}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, promotions: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Mercado Pago Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <MercadoPagoConfig restaurantId={restaurantSettings.id} />
        </motion.div>
      </div>
    </div>
  )
}
