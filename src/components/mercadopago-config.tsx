'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  CreditCard, 
  Check, 
  AlertTriangle, 
  Eye, 
  EyeOff,
  ExternalLink,
  Shield,
  Zap,
  Info
} from 'lucide-react'

interface MercadoPagoConfigProps {
  restaurantId?: string
}

export function MercadoPagoConfig({ restaurantId: _restaurantId }: MercadoPagoConfigProps) {
  const [config, setConfig] = useState({
    configured: false,
    publicKey: null as string | null,
    restaurantName: '',
    isTestMode: false
  })
  const [formData, setFormData] = useState({
    accessToken: '',
    publicKey: ''
  })
  const [loading, setLoading] = useState(false)
  const [showTokens, setShowTokens] = useState(false)
  const [message, setMessage] = useState({ type: '', content: '' })

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/restaurant/mercadopago-config')
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
      }
    } catch (error) {
      console.error('Erro ao buscar configuração:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.accessToken || !formData.publicKey) {
      setMessage({
        type: 'error',
        content: 'Por favor, preencha todos os campos.'
      })
      return
    }

    setLoading(true)
    setMessage({ type: '', content: '' })

    try {
      const response = await fetch('/api/restaurant/mercadopago-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: 'success',
          content: data.message
        })
        setFormData({ accessToken: '', publicKey: '' })
        await fetchConfig()
      } else {
        setMessage({
          type: 'error',
          content: data.error
        })
      }
    } catch {
      setMessage({
        type: 'error',
        content: 'Erro ao salvar configuração. Tente novamente.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveConfig = async () => {
    if (!confirm('Tem certeza que deseja remover a configuração do Mercado Pago?')) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/restaurant/mercadopago-config', {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: 'success',
          content: data.message
        })
        await fetchConfig()
      } else {
        setMessage({
          type: 'error',
          content: data.error
        })
      }
    } catch {
      setMessage({
        type: 'error',
        content: 'Erro ao remover configuração. Tente novamente.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <CreditCard className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Mercado Pago</h2>
          <p className="text-gray-600">Configure pagamentos PIX e cartão para seu restaurante</p>
        </div>
        {config.configured && (
          <div className="flex gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Check className="w-3 h-3 mr-1" />
              Configurado
            </Badge>
            {config.isTestMode && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                🧪 Modo Teste
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Status da Configuração
          </CardTitle>
          <CardDescription>
            Estado atual da integração com o Mercado Pago
          </CardDescription>
        </CardHeader>
        <CardContent>
          {config.configured ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">
                    Mercado Pago Ativo {config.isTestMode ? '(Modo Teste)' : '(Produção)'}
                  </span>
                </div>
                <Badge variant="outline" className={`${
                  config.isTestMode 
                    ? 'border-yellow-200 text-yellow-700 bg-yellow-50' 
                    : 'border-green-200 text-green-700'
                }`}>
                  {config.isTestMode ? '🧪 Teste' : '✅ Produção'}
                </Badge>
              </div>

              {config.isTestMode && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded-full bg-yellow-500" />
                    <span className="font-medium text-yellow-800">Ambiente de Teste Ativo</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Os pagamentos são simulados e não processam dinheiro real. 
                    Perfeito para testar o sistema!
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-600" />
                  <span className="text-sm">PIX Ativado</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">Cartões Ativados</span>
                </div>
              </div>

              {config.publicKey && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Public Key:</div>
                  <div className="font-mono text-sm">{config.publicKey}</div>
                </div>
              )}

              <Button
                variant="outline"
                onClick={handleRemoveConfig}
                disabled={loading}
                className="w-full mt-4 text-red-600 border-red-200 hover:bg-red-50"
              >
                Remover Configuração
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 mb-2">Mercado Pago não configurado</h3>
              <p className="text-sm text-gray-600 mb-4">
                Configure suas credenciais para aceitar pagamentos PIX e cartão
              </p>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                Configuração Pendente
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {config.configured ? 'Atualizar Credenciais' : 'Configurar Mercado Pago'}
          </CardTitle>
          <CardDescription>
            Adicione suas credenciais de produção do Mercado Pago
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token *</Label>
              <div className="relative">
                <Input
                  id="accessToken"
                  type={showTokens ? 'text' : 'password'}
                  placeholder="TEST-... ou APP_USR-..."
                  value={formData.accessToken}
                  onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2"
                  onClick={() => setShowTokens(!showTokens)}
                >
                  {showTokens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="publicKey">Public Key *</Label>
              <Input
                id="publicKey"
                type={showTokens ? 'text' : 'password'}
                placeholder="TEST-... ou APP_USR-..."
                value={formData.publicKey}
                onChange={(e) => setFormData({ ...formData, publicKey: e.target.value })}
              />
            </div>

            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                <strong>Para Testes:</strong> Use credenciais que começam com <strong>TEST-</strong><br/>
                <strong>Para Produção:</strong> Use credenciais que começam com <strong>APP_USR-</strong>
              </AlertDescription>
            </Alert>

            <Button
              type="submit"
              disabled={loading || !formData.accessToken || !formData.publicKey}
              className="w-full"
            >
              {loading ? 'Validando...' : config.configured ? 'Atualizar Configuração' : 'Configurar Mercado Pago'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Como obter suas credenciais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-600">1</span>
                </div>
                <div>
                  <p className="font-medium">Acesse sua conta do Mercado Pago</p>
                  <p className="text-sm text-gray-600">Entre em sua conta de desenvolvedor</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-600">2</span>
                </div>
                <div>
                  <p className="font-medium">Vá para &ldquo;Suas integrações&rdquo;</p>
                  <p className="text-sm text-gray-600">Crie uma aplicação se não tiver uma</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-600">3</span>
                </div>
                <div>
                  <p className="font-medium">Copie as credenciais</p>
                  <p className="text-sm text-gray-600">
                    <strong>Teste:</strong> Credenciais que começam com &ldquo;TEST-&rdquo;<br/>
                    <strong>Produção:</strong> Credenciais que começam com &ldquo;APP_USR-&rdquo;
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">💡 Dica para Testes</h4>
              <p className="text-sm text-yellow-700">
                Para testar o sistema sem custos reais, use as <strong>credenciais de teste</strong> disponíveis 
                no painel do desenvolvedor. Os pagamentos PIX em teste expiram em alguns minutos.
              </p>
            </div>

            <Separator />

            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => window.open('https://www.mercadopago.com.br/developers/panel', '_blank')}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir Painel do Desenvolvedor
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message Display */}
      {message.content && (
        <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          {message.type === 'success' ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600" />
          )}
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.content}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
