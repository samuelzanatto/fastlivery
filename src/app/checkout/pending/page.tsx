'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, RefreshCw, ArrowLeft } from 'lucide-react'

function CheckoutPendingPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(300) // 5 minutos em segundos

  useEffect(() => {
    const order = searchParams?.get('order')
    setOrderNumber(order)

    // Timer de 5 minutos
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [searchParams])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const checkPaymentStatus = async () => {
    if (!orderNumber) return

    try {
      const response = await fetch(`/api/orders/by-number/${orderNumber}`)
      if (response.ok) {
        const order = await response.json()
        if (order.paymentStatus === 'APPROVED') {
          router.push(`/checkout/success?order=${orderNumber}&status=approved`)
        } else if (order.paymentStatus === 'REJECTED') {
          router.push(`/checkout/failure?order=${orderNumber}`)
        }
        // Se ainda estiver pendente, não fazer nada
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-yellow-600 animate-pulse" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Pagamento Pendente
          </h1>
          
          <p className="text-gray-600 mb-6">
            Seu pagamento está sendo processado. Aguarde a confirmação.
          </p>

          {orderNumber && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-600 mb-1">Número do Pedido:</p>
              <p className="font-mono text-gray-900">{orderNumber}</p>
            </div>
          )}

          <div className="bg-yellow-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-yellow-600 mr-2" />
              <span className="font-medium text-yellow-800">
                Tempo restante: {formatTime(timeRemaining)}
              </span>
            </div>
            <div className="text-sm text-yellow-700 text-left space-y-1">
              <p><strong>PIX:</strong> A confirmação acontece em até 5 minutos</p>
              <p><strong>Cartão:</strong> Aguardando aprovação da operadora</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              className="w-full bg-yellow-500 hover:bg-yellow-600"
              onClick={checkPaymentStatus}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Verificar Status
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/pedidos')}
            >
              Ver Meus Pedidos
            </Button>

            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Cardápio
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Você será notificado quando o pagamento for confirmado
            </p>
          </div>

            {timeRemaining === 0 && (
              <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-600">
                  Tempo esgotado. Verifique o status ou entre em contato conosco.
                </p>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function CheckoutPendingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Carregando…</div>}>
      <CheckoutPendingPageContent />
    </Suspense>
  )
}
