'use client'

import { useEffect, useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { notify } from '@/lib/notifications/notify'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, RefreshCw, ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function PaymentPendingContent() {
  const [isChecking, setIsChecking] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null)
  const searchParams = useSearchParams()
  const paymentId = searchParams?.get('payment_id')
  const status = searchParams?.get('status')

  useEffect(() => {
    console.log('Payment pending - ID:', paymentId, 'Status:', status)
    
    // Exibir notificação informativa
    notify('info', 'Pagamento em processamento', {
      description: 'Estamos verificando seu pagamento. Aguarde a confirmação.',
      duration: 5000,
    })
  }, [paymentId, status])

  const checkPaymentStatus = async () => {
    setIsChecking(true)
    
  const checkingToast = notify('loading', 'Verificando status do pagamento...')
    
    try {
      // Simular verificação do status
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Aqui você implementaria a verificação real do status
      // Por enquanto, vamos simular um resultado aleatório
      const randomStatus = Math.random()
      if (randomStatus > 0.7) {
        setPaymentStatus('approved')
        notify('success', 'Pagamento aprovado!', { 
          id: checkingToast as string,
          description: 'Seu pagamento foi confirmado com sucesso.' 
        })
      } else if (randomStatus < 0.3) {
        setPaymentStatus('rejected')
        notify('error', 'Pagamento recusado', { 
          id: checkingToast as string,
          description: 'Infelizmente seu pagamento foi recusado.' 
        })
      } else {
        setPaymentStatus('pending')
        notify('info', 'Ainda processando', { 
          id: checkingToast as string,
          description: 'Seu pagamento ainda está sendo processado. Tente novamente em alguns minutos.' 
        })
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error)
      notify('error', 'Erro ao verificar status', { 
        id: checkingToast as string,
        description: 'Não foi possível verificar o status do pagamento. Tente novamente.' 
      })
    } finally {
      setIsChecking(false)
    }
  }

  if (paymentStatus === 'approved') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg text-center"
        >
          <Card className="shadow-2xl border-0">
            <CardContent className="pt-8">
              <CheckCircle className="h-24 w-24 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Pagamento Aprovado!
              </h2>
              <p className="text-slate-600 mb-6">
                Seu pagamento foi confirmado com sucesso.
              </p>
              <Link href="/dashboard">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  Ir para Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  if (paymentStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg text-center"
        >
          <Card className="shadow-2xl border-0">
            <CardContent className="pt-8">
              <XCircle className="h-24 w-24 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Pagamento Recusado
              </h2>
              <p className="text-slate-600 mb-6">
                Infelizmente seu pagamento foi recusado.
              </p>
              <Link href="/checkout/subscription">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                  Tentar Novamente
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center p-4">
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
              <Clock className="h-24 w-24 text-yellow-500" />
            </motion.div>
            
            <CardTitle className="text-3xl font-bold text-slate-800 mb-2">
              Pagamento Pendente
            </CardTitle>
            
            <p className="text-slate-600 text-lg">
              Estamos processando seu pagamento
            </p>
          </CardHeader>
          
          <CardContent className="text-center space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-700 text-sm">
                Seu pagamento está sendo processado. Isso pode levar alguns minutos. 
                Você receberá uma confirmação por email assim que for aprovado.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-800">O que acontece agora?</h4>
              <ul className="text-sm text-slate-600 space-y-2 text-left">
                <li>• Aguarde a confirmação do pagamento</li>
                <li>• Você receberá um email de confirmação</li>
                <li>• Pode levar até 24 horas em alguns casos</li>
                <li>• Não tente pagar novamente</li>
              </ul>
            </div>
            
            <div className="space-y-3 pt-6">
              <Button 
                onClick={checkPaymentStatus}
                disabled={isChecking}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Verificar Status
                  </>
                )}
              </Button>
              
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
                <a href="https://wa.me/5511999999999" className="text-yellow-600 hover:text-yellow-700 ml-1">
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

export default function PaymentPending() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <PaymentPendingContent />
    </Suspense>
  )
}
