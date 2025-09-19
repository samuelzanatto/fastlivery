'use client'

import { useEffect, useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { CheckCircle, Zap, ArrowRight, Pizza, UtensilsCrossed, ShoppingBag, Truck, Coffee, Cookie } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface PlanInfo {
  name: string
  price: number
  paymentIntentId?: string
}

function PaymentSuccessContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null)
  const searchParams = useSearchParams()
  const paymentId = searchParams?.get('payment_id')
  const status = searchParams?.get('status')
  const sessionId = searchParams?.get('session_id')

  useEffect(() => {
    // Verificar status do pagamento
    const checkPaymentStatus = async () => {
      if (sessionId) {
        try {
          // Buscar informações da sessão do Stripe primeiro
          const sessionResp = await fetch(`/api/checkout/session/${sessionId}`)
          if (sessionResp.ok) {
            const sessionData = await sessionResp.json()
            
            // Extrair informações do plano da sessão
            if (sessionData.line_items?.data?.[0]) {
              const lineItem = sessionData.line_items.data[0]
              const priceData = lineItem.price
              const product = priceData?.product
              const resolvedName = product?.name || priceData?.nickname || 'Plano'
              const unitAmount = (priceData?.unit_amount || 0) / 100
              
              setPlanInfo({
                name: resolvedName,
                price: unitAmount,
                paymentIntentId: sessionData.payment_intent?.id || sessionData.payment_intent
              })
            }
          }

          // Tentar recuperar a senha salva para esta sessão e finalizar o cadastro
          let password: string | null = null
          try {
            if (typeof window !== 'undefined') {
              const key = `signup:pwd:${sessionId}`
              console.log('[PaymentSuccess] Tentando recuperar senha com key:', key)
              
              // Listar todas as keys do sessionStorage para debug
              const allKeys = Object.keys(sessionStorage).filter(k => k.startsWith('signup:pwd:'))
              console.log('[PaymentSuccess] Keys encontradas no sessionStorage:', allKeys)
              
              const storedPassword = sessionStorage.getItem(key)
              console.log('[PaymentSuccess] Valor bruto do sessionStorage:', storedPassword)
              password = storedPassword && storedPassword !== 'undefined' && storedPassword !== 'null' ? storedPassword : null
              console.log('[PaymentSuccess] Senha recuperada do sessionStorage:', !!password)
            }
          } catch (error) {
            console.error('[PaymentSuccess] Erro ao recuperar senha:', error)
          }

          if (!password) {
            console.error('[PaymentSuccess] Senha não encontrada no sessionStorage')
            toast.error('Erro na finalização do cadastro. Tente fazer login.')
            setIsLoading(false)
            return
          }

          console.log('[PaymentSuccess] Chamando finish-signup com:', { sessionId, hasPassword: !!password })
          const resp = await fetch('/api/checkout/public/finish-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, password })
          })
          
          console.log('[PaymentSuccess] Resposta finish-signup:', resp.status, resp.statusText)
          
          if (!resp.ok) {
            const errorData = await resp.text()
            console.error('[PaymentSuccess] Erro finish-signup:', errorData)
            throw new Error('Falha ao finalizar cadastro')
          }
          
          await resp.json()
          
          try {
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem(`signup:pwd:${sessionId}`)
            }
          } catch {}
          
          // Exibir toast de sucesso
          toast.success('Pagamento aprovado com sucesso!', {
            description: 'Sua assinatura foi ativada e seu restaurante está pronto para receber pedidos.',
            duration: 5000,
          })
          
          // Aguardar um pouco para o webhook processar
          setTimeout(() => {
            setIsLoading(false)
          }, 2000)
        } catch (error) {
          console.error('Erro ao verificar pagamento:', error)
          toast.error('Erro ao verificar status do pagamento')
          setIsLoading(false)
        }
      } else if (paymentId) {
        // Suporte ao legado de query params
        setIsLoading(false)
      } else {
        setIsLoading(false)
      }
    }

    checkPaymentStatus()
  }, [sessionId, paymentId, status])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          {/* Logo centralizada com spinner */}
          <div className="relative flex items-center justify-center mb-8">
            {/* Spinner ao redor da logo */}
            <motion.div 
              className="absolute w-20 h-20 border-4 border-gray-200 border-t-orange-500 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            
            {/* Logo ZapLivery apenas o ícone */}
            <div className="flex items-center justify-center">
              <Zap className="h-8 w-8 text-orange-500" />
            </div>
          </div>
          
          <motion.p 
            className="text-gray-600 text-lg font-medium"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Verificando seu pagamento...
          </motion.p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Partículas com diferentes profundidades */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Partículas distantes (mais opacas e pequenas) */}
        {typeof window !== 'undefined' && [...Array(15)].map((_, i) => (
          <motion.div
            key={`far-${i}`}
            className="absolute opacity-10"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              scale: 0.3 + Math.random() * 0.3,
            }}
            animate={{
              y: [null, -50],
              x: [null, Math.random() * 20 - 10],
              rotate: [0, 360],
              opacity: [0.05, 0.15, 0.05]
            }}
            transition={{
              duration: Math.random() * 8 + 12,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeInOut"
            }}
          >
            {i % 3 === 0 ? (
              <Pizza className="w-6 h-6 text-orange-400" />
            ) : i % 3 === 1 ? (
              <Coffee className="w-5 h-5 text-amber-400" />
            ) : (
              <UtensilsCrossed className="w-5 h-5 text-orange-500" />
            )}
          </motion.div>
        ))}

        {/* Partículas médias */}
        {typeof window !== 'undefined' && [...Array(10)].map((_, i) => (
          <motion.div
            key={`mid-${i}`}
            className="absolute opacity-20"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              scale: 0.5 + Math.random() * 0.3,
            }}
            animate={{
              y: [null, -80],
              x: [null, Math.random() * 30 - 15],
              rotate: [0, 180],
              opacity: [0.15, 0.25, 0.15]
            }}
            transition={{
              duration: Math.random() * 6 + 8,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut"
            }}
          >
            {i % 4 === 0 ? (
              <Zap className="w-4 h-4 text-yellow-500" />
            ) : i % 4 === 1 ? (
              <ShoppingBag className="w-4 h-4 text-orange-400" />
            ) : i % 4 === 2 ? (
              <Truck className="w-4 h-4 text-amber-500" />
            ) : (
              <Cookie className="w-4 h-4 text-orange-300" />
            )}
          </motion.div>
        ))}

        {/* Partículas próximas (desfocadas) */}
        {typeof window !== 'undefined' && [...Array(8)].map((_, i) => (
          <motion.div
            key={`near-${i}`}
            className="absolute opacity-30 blur-sm"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              scale: 0.8 + Math.random() * 0.4,
            }}
            animate={{
              y: [null, -120],
              x: [null, Math.random() * 40 - 20],
              rotate: [0, 90],
              opacity: [0.2, 0.4, 0.2],
              scale: [null, null, 0.5]
            }}
            transition={{
              duration: Math.random() * 5 + 6,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeOut"
            }}
          >
            {i % 2 === 0 ? (
              <Pizza className="w-8 h-8 text-orange-400" />
            ) : (
              <Zap className="w-7 h-7 text-yellow-500" />
            )}
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-lg relative"
        >
          {/* Card com neon sutil */}
          <div className="relative">
            {/* Brilho neon sutil ao redor do card */}
            <motion.div 
              className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 blur-lg"
              animate={{ 
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            <div className="relative bg-white border border-orange-200/50 shadow-2xl rounded-2xl p-8">
              {/* Ícone principal suave */}
              <motion.div
                className="flex justify-center mb-6"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
              >
                <div className="relative">
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 rounded-full shadow-lg">
                    <CheckCircle className="h-12 w-12 text-white" />
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-center"
              >
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  Pagamento Aprovado!
                </h1>
                <p className="text-gray-600 text-lg mb-8">
                  Seu delivery está ativo! 🍕⚡
                </p>
              </motion.div>
              
              {/* Badge ZapLivery suave */}
              <motion.div 
                className="mb-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center space-x-3 mb-2">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      <Zap className="h-5 w-5 text-orange-500" />
                    </motion.div>
                    <span className="font-semibold text-orange-700">ZapLivery Ativo</span>
                  </div>
                  <p className="text-orange-600 text-sm">
                    Seu restaurante já está pronto para receber pedidos! 🚀
                  </p>
                </div>
              </motion.div>
              
              {/* Informações do plano */}
              <motion.div 
                className="space-y-3 bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <div className="flex items-center justify-between text-gray-700">
                  <span>Plano:</span>
                  <span className="font-medium text-orange-600">
                    {planInfo?.name || 'Starter'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-700">
                  <span>Valor:</span>
                  <span className="font-medium text-orange-600">
                    R$ {(planInfo?.price || 49.00).toFixed(2)}/mês
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-700">
                  <span>Próxima cobrança:</span>
                  <span className="font-medium text-gray-600">
                    {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </motion.div>
              
              {/* Botão com neon sutil */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
              >
                <Link href="/dashboard">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative"
                  >
                    {/* Brilho neon sutil do botão */}
                    <motion.div 
                      className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-orange-500/30 to-amber-500/30 blur"
                      animate={{ 
                        opacity: [0.5, 0.8, 0.5]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    
                    <button className="relative w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg">
                      <span className="flex items-center justify-center">
                        Acessar Dashboard
                        <motion.div
                          animate={{ x: [0, 3, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </motion.div>
                      </span>
                    </button>
                  </motion.div>
                </Link>
              </motion.div>
              
              {/* ID do pagamento */}
              {(sessionId || paymentId || planInfo?.paymentIntentId) && (
                <motion.div 
                  className="text-xs text-gray-400 pt-4 text-center font-mono"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2, duration: 0.5 }}
                >
                  ID: {planInfo?.paymentIntentId || sessionId || paymentId}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  )
}
