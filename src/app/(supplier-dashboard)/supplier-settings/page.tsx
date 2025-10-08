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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardHeader, DashboardHeaderButton } from '@/components/ui/dashboard-header'
import { 
  Save, 
  Building, 
  Bell,
  Shield,
  MessageSquare,
  Users,
  Phone
} from 'lucide-react'
import { useSession } from '@/lib/auth/auth-client'
import { useRouter } from 'next/navigation'
import { notify } from '@/lib/notifications/notify'
import { ClientsManager } from '@/components/supplier/clients-manager'
import Image from 'next/image'

export default function SupplierSettings() {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const { data: session, isPending } = useSession()
  const router = useRouter()

  const [supplierSettings, setSupplierSettings] = useState({
    id: '',
    name: 'Minha Empresa',
    description: 'Fornecedor de produtos de qualidade',
    phone: '',
    email: '',
    address: '',
    cnpj: '',
    category: '',
    logo: '',
    isActive: true
  })

  const [whatsappSettings, setWhatsappSettings] = useState({
    enabled: false,
    instanceName: '',
    instanceId: '',
    qrCode: '',
    status: 'disconnected', // disconnected, connecting, connected
    webhookUrl: '',
    botEnabled: false,
    botPrompt: ''
  })

  const [notifications, setNotifications] = useState({
    newOrders: true,
    newClients: true,
    reports: true,
    marketing: false
  })

  const [clients, setClients] = useState([])

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login')
    }
  }, [session, isPending, router])

  const loadClients = async () => {
    try {
      const response = await fetch('/api/clients')
      if (response.ok) {
        const data = await response.json()
        setClients(data.clients || [])
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    }
  }

  const loadWhatsappConfig = async () => {
    try {
      console.log('[WhatsApp Config] Carregando configurações...')
      const response = await fetch('/api/whatsapp/instance')
      if (response.ok) {
        const data = await response.json()
        console.log('[WhatsApp Config] Dados recebidos:', {
          success: data.success,
          status: data.config?.status,
          hasQrCode: !!data.config?.qrCode,
          qrCodeLength: data.config?.qrCode?.length || 0
        })
        
        if (data.config) {
          const newStatus = data.config.status === 'CONNECTED' ? 'connected' : 
                           data.config.status === 'CONNECTING' ? 'connecting' : 'disconnected'
          
          setWhatsappSettings(prev => {
            const shouldUpdate = prev.status !== newStatus || 
                               prev.qrCode !== (data.config.qrCode || '') ||
                               prev.enabled !== data.config.enabled
            
            if (shouldUpdate) {
              console.log('[WhatsApp Config] Atualizando estado:', {
                oldStatus: prev.status,
                newStatus,
                hasQrCode: !!data.config.qrCode
              })
            }
            
            return {
              ...prev,
              enabled: data.config.enabled,
              status: newStatus,
              instanceName: data.config.instanceName || '',
              qrCode: data.config.qrCode || '',
              botEnabled: data.config.botEnabled || false,
              botPrompt: data.config.botPrompt || ''
            }
          })
        }
      } else {
        console.error('[WhatsApp Config] Erro na resposta:', response.status)
      }
    } catch (error) {
      console.error('[WhatsApp Config] Erro ao carregar configurações:', error)
    }
  }

  // Polling inteligente para atualizar QR Code e status
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    let attempts = 0
    const maxAttempts = 60 // 3 minutos máximo (60 * 3s = 180s)
    let lastQrCode = whatsappSettings.qrCode
    
    if (whatsappSettings.status === 'connecting' && whatsappSettings.enabled) {
      interval = setInterval(async () => {
        attempts++
        console.log(`[WhatsApp Polling] Tentativa ${attempts}/${maxAttempts} - QR Code atual: ${lastQrCode ? 'presente' : 'ausente'}`)
        
        const prevQrCode = whatsappSettings.qrCode
        await loadWhatsappConfig()
        
        // Detectar mudança no QR Code
        if (whatsappSettings.qrCode !== prevQrCode) {
          if (whatsappSettings.qrCode && whatsappSettings.qrCode !== lastQrCode) {
            console.log('[WhatsApp Polling] QR Code atualizado automaticamente!')
            notify('info', 'QR Code atualizado', { 
              description: 'Um novo QR Code foi gerado. Escaneie para conectar.' 
            })
            lastQrCode = whatsappSettings.qrCode
            attempts = 0 // Resetar contador quando QR Code é atualizado
          }
        }
        
        // Parar polling se conectado
        if (whatsappSettings.status === 'connected') {
          console.log('[WhatsApp Polling] Conectado! Parando polling')
          if (interval) clearInterval(interval)
          notify('success', 'WhatsApp conectado!', { 
            description: 'Sua instância do WhatsApp está ativa e funcionando.' 
          })
          return
        }
        
        // Parar polling após máximo de tentativas
        if (attempts >= maxAttempts) {
          console.log('[WhatsApp Polling] Timeout - parando polling')
          if (interval) clearInterval(interval)
          setWhatsappSettings(prev => ({ 
            ...prev, 
            status: 'disconnected',
            qrCode: ''
          }))
          notify('error', 'Timeout na conexão', { 
            description: 'O QR Code expirou. Tente reconectar.' 
          })
        }
      }, 2000) // Polling mais rápido para capturar atualizações do QR Code
      
      console.log('[WhatsApp Polling] Iniciado com polling inteligente')
    } else {
      console.log('[WhatsApp Polling] Parado - status:', whatsappSettings.status)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
        console.log('[WhatsApp Polling] Limpo')
      }
    }
  }, [whatsappSettings.status, whatsappSettings.enabled, whatsappSettings.qrCode])

  useEffect(() => {
    if (session) {
      loadClients()
      loadWhatsappConfig()
    }
  }, [session])

  const handleSave = async () => {
    setLoading(true)
    try {
      // Implementar ação de salvar configurações
      notify('success', 'Configurações salvas', { description: 'Todas as alterações foram aplicadas' })
    } catch (error) {
      console.error('Erro ao salvar:', error)
      notify('error', 'Erro ao salvar', { description: error instanceof Error ? error.message : 'Não foi possível salvar as configurações' })
    } finally {
      setLoading(false)
    }
  }

  const handleWhatsappToggle = async (enabled: boolean) => {
    if (enabled) {
      try {
        // Primeiro tenta carregar configuração existente para reutilizar
        const getResp = await fetch('/api/whatsapp/instance')
        if (getResp.ok) {
          const getData = await getResp.json()
          if (getData?.config) {
            const existingStatusRaw = getData.config.status
            const mappedStatus = existingStatusRaw === 'CONNECTED' ? 'connected' : existingStatusRaw === 'CONNECTING' ? 'connecting' : 'disconnected'
            if (getData.config.enabled && (mappedStatus === 'connected' || mappedStatus === 'connecting')) {
              setWhatsappSettings(prev => ({
                ...prev,
                enabled: true,
                status: mappedStatus,
                instanceName: getData.config.instanceName || '',
                instanceId: getData.config.instanceId || '',
                qrCode: getData.config.qrCode || '',
                botEnabled: getData.config.botEnabled || false,
                botPrompt: getData.config.botPrompt || ''
              }))
              notify('info', mappedStatus === 'connected' ? 'WhatsApp já conectado' : 'Conexão em andamento', { description: mappedStatus === 'connected' ? 'Sessão reutilizada com sucesso.' : 'Aguardando finalizar conexão.' })
              return
            }
          }
        }

        setWhatsappSettings(prev => ({ ...prev, status: 'connecting', enabled: true }))

        // Criar ou reutilizar instância via POST
        const response = await fetch('/api/whatsapp/instance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instanceName: supplierSettings.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
          })
        })

        const result = await response.json()
        if (!result.success) throw new Error(result.error || 'Falha ao ativar')

        const statusMapped = result.reused ? 'connected' : 'connecting'

        setWhatsappSettings(prev => ({
          ...prev,
          enabled: true,
          instanceName: result.instanceName,
          instanceId: result.instanceId,
          qrCode: result.qrCode || '',
          webhookUrl: result.webhookUrl,
          status: statusMapped
        }))

        if (result.reused) {
          notify('success', 'WhatsApp ativo', { description: 'Sessão existente reutilizada.' })
        } else if (result.qrCode) {
          notify('success', 'WhatsApp ativado', { description: 'Escaneie o QR Code para conectar' })
        } else {
          notify('success', 'WhatsApp ativado', { description: 'Gerando QR Code, aguarde...' })
        }
      } catch (error) {
        setWhatsappSettings(prev => ({ ...prev, status: 'disconnected', enabled: false }))
        notify('error', 'Erro ao ativar WhatsApp', { description: error instanceof Error ? error.message : 'Erro desconhecido' })
      }
    } else {
      try {
        // Desativar instância na API
        const response = await fetch('/api/whatsapp/instance', {
          method: 'DELETE'
        })
        
        if (response.ok) {
          notify('success', 'WhatsApp desativado', { description: 'A conexão foi removida com sucesso' })
        }
      } catch (error) {
        console.error('Erro ao desativar WhatsApp:', error)
      }
      
      // Desativar instância
      setWhatsappSettings(prev => ({
        ...prev,
        enabled: false,
        status: 'disconnected',
        qrCode: ''
      }))
    }
  }

  // Persistir alteração de botEnabled imediatamente
  const handleBotEnabledChange = async (checked: boolean) => {
    setWhatsappSettings(prev => ({ ...prev, botEnabled: checked }))
    try {
      const resp = await fetch('/api/whatsapp/instance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botEnabled: checked })
      })
      if (!resp.ok) {
        notify('error', 'Falha ao salvar', { description: 'Não foi possível atualizar o estado do bot' })
        // rollback
        setWhatsappSettings(prev => ({ ...prev, botEnabled: !checked }))
      } else {
        notify('success', checked ? 'Bot ativado' : 'Bot desativado', { description: checked ? 'O assistente começará a responder automaticamente.' : 'Respostas automáticas desativadas.' })
      }
    } catch (e) {
      console.error('Erro ao persistir botEnabled', e)
      notify('error', 'Erro de rede', { description: 'Não foi possível salvar a alteração.' })
      setWhatsappSettings(prev => ({ ...prev, botEnabled: !checked }))
    }
  }

  // Debounce para salvar prompt
  useEffect(() => {
    if (!whatsappSettings.enabled) return
    if (!whatsappSettings.botEnabled) return
    if (!whatsappSettings.botPrompt) return
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        const resp = await fetch('/api/whatsapp/instance', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botPrompt: whatsappSettings.botPrompt }),
          signal: controller.signal
        })
        if (!resp.ok) {
          console.warn('Falha ao salvar prompt do bot')
        } else {
          console.log('[Bot Prompt] Atualizado com sucesso')
        }
      } catch (e: unknown) {
        if (typeof e === 'object' && e && 'name' in e && (e as { name?: string }).name === 'AbortError') {
          return
        }
        console.error('Erro ao salvar prompt', e)
      }
    }, 800) // 800ms debounce
    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [whatsappSettings.botPrompt, whatsappSettings.botEnabled, whatsappSettings.enabled])

  if (isPending) {
    return null
  }

  if (!session) {
    return null
  }

  const tabs = [
    { id: 'general', label: 'Geral', icon: Building },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'security', label: 'Segurança', icon: Shield },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <DashboardHeader
        title="Configurações"
        description="Gerencie as configurações da sua empresa fornecedora"
      >
        <DashboardHeaderButton 
          onClick={handleSave} 
          disabled={loading}
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </DashboardHeaderButton>
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
                  ? 'border-blue-500 text-blue-600'
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
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Perfil da Empresa</h3>
                <p className="text-sm text-gray-500">Atualize as informações da sua empresa fornecedora</p>
              </div>

              {/* Logo da Empresa */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-900">Logo da Empresa</Label>
                <div className="flex items-center gap-6">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={supplierSettings.logo} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-xl">
                      {supplierSettings.name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2 space-x-2">
                    <Button variant="outline" size="sm">
                      Editar Logo
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      Remover
                    </Button>
                  </div>
                </div>
              </div>

              {/* Informações Básicas */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-900">Nome da Empresa</Label>
                    <Input
                      id="name"
                      value={supplierSettings.name}
                      onChange={(e) => setSupplierSettings(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Digite o nome da empresa"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj" className="text-sm font-medium text-gray-900">CNPJ</Label>
                    <FormattedInput
                      id="cnpj"
                      formatter="cnpj"
                      value={supplierSettings.cnpj}
                      onChange={(e) => setSupplierSettings(prev => ({ ...prev, cnpj: e.target.value }))}
                      placeholder="00.000.000/0000-00"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-900">Telefone</Label>
                    <FormattedInput
                      id="phone"
                      formatter="phone"
                      value={supplierSettings.phone}
                      onChange={(e) => setSupplierSettings(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(11) 99999-9999"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-900">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={supplierSettings.email}
                      onChange={(e) => setSupplierSettings(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="contato@empresa.com"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-900">Descrição da Empresa</Label>
                  <Textarea
                    id="description"
                    value={supplierSettings.description}
                    onChange={(e) => setSupplierSettings(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva sua empresa e os produtos/serviços oferecidos..."
                    rows={4}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-medium text-gray-900">Categoria</Label>
                    <Input
                      id="category"
                      value={supplierSettings.category}
                      onChange={(e) => setSupplierSettings(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="Ex: Ingredientes, Embalagens, Equipamentos"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium text-gray-900">Endereço</Label>
                    <Input
                      id="address"
                      value={supplierSettings.address}
                      onChange={(e) => setSupplierSettings(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Endereço completo"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">WhatsApp Business</h3>
                <p className="text-sm text-gray-500">Configure o bot do WhatsApp para receber pedidos dos seus clientes</p>
              </div>

              {/* Ativar WhatsApp */}
              <div className="space-y-6">
                <div className="flex items-center justify-between py-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-900">Ativar WhatsApp</Label>
                    <p className="text-sm text-gray-500">Habilite o bot do WhatsApp para receber pedidos</p>
                  </div>
                  <Switch
                    checked={whatsappSettings.enabled}
                    onCheckedChange={handleWhatsappToggle}
                  />
                </div>

                {whatsappSettings.enabled && (
                  <div className="space-y-6 border-t border-gray-200 pt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* QR Code */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-base font-medium text-gray-900">Conectar WhatsApp</h4>
                          <p className="text-sm text-gray-500">Escaneie o QR Code com o WhatsApp do seu celular</p>
                        </div>

                        {whatsappSettings.status === 'connecting' && !whatsappSettings.qrCode && (
                          <div className="flex items-center justify-center w-64 h-64 bg-gray-100 rounded-lg">
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                              <p className="text-sm text-gray-500">Gerando QR Code...</p>
                            </div>
                          </div>
                        )}

                        {whatsappSettings.status === 'connecting' && whatsappSettings.qrCode && (
                          <div className="bg-white p-4 rounded-lg shadow border">
                            {/* Verificar se é base64 ou string simples */}
                            {whatsappSettings.qrCode.startsWith('data:image') || whatsappSettings.qrCode.startsWith('iVBORw0') ? (
                              <Image 
                                src={whatsappSettings.qrCode.startsWith('data:image') ? 
                                  whatsappSettings.qrCode : 
                                  `data:image/png;base64,${whatsappSettings.qrCode}`
                                } 
                                alt="QR Code WhatsApp"
                                width={240}
                                height={240}
                                className="mx-auto"
                                unoptimized
                              />
                            ) : whatsappSettings.qrCode.length > 4000 ? (
                              <div className="w-60 h-60 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                                <p className="text-center text-gray-500 text-sm">
                                  QR Code muito grande para exibir.<br />
                                  Use o WhatsApp Web diretamente.
                                </p>
                              </div>
                            ) : (
                              <ReactQRCode 
                                value={whatsappSettings.qrCode} 
                                size={240} 
                              />
                            )}
                            <p className="text-xs text-gray-500 mt-2 text-center">Escaneie com o WhatsApp do seu celular</p>
                            <div className="flex items-center justify-center mt-2">
                              <div className="animate-pulse w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                              <p className="text-xs text-yellow-600">Aguardando conexão...</p>
                            </div>
                          </div>
                        )}

                        {whatsappSettings.status === 'connected' && (
                          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                            <div className="flex items-center justify-center text-green-600 mb-2">
                              <Phone className="w-5 h-5 mr-2" />
                              <p className="font-medium">WhatsApp Conectado!</p>
                            </div>
                            <p className="text-sm text-green-700 text-center">
                              Seu WhatsApp está conectado e funcionando. Os clientes já podem fazer pedidos.
                            </p>
                          </div>
                        )}

                        {whatsappSettings.status === 'disconnected' && whatsappSettings.enabled && (
                          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                            <div className="flex items-center justify-center text-red-600 mb-4">
                              <Phone className="w-5 h-5 mr-2" />
                              <p className="font-medium">WhatsApp Desconectado</p>
                            </div>
                            <p className="text-sm text-red-700 text-center mb-4">
                              A conexão com o WhatsApp foi perdida. Clique no botão abaixo para reconectar.
                            </p>
                            <div className="flex justify-center">
                              <Button 
                                onClick={async () => {
                                  setWhatsappSettings(prev => ({ ...prev, status: 'connecting' }))
                                  await handleWhatsappToggle(false)
                                  setTimeout(() => handleWhatsappToggle(true), 1000)
                                }}
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-700 hover:bg-red-50"
                              >
                                Reconectar WhatsApp
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Configurações do Bot */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-base font-medium text-gray-900">Configurações do Bot</h4>
                          <p className="text-sm text-gray-500">Configure as respostas automáticas</p>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-sm font-medium">Bot Ativo</Label>
                              <p className="text-sm text-muted-foreground">Ativar respostas automáticas</p>
                            </div>
                            <Switch
                              checked={whatsappSettings.botEnabled}
                              onCheckedChange={handleBotEnabledChange}
                            />
                          </div>

                          {whatsappSettings.botEnabled && (
                            <div className="space-y-2">
                              <Label htmlFor="botPrompt" className="text-sm font-medium text-gray-900">Prompt do Bot</Label>
                              <Textarea
                                id="botPrompt"
                                value={whatsappSettings.botPrompt}
                                onChange={(e) => setWhatsappSettings(prev => ({ ...prev, botPrompt: e.target.value }))}
                                placeholder="Você é um assistente virtual da [NOME_DA_EMPRESA]. Ajude os clientes a fazer pedidos dos nossos produtos..."
                                rows={6}
                                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                              />
                              <p className="text-xs text-gray-500">
                                Configure como o bot deve responder aos clientes. Use [NOME_DA_EMPRESA] para inserir automaticamente o nome da sua empresa.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Informações sobre o fluxo */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <Phone className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <h5 className="text-sm font-medium text-blue-800">Como funciona:</h5>
                          <ul className="text-sm text-blue-700 mt-1 space-y-1">
                            <li>• Apenas clientes cadastrados podem fazer pedidos</li>
                            <li>• O bot apresenta seus produtos favoritos primeiro</li>
                            <li>• Cliente pode pesquisar produtos por nome</li>
                            <li>• Pedidos são confirmados automaticamente</li>
                            <li>• Você recebe notificações em tempo real</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Gerenciar Clientes</h3>
                <p className="text-sm text-gray-500">Cadastre clientes manualmente ou gerencie parcerias existentes</p>
              </div>

              {/* Componente de Gerenciamento de Clientes */}
              <ClientsManager 
                clients={clients}
                onClientUpdate={loadClients}
              />
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Notificações</h3>
                <p className="text-sm text-gray-500">Configure quando e como receber alertas</p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between py-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-900">Novos Pedidos</Label>
                    <p className="text-sm text-gray-500">Receber notificações de novos pedidos via WhatsApp</p>
                  </div>
                  <Switch
                    checked={notifications.newOrders}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, newOrders: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between py-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-900">Novos Clientes</Label>
                    <p className="text-sm text-gray-500">Notificar quando novos clientes se cadastrarem</p>
                  </div>
                  <Switch
                    checked={notifications.newClients}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, newClients: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between py-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-900">Relatórios</Label>
                    <p className="text-sm text-gray-500">Relatórios semanais por email</p>
                  </div>
                  <Switch
                    checked={notifications.reports}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, reports: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between py-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-900">Marketing</Label>
                    <p className="text-sm text-gray-500">Receber emails promocionais e novidades</p>
                  </div>
                  <Switch
                    checked={notifications.marketing}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, marketing: checked }))}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Segurança</h3>
                <p className="text-sm text-gray-500">Configurações de segurança da sua conta</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Alterar Senha</CardTitle>
                  <CardDescription>
                    Mantenha sua conta segura com uma senha forte
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Senha Atual</Label>
                    <Input id="currentPassword" type="password" />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <Input id="newPassword" type="password" />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                    <Input id="confirmPassword" type="password" />
                  </div>
                  <Button className="w-full">
                    Alterar Senha
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}