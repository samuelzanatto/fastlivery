'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'

function FailureContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [orderNumber, setOrderNumber] = useState<string | null>(null)

  useEffect(() => {
    const order = searchParams?.get('order')
    setOrderNumber(order)
  }, [searchParams])

  const handleTryAgain = () => {
    if (orderNumber) {
      // Redirecionar para nova tentativa de pagamento
      router.push(`/checkout?retry=${orderNumber}`)
    } else {
      router.push('/checkout')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Pagamento Não Aprovado
          </h1>
          
          <p className="text-gray-600 mb-6">
            Houve um problema com o processamento do seu pagamento. 
            Isso pode acontecer por diversos motivos.
          </p>

          {orderNumber && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-600 mb-1">Número do Pedido:</p>
              <p className="font-mono text-gray-900">{orderNumber}</p>
            </div>
          )}

          <div className="bg-red-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-red-800 mb-2">Possíveis causas:</h3>
            <ul className="text-sm text-red-700 text-left space-y-1">
              <li>• Dados do cartão incorretos</li>
              <li>• Limite de crédito insuficiente</li>
              <li>• Problema na operadora</li>
              <li>• PIX expirado ou cancelado</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button 
              className="w-full bg-orange-500 hover:bg-orange-600"
              onClick={handleTryAgain}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Cardápio
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Se o problema persistir, entre em contato conosco
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CheckoutFailurePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Carregando...</div>}>
      <FailureContent />
    </Suspense>
  )
}
