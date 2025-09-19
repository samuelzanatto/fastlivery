'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useIsMobile } from '@/hooks/use-mobile'
import { 
  Loader2, 
  Mail, 
  CheckCircle, 
  RefreshCw,
  ArrowLeft,
  Shield
} from 'lucide-react'

interface ModernEmailOtpVerificationProps {
  email: string
  onVerified: () => void
  onBack?: () => void
  title?: string
  description?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  // Endpoints customizáveis para diferentes contextos
  sendEndpoint?: string
  verifyEndpoint?: string
  // Para diferentes tipos de verificação (signup, employee, etc.)
  verificationType?: 'signup' | 'employee' | 'customer' | 'public'
  // Controlar se deve enviar automaticamente ou apenas quando solicitado
  autoSend?: boolean
}

export function ModernEmailOtpVerification({ 
  email, 
  onVerified, 
  onBack,
  title = "Verificar Email",
  description = "Digite o código de 6 dígitos enviado para seu email",
  open = true,
  onOpenChange,
  sendEndpoint = '/api/signup/send-verification-otp',
  verifyEndpoint = '/api/signup/verify-verification-otp',
  verificationType = 'signup',
  autoSend = true
}: ModernEmailOtpVerificationProps) {
  const [otpCode, setOtpCode] = useState("")
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [isVerified, setIsVerified] = useState(false)
  const [initialSent, setInitialSent] = useState(false) // Track if initial OTP was sent
  const sentOnceRef = useRef(false)
  const isMobile = useIsMobile()

  // Cooldown do reenvio
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Enviar OTP
  const handleSendOtp = useCallback(async (isAuto = false) => {
    if (!isAuto && resendLoading) return

    console.log(`[DEBUG] Iniciando envio ${isAuto ? 'AUTO' : 'MANUAL'} de OTP para: ${email}`)
    setResendLoading(true)
    
    try {
      const response = await fetch(sendEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      if (!response.ok) {
        const error = await response.json()
        console.log(`[DEBUG] Erro no envio de OTP:`, error)
        throw new Error(error.error || 'Erro ao enviar código')
      }

      console.log(`[DEBUG] OTP enviado com sucesso para: ${email}`)
      setInitialSent(true) // Mark as sent
      if (!isAuto) {
        toast.success('Código enviado para seu email!')
        setResendCooldown(60)
      }
    } catch (error) {
      console.error('Erro ao enviar OTP:', error)
      if (!isAuto) {
        toast.error(error instanceof Error ? error.message : 'Erro ao enviar código')
      }
    } finally {
      setResendLoading(false)
    }
  }, [email, sendEndpoint, resendLoading])

  // Verificar OTP
  const handleVerifyOtp = useCallback(async () => {
    if (otpCode.length !== 6) {
      toast.error('Digite o código de 6 dígitos')
      return
    }

    console.log(`[DEBUG] Iniciando verificação de OTP: ${otpCode} para email: ${email}`)
    setOtpLoading(true)
    
    try {
      const response = await fetch(verifyEndpoint, {
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

      console.log(`[DEBUG] Verificação bem-sucedida!`)
      setIsVerified(true)
      toast.success('Email verificado com sucesso!')
      
      setTimeout(() => {
        onVerified()
      }, 1000)

    } catch (error) {
      console.error('Erro ao verificar OTP:', error)
      toast.error(error instanceof Error ? error.message : 'Código inválido ou expirado')
    } finally {
      setOtpLoading(false)
    }
  }, [otpCode, email, verifyEndpoint, onVerified])

  // Auto-envio inicial (apenas se autoSend estiver habilitado)
  useEffect(() => {
    if (!email || sentOnceRef.current || !autoSend) return

    const autoSendOtp = async () => {
      console.log(`[DEBUG] Auto-enviando OTP para: ${email}`)
      sentOnceRef.current = true
      setInitialSent(true) // Marca como enviado mesmo em auto-send
      await handleSendOtp(true)
    }

    const timer = setTimeout(autoSendOtp, 300)
    return () => {
      console.log('[DEBUG] Limpando timer do auto-envio')
      clearTimeout(timer)
    }
  }, [email, handleSendOtp, autoSend])

  // Para casos onde o OTP foi enviado externamente (antes de abrir o dialog)
  useEffect(() => {
    if (!autoSend && email && !initialSent) {
      setInitialSent(true) // Assume que foi enviado externamente
    }
  }, [autoSend, email, initialSent])

  const handleResendOtp = useCallback(async () => {
    if (resendCooldown > 0) return
    await handleSendOtp(false)
  }, [resendCooldown, handleSendOtp])

  // Verificação automática quando OTP for completado
  useEffect(() => {
    if (otpCode.length === 6 && !otpLoading && !isVerified) {
      handleVerifyOtp()
    }
  }, [otpCode, otpLoading, isVerified, handleVerifyOtp])

  const ContentComponent = () => (
    <div className="space-y-6">
      {/* Header com ícone */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Shield className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
        <p className="text-sm text-slate-600">{description}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Mail className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600 truncate">{email}</span>
          <Badge variant="outline" className="text-xs">
            {verificationType === 'employee' ? 'Funcionário' : 
             verificationType === 'customer' ? 'Cliente' : 
             verificationType === 'public' ? 'Cliente' : 'Conta'}
          </Badge>
        </div>
      </div>

      {/* Campo OTP usando shadcn/ui */}
      <div className="space-y-4">
        <Label className="text-center block text-sm font-medium text-slate-700">
          Código de Verificação
        </Label>
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={(value) => setOtpCode(value)}
            disabled={otpLoading || isVerified}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <p className="text-xs text-gray-500 text-center">
          O código será verificado automaticamente
        </p>
      </div>

      {/* Status de verificação */}
      {isVerified && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg"
        >
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Email verificado com sucesso!</span>
        </motion.div>
      )}

      {/* Botões de ação */}
      <div className="space-y-3">
        {/* Botão de verificação manual (caso necessário) */}
        {otpCode.length === 6 && !isVerified && (
          <Button
            onClick={handleVerifyOtp}
            disabled={otpLoading}
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
        )}

        {/* Botão de reenvio */}
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
      </div>
      {/* Botão voltar */}
      {onBack && (
        <Button
          variant="outline"
          onClick={onBack}
          className="w-full"
          disabled={otpLoading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      )}

    </div>
  )

  // Renderizar como Dialog no desktop ou Sheet no mobile
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] max-h-[90vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="sr-only">{title}</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <ContentComponent />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">{title}</DialogTitle>
        </DialogHeader>
        <ContentComponent />
      </DialogContent>
    </Dialog>
  )
}