'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Zap, 
  Check, 
  CreditCard, 
  Shield, 
  ArrowLeft,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

export default function SubscriptionCheckout() {
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const features = [
    "App PWA para clientes",
    "Dashboard completo",
    "Pedidos em tempo real",
    "Pagamentos via Stripe",
    "QR Code para mesas",
    "Relatórios detalhados", 
    "Suporte técnico",
    "Atualizações gratuitas"
  ]

  const handlePayment = async () => {
    setIsLoading(true)
    setIsProcessing(true)

    try {
      // Obter businessId do localStorage ou context
      const businessData = localStorage.getItem('businessSetup')
      if (!businessData) {
        alert('Dados do negócio não encontrados. Faça o setup primeiro.')
        return
      }

      const { businessId } = JSON.parse(businessData)

      // Criar preferência de pagamento
      const response = await fetch('/api/payment/preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          type: 'subscription',
          businessId,
          metadata: {
            plan: 'complete',
            period: 'monthly'
          }
        })
      })

      const data = await response.json()

      if (data.success) {
        // Redirecionar para o Stripe
        window.location.href = data.sandboxInitPoint || data.initPoint
      } else {
        throw new Error(data.error || 'Erro ao processar pagamento')
      }

    } catch (error) {
      console.error('Erro ao processar pagamento:', error)
      alert('Erro ao processar pagamento. Tente novamente.')
    } finally {
      setIsLoading(false)
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Link href="/auth/restaurant" className="inline-flex items-center gap-2 mb-6 text-slate-600 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="h-8 w-8 text-orange-500" />
            <span className="text-2xl font-bold text-slate-800">FastLivery</span>
          </div>
          
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Finalize sua assinatura
          </h1>
          <p className="text-slate-600">
            Apenas mais um passo para revolucionar sua empresa
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Resumo do Plano */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="h-fit">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Plano Completo</CardTitle>
                  <Badge className="bg-orange-100 text-orange-800">
                    Mais Popular
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-orange-500 mb-2">
                    R$ 97
                    <span className="text-lg text-slate-600 font-normal">/mês</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Primeiros 7 dias grátis • Cancele quando quiser
                  </p>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-800">
                    Incluído no plano:
                  </h4>
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">
                      Garantia de 30 dias
                    </span>
                  </div>
                  <p className="text-sm text-green-700">
                    Se não ficar satisfeito, devolvemos seu dinheiro sem perguntas.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pagamento */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Informações de pagamento
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {isProcessing ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Processando pagamento...
                    </h3>
                    <p className="text-slate-600">
                      Aguarde enquanto confirmamos sua transação
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-6 w-6 text-blue-600" />
                        <span className="font-medium text-blue-800">
                          Pagamento via Stripe
                        </span>
                      </div>
                      <p className="text-sm text-blue-700">
                        Pagamento 100% seguro. Aceita cartão de crédito, débito e PIX.
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Resumo da cobrança:</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Plano Completo (mensal)</span>
                            <span>R$ 97,00</span>
                          </div>
                          <div className="flex justify-between text-green-600">
                            <span>Desconto (7 dias grátis)</span>
                            <span>-R$ 22,61</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-semibold">
                            <span>Total a pagar hoje</span>
                            <span>R$ 0,00</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-2">
                            Próxima cobrança: R$ 97,00 em {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        onClick={handlePayment}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-lg py-6"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Processando...
                          </>
                        ) : (
                          'Confirmar e Pagar'
                        )}
                      </Button>
                      
                      <div className="text-center space-y-2">
                        <p className="text-xs text-slate-600">
                          Ao confirmar, você concorda com nossos{' '}
                          <Link href="/terms" className="text-orange-600 hover:text-orange-700">
                            Termos de Uso
                          </Link>
                        </p>
                        
                        <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            SSL Seguro
                          </span>
                          <span>•</span>
                          <span>PCI Compliant</span>
                          <span>•</span>
                          <span>256-bit</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            
            {!isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-6 text-center"
              >
                <h3 className="font-semibold text-slate-800 mb-2">
                  🚀 O que acontece depois?
                </h3>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>1. Confirme o pagamento</p>
                  <p>2. Configure sua empresa</p>
                  <p>3. Adicione produtos e categorias</p>
                  <p>4. Comece a receber pedidos!</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
