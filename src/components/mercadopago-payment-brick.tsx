'use client'

import React, { useCallback, useState, useEffect } from 'react'
import { Payment } from '@mercadopago/sdk-react'

interface PaymentBrickProps {
  publicKey: string | null
  amount: number
  customerInfo: {
    name: string
    email: string
    phone: string
  }
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
  selectedAddress?: {
    street: string
    number: string
    complement?: string
    neighborhood: string
    city: string
    state: string
    zipcode: string
  }
  restaurantSlug: string
  onPaymentSuccess?: (paymentResult: unknown) => void
  onPaymentError?: (error: Error) => void
  className?: string
  debug?: boolean
}

function pushDebug(debug: boolean | undefined, ...parts: unknown[]) {
  if (!debug) return
  try {
    const w = window as unknown as { __MP_BRICK_LOGS__?: unknown[] }
    if (!w.__MP_BRICK_LOGS__) w.__MP_BRICK_LOGS__ = []
    w.__MP_BRICK_LOGS__.push({ ts: Date.now(), parts })
  } catch {}
  console.debug('[MP BRICK]', ...parts)
}

export function MercadoPagoPaymentBrick({
  publicKey,
  amount,
  customerInfo,
  items,
  selectedAddress,
  restaurantSlug,
  onPaymentSuccess,
  onPaymentError,
  className,
  debug
}: PaymentBrickProps) {
  const [loading, setLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [sdkInitialized, setSdkInitialized] = useState(false)
  const [initializationKey, setInitializationKey] = useState<string | null>(null)
  const [preferenceId, setPreferenceId] = useState<string | null>(null)
  const [prefLoading, setPrefLoading] = useState(false)
  const [prefError, setPrefError] = useState<string | null>(null)

  // Inicializar MercadoPago SDK de forma mais robusta
  useEffect(() => {
    if (!publicKey || (sdkInitialized && initializationKey === publicKey)) return
    
    pushDebug(debug, 'initializing-sdk', { publicKey: publicKey.slice(0,4) + '...' })
    
    let mounted = true
    
    const initSDK = async () => {
      try {
        // Reset do estado se mudou a chave
        if (initializationKey !== publicKey) {
          setIsReady(false)
          setSdkInitialized(false)
        }
        
        // Importação dinâmica para evitar problemas de SSR
        const { initMercadoPago } = await import('@mercadopago/sdk-react')
        
        if (!mounted) return
        
        // Inicializar SDK
        initMercadoPago(publicKey, { 
          locale: 'pt-BR'
        })
        
        pushDebug(debug, 'sdk-initialized-success')
        setSdkInitialized(true)
        setInitializationKey(publicKey)
        
      } catch (error) {
        pushDebug(debug, 'sdk-init-error', error)
        console.error('[MP Brick] Erro ao inicializar SDK:', error)
        onPaymentError?.(new Error('Falha ao inicializar sistema de pagamento'))
      }
    }
    
    initSDK()
    
    return () => {
      mounted = false
    }
  }, [publicKey, debug, onPaymentError, sdkInitialized, initializationKey])

  // Buscar preferenceId para habilitar carteira Mercado Pago (opcional)
  useEffect(() => {
    // Só busca se tem dados mínimos e ainda não tem preferenceId nem está carregando
    if (!publicKey || !items.length || amount <= 0 || !customerInfo.email || preferenceId || prefLoading) return

    pushDebug(debug, 'fetching-preference', { itemsCount: items.length, amount })
    setPrefLoading(true)
    setPrefError(null)

    const fetchPreference = async () => {
      try {
        const response = await fetch('/api/payments/mercadopago/preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantSlug,
            items: items.map(it => ({
              id: it.id,
              name: it.name,
              price: it.price,
              quantity: it.quantity
            })),
            customer: {
              name: customerInfo.name,
              email: customerInfo.email,
              phone: customerInfo.phone
            },
            externalReference: `BRICK-${Date.now()}`
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Falha ao gerar preferência')
        }

        const data = await response.json()
        pushDebug(debug, 'preference-created', { preferenceId: data.preference_id })
        setPreferenceId(data.preference_id)

      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Erro ao gerar preferência'
        pushDebug(debug, 'preference-error', errMsg)
        setPrefError(errMsg)
        // Não bloquear - pode usar sem preferenceId (sem carteira MP)
      } finally {
        setPrefLoading(false)
      }
    }

    fetchPreference()
  }, [publicKey, items, amount, customerInfo.email, customerInfo.name, customerInfo.phone, restaurantSlug, preferenceId, prefLoading, debug])

  // Se no futuro quisermos usar preferenceId (ex: habilitar carteira MP / parcelas sem cartão), backend deve gerar e passar
  // Por enquanto só usamos amount direto (pagamento standard) – docs suportam usar apenas amount.
  const initialization = React.useMemo(() => {
    const [firstName, ...rest] = customerInfo.name.trim().split(' ')
    const lastName = rest.join(' ') || 'Cliente'

    const baseInit = {
      amount: Math.round(amount), // docs: deve ser inteiro
      payer: {
        email: customerInfo.email,
        firstName: firstName || 'Cliente',
        lastName,
        entityType: 'individual' as const
        // identification: { type: 'CPF', number: '00000000000' } // (opcional) preencher quando disponível para autofill
      }
    }

    // Incluir preferenceId se disponível (habilita carteira Mercado Pago)
    if (preferenceId) {
      return {
        ...baseInit,
        preferenceId
      }
    }

    return baseInit
  }, [amount, customerInfo.email, customerInfo.name, preferenceId])

  const customization = React.useMemo(() => {
    const base = {
      paymentMethods: {
        ticket: 'all' as const,
        bankTransfer: 'all' as const,
        creditCard: 'all' as const,
        debitCard: 'all' as const,
        prepaidCard: 'all' as const
      }
    }

    // Só habilitar carteira Mercado Pago se tiver preferenceId
    if (preferenceId) {
      return {
        paymentMethods: {
          ...base.paymentMethods,
          mercadoPago: 'all' as const
        }
      }
    }

    return base
  }, [preferenceId])

  // Implementação seguindo padrão oficial: retorna Promise e só resolve/reject após backend
  // Tipagem frouxa para compatibilidade com diferentes meios (card, ticket, bankTransfer etc.)
  // O SDK fornece um objeto agregando campos conforme o método selecionado.
  // Mantemos 'any' apenas local (lint desativado) para não quebrar a tipagem do componente Payment.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = useCallback(async ({ selectedPaymentMethod, formData }: any) => {
    pushDebug(debug, 'onSubmit', { selectedPaymentMethod, formKeys: Object.keys(formData || {}) })
    setLoading(true)
    return new Promise<void>((resolve, reject) => {
      fetch('/api/payments/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedPaymentMethod,
          formData,
          context: {
            amount: Math.round(amount),
            items,
            restaurantId: restaurantSlug,
            customer: customerInfo,
            address: selectedAddress
          }
        })
      })
        .then(async (r) => {
          if (!r.ok) {
            const e = await r.json().catch(() => ({}))
            throw new Error(e.error || 'Falha ao criar pagamento')
          }
          return r.json()
        })
        .then((resp) => {
          pushDebug(debug, 'payment-success', resp)
            onPaymentSuccess?.(resp)
            resolve()
        })
        .catch((err) => {
          pushDebug(debug, 'payment-error', err)
          onPaymentError?.(err instanceof Error ? err : new Error('Erro desconhecido'))
          reject(err)
        })
        .finally(() => setLoading(false))
    })
  }, [amount, items, restaurantSlug, customerInfo, selectedAddress, debug, onPaymentSuccess, onPaymentError])

  const onError = useCallback(async (error: unknown) => {
    // Docs: apenas logar – deixar fluxo continuar (não remover erros silenciosamente)
    pushDebug(debug, 'sdk-error', error)
    console.error('[MP Brick] SDK error', error)
    const errorObj = error instanceof Error ? error : new Error('Erro do SDK')
    onPaymentError?.(errorObj)
  }, [debug, onPaymentError])

  const onReady = useCallback(async () => {
    pushDebug(debug, 'onReady')
    setIsReady(true)
  }, [debug])

  if (!publicKey) {
    return (
      <div className={className}>
        <div className="text-sm text-gray-500 py-6 text-center">Obtendo chave pública de pagamento...</div>
        {debug && (
          <pre className="text-[10px] bg-gray-100 p-2 overflow-auto max-h-40 mt-2">
            {JSON.stringify({ estado: 'sem-public-key' }, null, 2)}
          </pre>
        )}
      </div>
    )
  }

  if (!sdkInitialized) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          <span className="ml-2 text-gray-600 text-sm">Inicializando sistema de pagamento...</span>
        </div>
        {debug && (
          <pre className="text-[10px] bg-gray-100 p-2 overflow-auto max-h-40 mt-2">
            {JSON.stringify({ estado: 'inicializando-sdk', publicKey: !!publicKey }, null, 2)}
          </pre>
        )}
      </div>
    )
  }

  // Mostrar loading enquanto busca preferenceId
  if (prefLoading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
          <span className="ml-2 text-gray-600 text-sm">Gerando preferência de pagamento...</span>
        </div>
        {debug && (
          <pre className="text-[10px] bg-gray-100 p-2 overflow-auto max-h-40 mt-2">
            {JSON.stringify({ estado: 'carregando-preferencia', hasItems: items.length > 0 }, null, 2)}
          </pre>
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      {!isReady && (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          <span className="ml-2 text-gray-600 text-sm">Carregando pagamento...</span>
        </div>
      )}
      <div style={{ display: isReady ? 'block' : 'none' }}>
        <Payment
          key={`payment-${publicKey?.slice(-8) || 'default'}-${amount}`}
          initialization={initialization}
          customization={customization}
          onSubmit={onSubmit}
          onReady={onReady}
          onError={onError}
        />
      </div>
      {debug && (
        <div className="mt-2 border rounded bg-gray-50 p-2 text-[10px] font-mono">
          <p className="font-semibold mb-1">MP Brick Debug</p>
          <pre className="max-h-40 overflow-auto">{JSON.stringify({
            publicKeyMasked: publicKey.slice(0,4)+'...'+publicKey.slice(-4),
            sdkInitialized,
            isReady,
            loading,
            items: items.length,
            amount,
            preferenceId: preferenceId ? preferenceId.slice(0,8)+'...' : null,
            prefLoading,
            prefError,
            mercadoPagoEnabled: !!preferenceId
          }, null, 2)}</pre>
        </div>
      )}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-md shadow flex items-center text-sm">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            <span className="ml-3">Processando...</span>
          </div>
        </div>
      )}
    </div>
  )
}