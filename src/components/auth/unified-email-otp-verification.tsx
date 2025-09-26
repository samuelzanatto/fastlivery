'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { notify } from '@/lib/notifications/notify'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'
import { MobileOTPInput } from '@/components/ui/mobile-otp-input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useIsMobile } from '@/hooks/ui/use-mobile'
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

export function EmailOtpVerification({ 
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
}: EmailOtpVerificationProps) {
  const [otpCode, setOtpCode] = useState("")
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [isVerified, setIsVerified] = useState(false)
  const sentOnceRef = useRef(false)
  const isMobile = useIsMobile()
  
  // Usar useCallback para estabilizar a função onChange e evitar re-renderizações
  const handleOtpChange = useCallback((value: string) => {
    setOtpCode(value)
  }, [])

  // Função para enviar OTP
  const sendOtp = useCallback(async () => {
    if (!email) return

    setResendLoading(true)
    try {
      const response = await fetch(sendEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          verificationType 
        })
      })

      const data = await response.json()

      if (response.ok) {
        notify('success', data.message || 'Código enviado com sucesso!')
        setResendCooldown(60)
      } else {
        notify('error', data.error || 'Erro ao enviar código')
      }
    } catch (error) {
      console.error('[EmailOtpVerification] Erro ao enviar OTP:', error)
      notify('error', 'Erro inesperado ao enviar código')
    } finally {
      setResendLoading(false)
    }
  }, [email, sendEndpoint, verificationType])

  // Função para verificar OTP
  const verifyOtp = useCallback(async () => {
    if (!otpCode || otpCode.length !== 6) return

    setOtpLoading(true)
    try {
      const response = await fetch(verifyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          otp: otpCode,
          verificationType 
        })
      })

      const data = await response.json()

      if (response.ok) {
        setIsVerified(true)
        notify('success', data.message || 'Email verificado com sucesso!')
        
        setTimeout(() => {
          onVerified()
        }, 1000)
      } else {
        notify('error', data.error || 'Código inválido')
        setOtpCode("")
      }
    } catch (error) {
      console.error('[EmailOtpVerification] Erro ao verificar OTP:', error)
      notify('error', 'Erro inesperado ao verificar código')
      setOtpCode("")
    } finally {
      setOtpLoading(false)
    }
  }, [otpCode, email, verifyEndpoint, verificationType, onVerified])

  // Cooldown do reenvio
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Autoenvio inicial
  useEffect(() => {
    if (autoSend && open && email && !sentOnceRef.current) {
      sentOnceRef.current = true
      sendOtp()
    }
  }, [autoSend, open, email, sendOtp])

  // Auto-verificar quando o código estiver completo
  useEffect(() => {
    if (otpCode.length === 6 && !otpLoading && !isVerified) {
      // Adicionar um pequeno delay para evitar problemas com o teclado mobile
      const timeoutId = setTimeout(() => {
        verifyOtp()
      }, 100)
      
      return () => clearTimeout(timeoutId)
    }
  }, [otpCode, otpLoading, isVerified, verifyOtp])

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4"
        >
          {isVerified ? (
            <CheckCircle className="w-8 h-8 text-green-600" />
          ) : (
            <Mail className="w-8 h-8 text-blue-600" />
          )}
        </motion.div>
        
        <h2 className="text-xl font-semibold text-gray-900">
          {isVerified ? "Email Verificado!" : title}
        </h2>
        
        <p className="text-sm text-gray-600">
          {isVerified 
            ? "Sua conta foi verificada com sucesso"
            : description
          }
        </p>
        
        {!isVerified && (
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-gray-500">Código enviado para:</span>
            <Badge variant="secondary" className="font-mono">
              {email}
            </Badge>
          </div>
        )}
      </div>

      {!isVerified && (
        <>
          {/* OTP Input */}
          <div className="space-y-2">
            <Label className="text-center block">Código de Verificação</Label>
            <div className="flex justify-center">
              {isMobile ? (
                <MobileOTPInput
                  value={otpCode}
                  onChange={handleOtpChange}
                  length={6}
                  disabled={otpLoading || isVerified}
                />
              ) : (
                <InputOTP
                  value={otpCode}
                  onChange={handleOtpChange}
                  maxLength={6}
                  disabled={otpLoading || isVerified}
                  autoFocus={false}
                  pushPasswordManagerStrategy="none"
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
              )}
            </div>
            
            {otpLoading && (
              <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando...</span>
              </div>
            )}
          </div>

          {/* Resend */}
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Não recebeu o código?
            </p>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={sendOtp}
              disabled={resendLoading || resendCooldown > 0}
              className="text-blue-600 hover:text-blue-700"
            >
              {resendLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reenviar em {resendCooldown}s
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reenviar código
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {/* Back button */}
      {onBack && !isVerified && (
        <div className="pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      )}

      {isVerified && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center gap-2 text-green-600">
            <Shield className="w-5 h-5" />
            <span className="font-medium">Verificação concluída</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  )

  // Renderizar como Sheet no mobile, Dialog no desktop
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="bottom" 
          className="max-h-[80vh]"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <SheetHeader className="pb-4">
            <SheetTitle className="sr-only">{title}</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}

// Exportar também com o nome antigo para compatibilidade
export { EmailOtpVerification as ModernEmailOtpVerification }