'use client'

import { useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { XCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function PaymentFailureContent() {
  const searchParams = useSearchParams()
  const paymentId = searchParams?.get('payment_id')
  const status = searchParams?.get('status')

  useEffect(() => {
    console.log('Payment failed - ID:', paymentId, 'Status:', status)
    
    // Exibir toast de erro
    toast.error('Pagamento recusado', {
      description: 'Não foi possível processar seu pagamento. Verifique os dados do cartão e tente novamente.',
      duration: 6000,
    })
  }, [paymentId, status])

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="flex justify-center mb-6"
            >
              <XCircle className="h-24 w-24 text-red-500" />
            </motion.div>
            
            <CardTitle className="text-3xl font-bold text-slate-800 mb-2">
              Pagamento Recusado
            </CardTitle>
            
            <p className="text-slate-600 text-lg">
              Não foi possível processar seu pagamento
            </p>
          </CardHeader>
          
          <CardContent className="text-center space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">
                O pagamento foi recusado pelo banco ou operadora do cartão. 
                Verifique os dados do cartão ou tente outro método de pagamento.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-800">O que fazer agora?</h4>
              <ul className="text-sm text-slate-600 space-y-2 text-left">
                <li>• Verifique se os dados do cartão estão corretos</li>
                <li>• Confirme se há limite disponível</li>
                <li>• Tente outro cartão ou método de pagamento</li>
                <li>• Entre em contato com seu banco se necessário</li>
              </ul>
            </div>
            
            <div className="space-y-3 pt-6">
              <Link href="/checkout/subscription">
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tentar Novamente
                </Button>
              </Link>
              
              <Link href="/auth/restaurant">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao Início
                </Button>
              </Link>
            </div>
            
            <div className="pt-4">
              <p className="text-xs text-slate-500 mb-2">
                Precisa de ajuda?
              </p>
              <p className="text-sm text-slate-600">
                Entre em contato conosco pelo WhatsApp: 
                <a href="https://wa.me/5511999999999" className="text-orange-600 hover:text-orange-700 ml-1">
                  (11) 99999-9999
                </a>
              </p>
            </div>
            
            {paymentId && (
              <div className="text-xs text-slate-500 pt-4 border-t">
                ID do Pagamento: {paymentId}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default function PaymentFailure() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <PaymentFailureContent />
    </Suspense>
  )
}
