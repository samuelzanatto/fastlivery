'use client'

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Payment, initMercadoPago } from '@mercadopago/sdk-react'
import { toast } from 'sonner'

interface MercadoPagoPaymentBrickProps {
  publicKey: string
  amount: number
  customerEmail: string
  preferenceId?: string | null
  onSubmit: (formData: unknown, additionalData?: unknown) => Promise<void>
  onReady?: () => void
  onError?: (error: unknown) => void
}

export const MercadoPagoPaymentBrick = React.memo(function MercadoPagoPaymentBrick({ 
  publicKey, 
  amount, 
  customerEmail,
  preferenceId,
  onSubmit,
  onReady,
  onError 
}: MercadoPagoPaymentBrickProps) {
  const [, forceRerender] = useState(0) // state interno mínimo para forçar 1 re-render
  const initializedRef = useRef(false)
  const readyLoggedRef = useRef(false)
  const mountLoggedRef = useRef(false)

  // Logar apenas UM mount real
  useEffect(() => {
    if (!mountLoggedRef.current) {
      mountLoggedRef.current = true
      console.debug('[MercadoPago] Wrapper mount inicial')
    }
  }, [])

  // Inicializar MercadoPago SDK uma única vez
  useEffect(() => {
    if (!publicKey) return
    if (initializedRef.current) return
    try {
      initMercadoPago(publicKey, { locale: 'pt-BR' })
  initializedRef.current = true
  // Forçar apenas UM re-render para esconder o placeholder
  forceRerender(v => v + 1)
      console.log('[MercadoPago] SDK inicializado')
    } catch (error) {
      console.error('[MercadoPago] Falha ao inicializar SDK:', error)
      toast.error('Erro ao carregar sistema de pagamento')
    }
  }, [publicKey])

  interface PaymentInitialization {
    amount: number
    payer: {
      email: string
      entityType: 'individual' | 'association'
    }
    preferenceId?: string
  }

  // Memo para evitar recriar objetos e disparar recriação interna do Brick
  const initialization: PaymentInitialization = useMemo(() => {
    const base: PaymentInitialization = {
      amount,
      payer: {
        email: (customerEmail?.trim() || 'cliente@example.com'),
        entityType: 'individual'
      }
    }
    if (preferenceId) base.preferenceId = preferenceId
    return base
  }, [amount, customerEmail, preferenceId])

  const customization = useMemo(() => ({
    paymentMethods: {
      ticket: 'all' as const,
      bankTransfer: 'all' as const, // PIX
      creditCard: 'all' as const,
      debitCard: 'all' as const
    }
  }), [])

  const handleSubmit = useCallback(async (formData: unknown, additionalData?: unknown) => {
    try {
      console.log('Payment Brick onSubmit:', { formData, additionalData })
      await onSubmit(formData, additionalData)
    } catch (error) {
      console.error('Erro no onSubmit do Payment Brick:', error)
      throw error
    }
  }, [onSubmit])

  const handleReady = useCallback(() => {
    if (!readyLoggedRef.current) {
      readyLoggedRef.current = true
      console.log('[MercadoPago] Payment Brick pronto')
    }
    onReady?.()
  }, [onReady])

  const handleError = useCallback((error: unknown) => {
    console.error('Erro no Payment Brick:', error)
    onError?.(error)
  }, [onError])

  if (!initializedRef.current) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Inicializando sistema de pagamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mercadopago-payment-brick">
      <Payment
        key="payment-brick" // chave estável; somente altere se precisar forçar reset
        initialization={initialization}
        customization={customization}
        onSubmit={handleSubmit}
        onReady={handleReady}
        onError={handleError}
      />
    </div>
  )
})