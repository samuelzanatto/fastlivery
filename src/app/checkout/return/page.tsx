'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, ArrowLeft } from 'lucide-react'

export default function CheckoutReturnPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-gray-900 flex items-center justify-center gap-2">
            <X className="w-6 h-6 text-gray-500" />
            Checkout Cancelado
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-gray-600">
            Seu checkout foi cancelado. Não se preocupe, seus itens ainda estão no carrinho.
          </p>
          
          <div className="space-y-3">
            <Button 
              className="w-full bg-orange-500 hover:bg-orange-600"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar às compras
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                // Reabrir o carrinho se possível
                const event = new CustomEvent('openCart')
                window.dispatchEvent(event)
                router.push('/')
              }}
            >
              Finalizar pedido
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
