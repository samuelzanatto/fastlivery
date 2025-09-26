'use client'

import { useEffect, useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { notify } from '@/lib/notifications/notify'
import { Zap } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createAuthClient } from 'better-auth/react'
import { getAppUrl } from '@/lib/utils/urls'

// Client auth específico para esta página
const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : getAppUrl()
})

interface FinishSignupResponse {
  success: boolean
  alreadyFinished?: boolean
  message: string
  user: {
    id: string
    email: string
    name: string
    role?: string
  }
  business?: {
    id: string
    name: string
    slug: string
    type: string
  } | null
  tempPassword: string | null
}

function PaymentSuccessContent() {
  const [loadingMessage, setLoadingMessage] = useState('Verificando seu pagamento...')
  const [userInfo, setUserInfo] = useState<FinishSignupResponse['user'] | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const paymentId = searchParams?.get('payment_id')
  const status = searchParams?.get('status')
  const sessionId = searchParams?.get('session_id')

  useEffect(() => {
    // Verificar status do pagamento e redirecionar automaticamente
    const processPaymentAndRedirect = async () => {
      if (sessionId) {
        try {
          // Verificar status do pagamento
          setLoadingMessage('Verificando pagamento...')
          
          // Tentar finalizar o cadastro
          console.log('[PaymentSuccess] Chamando finish-signup com sessionId:', sessionId)
          setLoadingMessage('Finalizando seu cadastro...')
          const resp = await fetch('/api/checkout/public/finish-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          })
          
          console.log('[PaymentSuccess] Resposta finish-signup:', resp.status, resp.statusText)
          
          if (!resp.ok) {
            const errorData = await resp.text()
            console.error('[PaymentSuccess] Erro finish-signup:', errorData)
            throw new Error('Falha ao finalizar cadastro')
          }
          
          const signupData: FinishSignupResponse = await resp.json()
          setUserInfo(signupData.user)

          // Se já estava finalizado previamente, apenas redirecionar para login ou dashboard
          if (signupData.alreadyFinished) {
            console.log('[PaymentSuccess] Cadastro já finalizado anteriormente, seguindo direto para dashboard')
            setLoadingMessage('Redirecionando para seu dashboard...')
            // Limpa possível senha residual no localStorage
            if (typeof window !== 'undefined' && sessionId) {
              try { localStorage.removeItem(`signup:pwd:${sessionId}`) } catch {}
            }
            setTimeout(() => {
              const dashboardUrl = signupData.user.role === 'supplierOwner' ? '/supplier-dashboard' : '/dashboard'
              window.location.href = dashboardUrl
            }, 1500)
            return
          }

          setLoadingMessage('Preparando login automático...')
          let passwordToUse: string | null = signupData.tempPassword

            // Fallback: em casos raros se tempPassword não estiver presente (algum erro interno), tentar localStorage
          if (!passwordToUse && typeof window !== 'undefined') {
            try {
              const localPwd = localStorage.getItem(`signup:pwd:${sessionId}`)
              if (localPwd) {
                console.log('[PaymentSuccess] Usando senha de fallback do localStorage')
                passwordToUse = localPwd
              }
            } catch {
              console.warn('[PaymentSuccess] Falha ao acessar localStorage para fallback de senha')
            }
          }

          if (!passwordToUse) {
            console.error('[PaymentSuccess] tempPassword não disponível; redirecionando para login manual')
            setLoadingMessage('Redirecionando para login...')
            setTimeout(() => {
              router.push(`/login?email=${encodeURIComponent(signupData.user.email)}&message=signup_complete`)
            }, 1000)
            return
          }

          try {
            const loginResult = await authClient.signIn.email({
              email: signupData.user.email,
              password: passwordToUse
            })
            if (loginResult.error) {
              console.error('[PaymentSuccess] Erro no auto-login:', loginResult.error)
              setLoadingMessage('Redirecionando para login...')
              setTimeout(() => {
                router.push(`/login?email=${encodeURIComponent(signupData.user.email)}&message=signup_complete`)
              }, 1000)
              return
            }
            console.log('[PaymentSuccess] Auto-login realizado com sucesso')
            setLoadingMessage('Preparando dashboard...')
            // Remover senha temporária do localStorage por segurança
            if (typeof window !== 'undefined' && sessionId) {
              try { localStorage.removeItem(`signup:pwd:${sessionId}`) } catch {}
            }
            setTimeout(() => {
              const dashboardUrl = signupData.user.role === 'supplierOwner' ? '/supplier-dashboard' : '/dashboard'
              console.log('[PaymentSuccess] Redirecionando para:', dashboardUrl)
              window.location.href = dashboardUrl
            }, 1500)
            return
          } catch (autoLoginError) {
            console.error('[PaymentSuccess] Falha no auto-login (exception):', autoLoginError)
            setLoadingMessage('Redirecionando para login...')
            setTimeout(() => {
              router.push(`/login?email=${encodeURIComponent(signupData.user.email)}&message=signup_complete`)
            }, 1000)
            return
          }
          
          // Exibir toast de sucesso
          notify('success', 'Pagamento aprovado com sucesso!', {
            description: `Bem-vindo, ${signupData.user.name}! Sua conta está ativa e pronta para uso.`,
            duration: 5000,
          })
          
        } catch (error) {
          console.error('Erro ao verificar pagamento:', error)
          notify('error', 'Erro ao verificar status do pagamento')
          // Em caso de erro, redirecionar para o dashboard após 3 segundos
          setTimeout(() => {
            router.push('/dashboard')
          }, 3000)
        }
      } else if (paymentId) {
        // Suporte ao legado de query params - redirecionar direto
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        // Sem parâmetros, redirecionar direto
        setTimeout(() => {
          router.push('/dashboard')
        }, 1000)
      }
    }

    processPaymentAndRedirect()
  }, [sessionId, paymentId, status, router])

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
          
          {/* Logo FastLivery apenas o ícone */}
          <div className="flex items-center justify-center">
            <Zap className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        
        <motion.p 
          className="text-gray-600 text-lg font-medium mb-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {loadingMessage}
        </motion.p>
        
        {userInfo && (
          <motion.p 
            className="text-sm text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            Olá, {userInfo.name}! Preparando sua experiência...
          </motion.p>
        )}
        
        <motion.p 
          className="text-xs text-orange-600 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          Você será redirecionado automaticamente em instantes...
        </motion.p>
      </div>
    </div>
  )
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-gray-200 border-t-orange-500 mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}