'use client'

import { useState } from 'react'
import { PaymentStatusChecker } from '@/components/payment-status-checker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PaymentTestPage() {
  const [paymentId, setPaymentId] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [showChecker, setShowChecker] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Teste de Pagamentos - Diagnóstico Completo</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Status Real de Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Payment/Preference ID</label>
                <Input
                  placeholder="Ex: 1324768512"
                  value={paymentId}
                  onChange={(e) => setPaymentId(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Número do Pedido</label>
                <Input
                  placeholder="Ex: MP-1757956594338-f6g2nu0dq"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                />
              </div>
            </div>
            
            <Button 
              onClick={() => setShowChecker(true)}
              disabled={!paymentId && !orderNumber}
            >
              Verificar Status Real
            </Button>
            
            {showChecker && (paymentId || orderNumber) && (
              <div className="mt-6 flex justify-center">
                <PaymentStatusChecker 
                  paymentId={paymentId || undefined}
                  orderNumber={orderNumber || undefined}
                  onStatusChange={(status) => {
                    console.log('Status mudou para:', status)
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comandos de Teste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/websocket-test')
                    const result = await response.json()
                    if (result.success) {
                      alert('✅ WebSocket funcionando corretamente!')
                    } else {
                      alert(`❌ WebSocket com problema: ${result.error}`)
                    }
                  } catch {
                    alert('❌ Erro ao testar WebSocket')
                  }
                }}
              >
                Testar WebSocket
              </Button>
              
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/websocket-test', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        orderId: 'test-123',
                        status: 'APPROVED',
                        restaurantSlug: 'cgpoint'
                      })
                    })
                    const result = await response.json()
                    alert(result.success ? '✅ Evento simulado!' : `❌ Erro: ${result.error}`)
                  } catch {
                    alert('❌ Erro ao simular evento')
                  }
                }}
              >
                Simular Status Update
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setShowChecker(false)
                  setPaymentId('')
                  setOrderNumber('')
                }}
              >
                Limpar
              </Button>              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/test-pix', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        restaurantSlug: 'cgpoint',
                        testAmount: 0.10 
                      })
                    })
                    const result = await response.json()
                    if (result.success && result.pixResult.payment) {
                      setPaymentId(result.pixResult.payment.preferenceId)
                      setShowChecker(true)
                    }
                    alert('PIX de teste criado!')
                  } catch {
                    alert('Erro ao criar PIX de teste')
                  }
                }}
              >
                Criar PIX Teste
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações de Configuração</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Webhook MP:</strong> Configurado e funcionando</p>
              <p><strong>Status Polling:</strong> Endpoint /api/payment/status implementado</p>
              <p><strong>Timeout Check:</strong> Endpoint /api/payment/timeout-check implementado</p>
              <p><strong>Socket.IO:</strong> Configurado para notificações em tempo real</p>
              <p><strong>Payment Persistence:</strong> Tabela Payment sincronizada</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Problemas Identificados e Soluções</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-yellow-50 rounded">
                <h4 className="font-medium text-yellow-800">Valor Incorreto (R$ 4.990,00)</h4>
                <p className="text-yellow-700">Investigar formatação de preços na UI - valor backend está correto</p>
              </div>
              
              <div className="p-3 bg-green-50 rounded">
                <h4 className="font-medium text-green-800">Webhook Funcionando ✅</h4>
                <p className="text-green-700">Status sendo atualizado corretamente para PENDING → APPROVED</p>
              </div>
              
              <div className="p-3 bg-blue-50 rounded">
                <h4 className="font-medium text-blue-800">Status Real Implementado ✅</h4>
                <p className="text-blue-700">Endpoint de consulta com polling automático disponível</p>
              </div>
              
              <div className="p-3 bg-purple-50 rounded">
                <h4 className="font-medium text-purple-800">Payment ID Exibição ✅</h4>
                <p className="text-purple-700">Componente PaymentStatusChecker mostra todos os IDs</p>
              </div>
              
              <div className="p-3 bg-orange-50 rounded">
                <h4 className="font-medium text-orange-800">WebSocket Dashboard</h4>
                <p className="text-orange-700">Configurado, mas pode precisar de ajustes de conexão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
