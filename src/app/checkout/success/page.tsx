"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, ArrowRight, Loader2, Clock, AlertCircle } from 'lucide-react'

interface OrderDetails {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string | null
  total: number
  paymentStatus: string
  status: string
  paymentMethod: string | null
  items: Array<{
    quantity: number
    price: number
    product?: { name: string } | null
  }>
  subtotal: number
  deliveryFee: number
  createdAt: string | Date
}

function CheckoutSuccessPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Parâmetros do Checkout Pro
  const orderNumber = searchParams?.get('order')
  const paymentStatus = searchParams?.get('status')
  const preferenceId = searchParams?.get('preference_id')
  const paymentId = searchParams?.get('payment_id')
  const merchantOrderId = searchParams?.get('merchant_order')

  useEffect(() => {
    if (!orderNumber) {
      setError('Número do pedido não encontrado')
      setIsLoading(false)
      return
    }

    // Buscar detalhes do pedido
    fetchOrderDetails(orderNumber)
  }, [orderNumber])

  const fetchOrderDetails = async (orderNum: string) => {
    try {
      const { getOrderByNumber } = await import('@/actions/orders/orders')
      const result = await getOrderByNumber(orderNum)
      
      if (!result.success) {
        throw new Error(result.error || 'Pedido não encontrado')
      }
      
      setOrderDetails(result.data)
    } catch (err) {
      console.error('Erro ao buscar pedido:', err)
      setError('Não foi possível carregar os detalhes do pedido')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-500" />
            <p className="text-gray-600">Verificando status do pedido...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Erro
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{error}</p>
            <div className="space-y-2">
              <Button onClick={() => router.push('/')} className="w-full">
                Voltar ao início
              </Button>
              {orderNumber && (
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Tentar novamente
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!orderDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Pedido não encontrado</p>
            <Button onClick={() => router.push('/')} className="mt-4">
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Determinar status baseado no pedido e parâmetros da URL
  const isPaymentApproved = orderDetails.paymentStatus === 'APPROVED' || paymentStatus === 'approved'
  const isPaymentPending = orderDetails.paymentStatus === 'PENDING' || paymentStatus === 'pending'
  const isPaymentRejected = orderDetails.paymentStatus === 'REJECTED' || paymentStatus === 'failure'

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardContent className="p-8">
            {/* Status Header */}
            <div className="text-center mb-8">
              {isPaymentApproved && (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Pagamento Aprovado!
                  </h1>
                  <p className="text-lg text-gray-600">
                    Seu pedido foi confirmado e está sendo preparado
                  </p>
                </>
              )}

              {isPaymentPending && (
                <>
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Pagamento Pendente
                  </h1>
                  <p className="text-lg text-gray-600">
                    Aguardando confirmação do pagamento
                  </p>
                </>
              )}

              {isPaymentRejected && (
                <>
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Pagamento Não Aprovado
                  </h1>
                  <p className="text-lg text-gray-600">
                    Houve um problema com o pagamento
                  </p>
                </>
              )}
            </div>

            {/* Detalhes do Pedido */}
            <div className="border-t border-gray-200 pt-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Número do Pedido</p>
                  <p className="font-semibold">{orderDetails.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="font-semibold">R$ {orderDetails.total.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status do Pagamento</p>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    isPaymentApproved ? 'bg-green-100 text-green-800' :
                    isPaymentPending ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {orderDetails.paymentStatus === 'APPROVED' ? 'Aprovado' :
                     orderDetails.paymentStatus === 'PENDING' ? 'Pendente' : 'Rejeitado'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Método de Pagamento</p>
                  <p className="font-semibold">
                    {orderDetails.paymentMethod === 'PIX' ? 'PIX' : 'Cartão'}
                  </p>
                </div>
              </div>

              {/* Dados do Cliente */}
              <div className="border-t border-gray-200 pt-4 mb-6">
                <h3 className="font-semibold mb-2">Dados do Cliente</h3>
                <p className="text-gray-600">{orderDetails.customerName}</p>
                <p className="text-gray-600">{orderDetails.customerEmail}</p>
              </div>

              {/* Itens do Pedido */}
              {orderDetails.items && orderDetails.items.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="font-semibold mb-3">Itens do Pedido</h3>
                  <div className="space-y-2">
                    {orderDetails.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{item.product?.name || 'Item'}</p>
                          <p className="text-sm text-gray-600">
                            {item.quantity} x R$ {item.price.toFixed(2)}
                          </p>
                        </div>
                        <p className="font-semibold">
                          R$ {(item.quantity * item.price).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>R$ {orderDetails.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxa de Entrega</span>
                      <span>R$ {orderDetails.deliveryFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total</span>
                      <span>R$ {orderDetails.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Informações Adicionais */}
            {isPaymentApproved && (
              <div className="bg-green-50 rounded-lg p-4 mt-6">
                <div className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium text-green-800">Próximos Passos</p>
                    <p className="text-sm text-green-700 mt-1">
                      Você receberá uma confirmação e poderá acompanhar o status do 
                      seu pedido em tempo real.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isPaymentPending && (
              <div className="bg-yellow-50 rounded-lg p-4 mt-6">
                <div className="flex items-start">
                  <Clock className="w-5 h-5 text-yellow-500 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium text-yellow-800">Aguarde a Confirmação</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      {orderDetails.paymentMethod === 'PIX' 
                        ? 'Seu pagamento PIX está sendo processado. A confirmação acontece em alguns minutos.'
                        : 'Aguardando confirmação do pagamento com cartão.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Button
                onClick={() => router.push('/')}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                Fazer Novo Pedido
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              
              <Button
                variant="outline"
                onClick={() => router.push(`/pedidos`)}
                className="flex-1"
              >
                Ver Meus Pedidos
              </Button>

              {isPaymentPending && (
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  Atualizar Status
                </Button>
              )}
            </div>

            {/* Debug Info (desenvolvimento) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-4 bg-gray-100 rounded-lg text-xs">
                <p><strong>Debug Info:</strong></p>
                <p>Order: {orderNumber}</p>
                <p>Payment Status: {paymentStatus}</p>
                <p>Preference ID: {preferenceId}</p>
                <p>Payment ID: {paymentId}</p>
                <p>Merchant Order: {merchantOrderId}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Carregando…</div>}>
      <CheckoutSuccessPageContent />
    </Suspense>
  )
}
