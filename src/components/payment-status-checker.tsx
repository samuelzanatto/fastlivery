'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'

interface PaymentStatusProps {
  paymentId?: string
  orderNumber?: string
  onStatusChange?: (status: string) => void
}

interface PaymentStatusResponse {
  success: boolean
  order: {
    id: string
    orderNumber: string
    status: string
    paymentStatus: string
    total: number
    createdAt: string
  }
  mercadoPago: {
    paymentId: string | null
    status: string | null
    statusDetail: string | null
    internalStatus: string
  }
  payments: Array<{
    id: string
    preferenceId: string
    status: string
    amount: number
    type: string
  }>
}

const statusConfig = {
  PENDING: { 
    color: 'bg-yellow-500', 
    icon: Clock, 
    label: 'Pendente',
    description: 'Aguardando pagamento'
  },
  APPROVED: { 
    color: 'bg-green-500', 
    icon: CheckCircle, 
    label: 'Aprovado',
    description: 'Pagamento confirmado'
  },
  REJECTED: { 
    color: 'bg-red-500', 
    icon: XCircle, 
    label: 'Rejeitado',
    description: 'Pagamento negado'
  },
  CANCELLED: { 
    color: 'bg-gray-500', 
    icon: AlertCircle, 
    label: 'Cancelado',
    description: 'Pagamento cancelado'
  }
}

export function PaymentStatusChecker({ paymentId, orderNumber, onStatusChange }: PaymentStatusProps) {
  const [status, setStatus] = useState<PaymentStatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoPolling, setAutoPolling] = useState(false)

  const checkStatus = useCallback(async () => {
    if (!paymentId && !orderNumber) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (paymentId) params.set('paymentId', paymentId)
      if (orderNumber) params.set('orderNumber', orderNumber)
      
      const response = await fetch(`/api/payment/status?${params.toString()}`)
      const data: PaymentStatusResponse = await response.json()
      
      if (data.success) {
        setStatus(data)
        onStatusChange?.(data.mercadoPago.internalStatus)
      }
    } catch (error) {
      console.error('Erro ao consultar status:', error)
    } finally {
      setLoading(false)
    }
  }, [paymentId, orderNumber, onStatusChange])

  useEffect(() => {
    if (autoPolling) {
      const interval = setInterval(checkStatus, 5000) // Poll a cada 5 segundos
      return () => clearInterval(interval)
    }
  }, [autoPolling, checkStatus])

  useEffect(() => {
    // Consulta inicial
    checkStatus()
  }, [checkStatus])

  if (!status) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500">Carregando status...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentStatus = statusConfig[status.mercadoPago.internalStatus as keyof typeof statusConfig] || statusConfig.PENDING
  const StatusIcon = currentStatus.icon

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <StatusIcon className="h-5 w-5" />
          Status do Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <Badge className={`${currentStatus.color} text-white px-3 py-1 text-sm mb-2`}>
            {currentStatus.label}
          </Badge>
          <p className="text-sm text-gray-600">{currentStatus.description}</p>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="font-medium">Pedido:</span>
            <span>#{status.order.orderNumber}</span>
          </div>
          
          {status.mercadoPago.paymentId && (
            <div className="flex justify-between">
              <span className="font-medium">Payment ID:</span>
              <span className="font-mono text-xs">{status.mercadoPago.paymentId}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="font-medium">Valor:</span>
            <span>R$ {status.order.total.toFixed(2)}</span>
          </div>
          
          {status.mercadoPago.statusDetail && (
            <div className="flex justify-between">
              <span className="font-medium">Detalhe MP:</span>
              <span className="text-xs">{status.mercadoPago.statusDetail}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkStatus}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Verificando...
              </>
            ) : (
              'Verificar Status'
            )}
          </Button>
          
          <Button
            variant={autoPolling ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoPolling(!autoPolling)}
            className="flex-1"
          >
            {autoPolling ? 'Parar Auto-Check' : 'Auto-Check'}
          </Button>
        </div>

        {status.payments.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500 mb-2">Registros de Payment:</p>
            {status.payments.map((payment) => (
              <div key={payment.id} className="text-xs space-y-1 p-2 bg-gray-50 rounded mb-2">
                <div className="flex justify-between">
                  <span>ID:</span>
                  <span className="font-mono">{payment.preferenceId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge variant="outline" className="text-xs">
                    {payment.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Tipo:</span>
                  <span>{payment.type}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
