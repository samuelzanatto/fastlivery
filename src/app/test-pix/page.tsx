'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface Restaurant {
  id: string
  name: string
  slug: string
  mercadoPagoConfigured: boolean
  isActive: boolean
}

interface TestPixResult {
  success: boolean
  restaurantName?: string
  pixResult?: {
    id: string
    status: string
    qr_code_preview: string
    qr_code_length: number
    has_base64: boolean
    total_amount: number
    payment?: {
      id: string
      preferenceId: string
      status: string
    } | null
  }
  validation?: {
    hasQrCode: boolean
    isValidLength: boolean
    startsCorrectly: boolean
    hasPixKey: boolean
    hasBRCountryCode: boolean
    hasValue: boolean
  }
  error?: string
}

export default function TestPixPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TestPixResult | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState('')
  const [testAmount, setTestAmount] = useState('0.10')
  const [simulateLoading, setSimulateLoading] = useState(false)
  const [simulated, setSimulated] = useState(false)

  useEffect(() => {
    fetchRestaurants()
  }, [])

  const fetchRestaurants = async () => {
    try {
      const response = await fetch('/api/restaurants/list')
      const data = await response.json()
      setRestaurants(data.restaurants || [])
      
      // Selecionar o primeiro restaurante com MP configurado
      const configured = data.restaurants?.find((r: Restaurant) => 
        r.mercadoPagoConfigured && r.isActive
      )
      if (configured) {
        setSelectedRestaurant(configured.slug)
      }
    } catch (error) {
      console.error('Erro ao buscar restaurantes:', error)
    }
  }

  const testPix = async () => {
    if (!selectedRestaurant) {
      alert('Selecione um restaurante')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/test-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          restaurantSlug: selectedRestaurant,
          testAmount: parseFloat(testAmount) || undefined
        })
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Erro no teste:', error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Teste PIX - Diagnóstico QR Code</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 items-end mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restaurante
              </label>
              <select
                value={selectedRestaurant}
                onChange={(e) => setSelectedRestaurant(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um restaurante</option>
                {restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.slug}>
                    {restaurant.name} ({restaurant.slug}) 
                    {restaurant.mercadoPagoConfigured ? ' ✅' : ' ❌'} 
                    {restaurant.isActive ? '' : ' (Inativo)'}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-40">
              <label className="block text-sm font-medium text-gray-700 mb-2">Valor Teste (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button 
              onClick={testPix}
              disabled={loading || !selectedRestaurant}
              className="px-6"
            >
              {loading ? 'Testando...' : 'Testar PIX'}
            </Button>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            O QR Code em ambiente de teste não valida em bancos reais. Use este fluxo apenas para validar geração, formato e simulação de pagamento. O valor informado acima (padrão R$ 0,10) é usado apenas quando em modo TEST.
          </p>
          <div className="mt-3 text-xs p-3 rounded bg-amber-50 text-amber-700 border border-amber-200">
            Webhook: Se você definir MERCADOPAGO_WEBHOOK_URL ou NGROK_URL, o Mercado Pago enviará atualizações automáticas e o pedido será atualizado sem precisar usar o botão de simulação (somente quando o pagamento for realmente efetuado em produção).
          </div>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            {result.success ? (
              <>
                <h2 className="text-xl font-semibold text-green-600 mb-4">✅ PIX Criado com Sucesso</h2>
                
                {result.restaurantName && (
                  <div className="mb-4 p-3 bg-blue-50 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Restaurante:</strong> {result.restaurantName}
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Informações do Pagamento:</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>ID:</strong> {result.pixResult?.id}</p>
                      <p><strong>Status:</strong> {result.pixResult?.status}</p>
                      {result.pixResult?.payment && (
                        <>
                          <p><strong>Payment ID Interno:</strong> {result.pixResult.payment.id}</p>
                          <p><strong>Preference/Payment Ref:</strong> {result.pixResult.payment.preferenceId}</p>
                          <p><strong>Status Interno:</strong> {result.pixResult.payment.status}</p>
                        </>
                      )}
                      <p><strong>Valor:</strong> R$ {result.pixResult?.total_amount?.toFixed(2)}</p>
                      <p><strong>Tamanho QR:</strong> {result.pixResult?.qr_code_length} caracteres</p>
                      <p><strong>Tem Base64:</strong> {result.pixResult?.has_base64 ? '✅' : '❌'}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Validação do QR Code:</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Tem QR Code:</strong> {result.validation?.hasQrCode ? '✅' : '❌'}</p>
                      <p><strong>Tamanho Válido:</strong> {result.validation?.isValidLength ? '✅' : '❌'}</p>
                      <p><strong>Formato Correto:</strong> {result.validation?.startsCorrectly ? '✅' : '❌'}</p>
                      <p><strong>Chave PIX:</strong> {result.validation?.hasPixKey ? '✅' : '❌'}</p>
                      <p><strong>País BR:</strong> {result.validation?.hasBRCountryCode ? '✅' : '❌'}</p>
                      <p><strong>Tem Valor:</strong> {result.validation?.hasValue ? '✅' : '❌'}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Preview do QR Code:</h3>
                  <div className="bg-gray-100 p-4 rounded text-xs font-mono break-all">
                    {result.pixResult?.qr_code_preview}
                  </div>
                </div>

                {!simulated && (
                  <div className="mt-8">
                    <h3 className="font-semibold mb-3">Simular Pagamento:</h3>
                    <p className="text-sm text-gray-600 mb-3">Após gerar o PIX, você pode simular a confirmação do pagamento para avançar o status do pedido sem realizar transação real.</p>
                    <Button
                      variant="secondary"
                      disabled={simulateLoading}
                      onClick={async () => {
                        if (!result.pixResult?.id || !result.restaurantName) return
                        setSimulateLoading(true)
                        try {
                          // Buscar pedido pelo order_number retornado
                          // O endpoint /api/test-pix retorna order_number na raiz (ajustar se alterar contrato)
                          const rootAny = result as unknown as { order_number?: string, pixResult?: { external_reference?: string } }
                          const finalOrderNumber = rootAny.order_number || rootAny.pixResult?.external_reference
                          if (!finalOrderNumber) {
                            alert('Não foi possível identificar o orderNumber para simulação.')
                            return
                          }
                          const r = await fetch('/api/pix/simulate-paid', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ orderNumber: finalOrderNumber })
                          })
                          const d = await r.json()
                          if (!d.success) {
                            alert('Falha na simulação: ' + (d.error || 'Erro desconhecido'))
                          } else {
                            setSimulated(true)
                            alert('Pagamento simulado com sucesso! Pedido agora está CONFIRMED / APPROVED.')
                          }
                        } catch (e) {
                          console.error(e)
                          alert('Erro ao simular pagamento')
                        } finally {
                          setSimulateLoading(false)
                        }
                      }}
                    >
                      {simulateLoading ? 'Simulando...' : 'Simular Pagamento Aprovado'}
                    </Button>
                  </div>
                )}

                {simulated && (
                  <div className="mt-6 p-4 rounded bg-green-50 text-green-700 text-sm">
                    Pagamento simulado: pedido marcado como pago (APPROVED / CONFIRMED).
                  </div>
                )}

                <div className="mt-6 p-4 rounded-lg bg-blue-50">
                  <h4 className="font-semibold text-blue-800 mb-2">Análise:</h4>
                  {result.validation?.hasQrCode ? (
                    result.validation.startsCorrectly && result.validation.hasPixKey && result.validation.hasBRCountryCode ? (
                      <p className="text-green-700">✅ QR Code parece estar formatado corretamente segundo o padrão PIX EMVCo.</p>
                    ) : (
                      <p className="text-red-700">❌ QR Code tem problemas de formatação. Pode ser por isso que os bancos estão rejeitando.</p>
                    )
                  ) : (
                    <p className="text-red-700">❌ QR Code não foi gerado. Problema na API do Mercado Pago.</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-red-600 mb-4">❌ Erro no Teste</h2>
                <div className="bg-red-50 p-4 rounded text-red-700">
                  <p className="font-mono">{result.error}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
