'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  Mail, 
  CheckCircle, 
  RefreshCw,
  ArrowLeft,
  Shield
} from 'lucide-react'

interface EmailOtpVerificationProps {
  email: string
  onVerified: () => void
  onBack?: () => void
  title?: string
  description?: string
}

export function EmailOtpVerification({ 
  email, 
  onVerified, 
  onBack,
  title = "Verificar Email",
  description = "Digite o código de 6 dígitos enviado para seu email"
}: EmailOtpVerificationProps) {
  const [otpCode, setOtpCode] = useState("")
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [isVerified, setIsVerified] = useState(false)
  // Evitar reenvio automático duplicado em StrictMode (dev) ou remount rápido
  const sentOnceRef = useRef(false)

  // Removido Set global para permitir auto-envio a cada abertura real do dialog.
  // Vamos depender apenas de sentOnceRef dentro do ciclo de vida deste componente.

  // Cooldown do reenvio
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Auto-enviar código ao montar componente (apenas uma vez por montagem real)
  useEffect(() => {
    console.log('[DEBUG] useEffect executando, sentOnceRef.current:', sentOnceRef.current)
    
    // Função interna para evitar dependência circular
    const autoSend = async () => {
      // Verificar novamente se já foi enviado (pode ter mudado durante o timeout)
      if (sentOnceRef.current) {
        console.log(`[DEBUG] Auto-envio cancelado: já foi enviado por outra instância`)
        return
      }
      
      // Marcar como enviado ANTES de fazer a requisição
      sentOnceRef.current = true
      console.log('[DEBUG] Marcando sentOnceRef como true e iniciando auto-envio')

      // Evitar múltiplos envios simultâneos
      if (resendLoading) {
        console.log(`[DEBUG] Auto-envio cancelado: já há envio em andamento`)
        return
      }

      console.log(`[DEBUG] Iniciando auto-envio de OTP para: ${email}`)
      setResendLoading(true)
      
      try {
        const response = await fetch('/api/signup/send-verification-otp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email })
        })

        if (!response.ok) {
          const error = await response.json()
          console.log(`[DEBUG] Erro no auto-envio de OTP:`, error)
          throw new Error(error.error || 'Erro ao enviar código')
        }

        console.log(`[DEBUG] Auto-envio de OTP realizado com sucesso para: ${email}`)
        setResendCooldown(60) // 60 segundos de cooldown
      } catch (error) {
        console.error('Erro no auto-envio de OTP:', error)
        // Resetar ref em caso de erro para permitir reenvio manual
        sentOnceRef.current = false
      } finally {
        setResendLoading(false)
      }
    }
    
    console.log('[DEBUG] Agendando auto-envio para 300ms')
    const timer = setTimeout(autoSend, 300)
    return () => {
      console.log('[DEBUG] Limpando timer do auto-envio')
      clearTimeout(timer)
    }
    // Dependente do email: se mudar, novo envio (sentOnceRef reseta ao recriar componente)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email])

  // Auto-formatar OTP (apenas números, máximo 6 dígitos)
  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setOtpCode(value)
  }

  // Enviar OTP (função manual - botão reenviar)
  const handleSendOtp = async () => {
    // Evitar múltiplos envios simultâneos
    if (resendLoading) {
      console.log(`[DEBUG] Envio manual já em andamento, ignorando...`)
      return
    }

    console.log(`[DEBUG] Iniciando envio MANUAL de OTP para: ${email}`)
    setResendLoading(true)
    
    try {
      const response = await fetch('/api/signup/send-verification-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      if (!response.ok) {
        const error = await response.json()
        console.log(`[DEBUG] Erro no envio manual de OTP:`, error)
        throw new Error(error.error || 'Erro ao enviar código')
      }

      console.log(`[DEBUG] OTP enviado manualmente com sucesso para: ${email}`)
      toast.success('Código enviado para seu email!')
      setResendCooldown(60) // 60 segundos de cooldown
    } catch (error) {
      console.error('Erro ao enviar OTP manual:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar código')
    } finally {
      setResendLoading(false)
    }
  }

  // Verificar OTP
  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error('Digite o código de 6 dígitos')
      return
    }

    console.log(`[DEBUG] Iniciando verificação de OTP: ${otpCode} para email: ${email}`)
    setOtpLoading(true)
    
    try {
      const response = await fetch('/api/signup/verify-verification-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          otp: otpCode
        })
      })

      const data = await response.json()
      console.log(`[DEBUG] Resposta da verificação:`, data)

      if (!response.ok) {
        throw new Error(data.error || 'Código inválido')
      }
      
      if (data.success && data.verified) {
        console.log(`[DEBUG] Verificação bem-sucedida!`)
        setIsVerified(true)
        toast.success('Email verificado com sucesso!')
        
        // Aguardar animação antes de chamar onVerified
        setTimeout(() => {
          onVerified()
        }, 1500)
      } else {
        throw new Error('Verificação falhou')
      }

    } catch (error) {
      console.error('Erro ao verificar OTP:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao verificar código')
      setOtpCode("")
    } finally {
      setOtpLoading(false)
    }
  }

  // Reenviar código
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    await handleSendOtp()
  }

  // Animações
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  }

  if (isVerified) {
    return (
      <motion.div 
        className="text-center p-8"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-green-600 mb-2">
          Email Verificado!
        </h3>
        <p className="text-gray-600">
          Seu email foi verificado com sucesso. Redirecionando...
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={fadeInUp}
    >
      <Card className="w-full max-w-md mx-auto border-2 shadow-xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold flex items-center gap-2 justify-center">
            <Mail className="h-6 w-6" />
            {title}
          </CardTitle>
          <p className="text-gray-600 text-sm mt-2">
            {description}
          </p>
          <Badge variant="outline" className="mt-2 text-xs">
            {email}
          </Badge>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="otp">Código de Verificação</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="000000"
              value={otpCode}
              onChange={handleOtpChange}
              maxLength={6}
              className="text-center text-2xl tracking-widest font-mono"
              autoComplete="one-time-code"
            />
            <p className="text-xs text-gray-500 text-center">
              Digite o código de 6 dígitos enviado para seu email
            </p>
          </div>

          <Button
            onClick={handleVerifyOtp}
            disabled={otpLoading || otpCode.length !== 6}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {otpLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Verificar Código
              </>
            )}
          </Button>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Não recebeu o código?
            </p>
            <Button
              variant="ghost"
              onClick={handleResendOtp}
              disabled={resendLoading || resendCooldown > 0}
              className="text-blue-600 hover:text-blue-700"
            >
              {resendLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reenviar em {resendCooldown}s
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reenviar código
                </>
              )}
            </Button>
          </div>

          {onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}