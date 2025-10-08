import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import { getAppUrl } from '@/lib/utils/urls'
import { normalizeMercadoPagoStatus } from './mp-status'
import { prisma } from '@/lib/database/prisma'

export interface CartItem {
  id: string
  name: string
  description: string
  price: number
  quantity: number
  image?: string
}

export interface CustomerInfo {
  name: string
  phone: string
  email: string
}

export interface MercadoPagoPaymentData {
  items: CartItem[]
  customerInfo: CustomerInfo
  paymentMethod: 'pix' | 'credit_card' | 'debit_card'
  businessId: string
  orderNumber: string
  /** Valor opcional para testes (sobrepõe cálculo normal quando presente e em modo teste) */
  testAmount?: number
}

export class MercadoPagoService {
  private checkoutClient: MercadoPagoConfig // Para Checkout Pro
  private paymentClient: MercadoPagoConfig  // Para PIX transparente
  private preference: Preference
  private payment: Payment
  private isTestMode: boolean

  constructor(businessAccessToken?: string) {
    // Credenciais específicas para cada funcionalidade
    const checkoutToken = businessAccessToken || process.env.MERCADOPAGO_ACCESS_TOKEN || '' // APP_USR- 
    const paymentToken = process.env.MERCADOPAGO_PAYMENT_ACCESS_TOKEN || checkoutToken // TEST- se disponível
    
    // Detectar modo de teste
    this.isTestMode = paymentToken.startsWith('TEST-') || 
                     process.env.NODE_ENV === 'development'
    
    // Cliente para Checkout Pro (APP_USR-)
    this.checkoutClient = new MercadoPagoConfig({
      accessToken: checkoutToken,
      options: { timeout: 10000 }
    })
    
    // Cliente para PIX transparente (TEST- ou fallback)
    this.paymentClient = new MercadoPagoConfig({
      accessToken: paymentToken,
      options: { timeout: 10000 }
    })
    
    this.preference = new Preference(this.checkoutClient)
    this.payment = new Payment(this.paymentClient)

    console.log('MercadoPago Service iniciado:', {
      mode: this.isTestMode ? 'TEST' : 'PRODUCTION',
      checkoutToken: checkoutToken.substring(0, 10) + '...',
      paymentToken: paymentToken.substring(0, 10) + '...',
      forcedTestMode: process.env.NODE_ENV === 'development'
    })
  }

  /**
   * Recupera detalhes de um pagamento pelo ID (para uso em webhook)
   */
  async getPaymentById(id: string) {
    try {
      const result = await this.payment.get({ id })
      return result
    } catch (e) {
      console.error('Erro getPaymentById:', e)
      return null
    }
  }

  /**
   * Criar pagamento PIX direto (transparente) - retorna QR Code instantâneo
   */
  async createPixPayment(data: MercadoPagoPaymentData) {
    const deliveryFee = 5.00
    let calcAmount = data.items.reduce((acc, item) => 
      acc + (item.price * item.quantity), 0
    ) + deliveryFee

    // Se modo teste e veio testAmount, usar valor simbólico
    if (this.isTestMode && typeof data.testAmount === 'number') {
      calcAmount = data.testAmount
    }
    const totalAmount = calcAmount

    try {
      // Separar nome e sobrenome corretamente
      const nameParts = data.customerInfo.name.trim().split(' ')
      const firstName = nameParts[0] || 'Cliente'
      const lastName = nameParts.slice(1).join(' ') || 'FastLivery'

      const notificationUrlEnv = process.env.MERCADOPAGO_WEBHOOK_URL || process.env.NGROK_URL || process.env.NEXT_PUBLIC_APP_URL
      const validNotificationUrl = notificationUrlEnv && /^https?:\/\//.test(notificationUrlEnv)

      const paymentData: {
        transaction_amount: number
        description: string
        payment_method_id: string
        payer: {
          email: string
          first_name: string
          last_name: string
          identification: { type: string, number: string }
        }
        external_reference: string
        metadata: Record<string, unknown>
        notification_url?: string
      } = {
        transaction_amount: Number(totalAmount.toFixed(2)), // já com possível testAmount
        description: `Pedido FastLivery - ${data.orderNumber}`,
        payment_method_id: 'pix',
        payer: {
          email: data.customerInfo.email,
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: 'CPF',
            number: '11144477735' // CPF de teste - em produção usar CPF real do cliente
          }
        },
        external_reference: data.orderNumber,
        metadata: {
          business_id: data.businessId,
          order_number: data.orderNumber,
          customer_name: data.customerInfo.name,
          customer_phone: data.customerInfo.phone,
          items: JSON.stringify(data.items.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price
          })))
        }
      }

      if (validNotificationUrl) {
        paymentData.notification_url = `${notificationUrlEnv.replace(/\/$/, '')}/api/webhooks/mercadopago`
      }

      console.log('Dados do pagamento PIX sendo enviados:', {
        transaction_amount: paymentData.transaction_amount,
        payment_method_id: paymentData.payment_method_id,
        payer: paymentData.payer,
        external_reference: paymentData.external_reference,
        isTestMode: this.isTestMode,
        usedTestAmount: this.isTestMode && typeof data.testAmount === 'number',
        hasNotificationUrl: !!paymentData.notification_url
      })

      const result = await this.payment.create({ body: paymentData })
      
      console.log('Resposta completa da API Mercado Pago:', JSON.stringify(result, null, 2))
      console.log('PIX criado com sucesso:', {
        id: result.id,
        status: result.status,
        status_detail: result.status_detail,
        hasQrCode: !!result.point_of_interaction?.transaction_data?.qr_code,
        hasQrCodeBase64: !!result.point_of_interaction?.transaction_data?.qr_code_base64,
        qrCodeLength: result.point_of_interaction?.transaction_data?.qr_code?.length || 0,
        qrCodePreview: result.point_of_interaction?.transaction_data?.qr_code?.substring(0, 50) + '...'
      })

      // Persistir registro Payment (usando campo preferenceId como identificador principal)
    let paymentRecordPersisted: { id: string; preferenceId: string; status: string } | null = null
      try {
        const paymentIdStr = String(result.id)
        const mappedStatus = this.mapMpStatus(result.status)
        paymentRecordPersisted = await prisma.payment.upsert({
          where: { preferenceId: paymentIdStr },
          create: {
            preferenceId: paymentIdStr,
            externalReference: data.orderNumber,
            status: mappedStatus,
            amount: totalAmount,
            type: 'PIX',
            businessId: data.businessId,
            metadata: {
              source: 'pix_direct',
              qr_code_present: !!result.point_of_interaction?.transaction_data?.qr_code,
              mp_status: result.status,
              mp_status_detail: result.status_detail
            }
          },
          update: {
            amount: totalAmount,
            status: mappedStatus,
            metadata: {
              source: 'pix_direct_update',
              mp_status: result.status,
              mp_status_detail: result.status_detail
            }
          }
        })
        console.log('Registro Payment upsert PIX:', { id: paymentRecordPersisted.id, preferenceId: paymentRecordPersisted.preferenceId })
      } catch (persistErr) {
        console.error('Falha ao persistir Payment PIX:', persistErr)
      }

      return {
        id: result.id,
        status: result.status,
        qr_code: result.point_of_interaction?.transaction_data?.qr_code || '',
        qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64 || '',
        ticket_url: result.point_of_interaction?.transaction_data?.ticket_url || '',
        total_amount: totalAmount,
        external_reference: data.orderNumber,
        payment: paymentRecordPersisted
      }
    } catch (error) {
      console.error('Erro ao criar pagamento PIX:', error)
      
      // Se erro de credenciais, lançar erro específico para o endpoint tratar
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('Unauthorized use of live credentials') ||
          errorMessage.includes('unauthorized')) {
        throw new Error('CREDENTIALS_NOT_SUPPORTED_FOR_PIX')
      }
      
      throw new Error('Erro ao processar pagamento PIX')
    }
  }

  /**
   * Criar pagamento direto com cartão usando token gerado pelo Payment Brick.
   * Requer: token, payment_method_id, installments (opcional), identification (CPF), email
   */
  async createCardPayment(data: MercadoPagoPaymentData & {
    token: string
    payment_method_id: string
    installments?: number
    identification?: { type: string; number: string }
  }) {
    const deliveryFee = 5.00
    const totalAmount = data.items.reduce((acc, item) => acc + (item.price * item.quantity), 0) + deliveryFee

    const nameParts = data.customerInfo.name.trim().split(' ')
    const firstName = nameParts[0] || 'Cliente'
    const lastName = nameParts.slice(1).join(' ') || 'FastLivery'

    const payerIdentification = data.identification || { type: 'CPF', number: '11144477735' }

    const body = {
      transaction_amount: Number(totalAmount.toFixed(2)),
      token: data.token,
      description: `Pedido FastLivery - ${data.orderNumber}`,
      installments: data.installments || 1,
      payment_method_id: data.payment_method_id,
      payer: {
        email: data.customerInfo.email,
        first_name: firstName,
        last_name: lastName,
        identification: payerIdentification
      },
      external_reference: data.orderNumber,
      // Adicionar notification_url para receber webhooks
      ...(this.shouldSetNotificationUrl() ? {
        notification_url: `${this.getBaseUrl()}/api/webhooks/mercadopago`
      } : {}),
      metadata: {
        business_id: data.businessId,
        order_number: data.orderNumber,
        items: JSON.stringify(data.items.map(i => ({ id: i.id, name: i.name, q: i.quantity, p: i.price })))
      }
    }

    try {
      console.log('Criando pagamento cartão direto:', { pm: body.payment_method_id, installments: body.installments })
      
      // Log da configuração de webhook
      const shouldUseWebhook = this.shouldSetNotificationUrl()
      const webhookUrl = shouldUseWebhook ? `${this.getBaseUrl()}/api/webhooks/mercadopago` : 'não configurado'
      console.log('Webhook config:', { shouldUseWebhook, webhookUrl })
      
      const result = await this.payment.create({ body })
      const mappedStatus = this.mapMpStatus(result.status)

      // Persistir Payment
      try {
        const paymentIdStr = String(result.id)
        await prisma.payment.upsert({
          where: { preferenceId: paymentIdStr },
            create: {
              preferenceId: paymentIdStr,
              externalReference: data.orderNumber,
              status: mappedStatus,
              amount: totalAmount,
              type: 'CARD',
              businessId: data.businessId,
              metadata: {
                source: 'card_direct',
                mp_status: result.status,
                pm: body.payment_method_id
              }
            },
            update: {
              status: mappedStatus,
              amount: totalAmount,
              metadata: { source: 'card_direct_update', mp_status: result.status }
            }
        })
      } catch (persistErr) {
        console.error('Falha persistir Payment cartão:', persistErr)
      }

      return {
        id: result.id,
        status: result.status,
        status_detail: result.status_detail,
        total_amount: totalAmount,
        external_reference: data.orderNumber
      }
    } catch (error) {
      console.error('Erro createCardPayment:', error)
      throw new Error('Erro ao processar pagamento cartão')
    }
  }

  /**
   * Criar preferência de pagamento (Checkout Pro) - suporta PIX e cartão
   */
  async createPaymentPreference(data: MercadoPagoPaymentData) {
    const deliveryFee = 5.00
    const totalAmount = data.items.reduce((acc, item) => 
      acc + (item.price * item.quantity), 0
    ) + deliveryFee

    try {
      // Usar helper centralizado para obter URL
      const baseUrl = getAppUrl()
      
      const paymentMethodsConfig = this.getPaymentMethodsConfig(data.paymentMethod)
      
      console.log('Configuração de métodos de pagamento:', {
        paymentMethod: data.paymentMethod,
        config: paymentMethodsConfig
      })
      
      const preferenceData = {
        items: [
          {
            id: data.orderNumber,
            title: `Pedido FastLivery - ${data.orderNumber}`,
            description: `${data.items.length} itens`,
            quantity: 1,
            unit_price: Number(totalAmount.toFixed(2)),
            currency_id: 'BRL'
          }
        ],
        payer: {
          name: data.customerInfo.name,
          email: data.customerInfo.email,
          phone: {
            area_code: data.customerInfo.phone.substring(0, 2) || '11',
            number: data.customerInfo.phone.substring(2) || '999999999'
          }
        },
        // Configurar métodos de pagamento baseado na escolha
        payment_methods: paymentMethodsConfig,
        back_urls: {
          success: `${baseUrl}/checkout/success?order=${data.orderNumber}`,
          failure: `${baseUrl}/checkout/failure?order=${data.orderNumber}`,
          pending: `${baseUrl}/checkout/pending?order=${data.orderNumber}`
        },
        // Configurar notification_url apenas em produção ou com HTTPS
        ...(this.shouldSetNotificationUrl() ? {
          notification_url: `${baseUrl}/api/webhooks/mercadopago`
        } : {}),
        external_reference: data.orderNumber,
        metadata: {
          business_id: data.businessId,
          order_number: data.orderNumber,
          customer_name: data.customerInfo.name,
          customer_phone: data.customerInfo.phone,
          payment_method: data.paymentMethod,
          items: JSON.stringify(data.items.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price
          })))
        },
        // Definir expiração para PIX (30 minutos)
        ...(data.paymentMethod === 'pix' ? {
          expires: true,
          expiration_date_from: new Date().toISOString(),
          expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        } : {})
      }

      console.log('Criando preferência Checkout Pro:', {
        orderNumber: data.orderNumber,
        paymentMethod: data.paymentMethod,
        totalAmount,
        isTestMode: this.isTestMode,
        baseUrl: baseUrl
      })

      console.log('Dados da preferência completos:', JSON.stringify({
        payment_methods: preferenceData.payment_methods,
        back_urls: preferenceData.back_urls,
        external_reference: preferenceData.external_reference,
        items: preferenceData.items
      }, null, 2))

      const result = await this.preference.create({ body: preferenceData })
      let paymentRecordPersisted: { id: string; preferenceId: string; status: string } | null = null
      const responseBase = {
        id: result.id,
        init_point: this.isTestMode ? result.sandbox_init_point : result.init_point,
        sandbox_init_point: result.sandbox_init_point,
        total_amount: totalAmount,
        payment_method: data.paymentMethod
      }

      console.log('Preferência criada com sucesso:', {
        id: responseBase.id,
        init_point: responseBase.init_point,
        isTestMode: this.isTestMode,
        payment_method: responseBase.payment_method
      })

      // Persistir Payment (preference)
      try {
        const prefIdStr = String(responseBase.id)
        const mappedStatus = this.mapMpStatus(undefined) // sempre inicia como pending
        paymentRecordPersisted = await prisma.payment.upsert({
          where: { preferenceId: prefIdStr },
          create: {
            preferenceId: prefIdStr,
            externalReference: data.orderNumber,
            status: mappedStatus,
            amount: totalAmount,
            type: data.paymentMethod === 'pix' ? 'PIX' : 'CHECKOUT_PRO',
            businessId: data.businessId,
            metadata: {
              source: 'checkout_preference',
              payment_method: data.paymentMethod
            }
          },
          update: {
            amount: totalAmount,
            metadata: {
              source: 'checkout_preference_update',
              payment_method: data.paymentMethod
            }
          }
        })
        console.log('Registro Payment upsert Preference:', { id: paymentRecordPersisted.id, preferenceId: paymentRecordPersisted.preferenceId })
      } catch (persistErr) {
        console.error('Falha ao persistir Payment Preference:', persistErr)
      }

      return { ...responseBase, payment: paymentRecordPersisted }
    } catch (error) {
      console.error('Erro ao criar preferência Checkout Pro:', error)
      throw new Error('Erro ao processar pagamento')
    }
  }

  /**
   * Obter preferência de pagamento
   */
  async getPreference(preferenceId: string) {
    try {
      const result = await this.preference.get({ preferenceId })
      return result
    } catch (error) {
      console.error('Erro ao buscar preferência:', error)
      throw new Error('Erro ao buscar informações da preferência')
    }
  }

  /**
   * Configurar métodos de pagamento baseado na escolha do usuário
   */
  private getPaymentMethodsConfig(paymentMethod: string) {
    switch (paymentMethod) {
      case 'pix':
        // Para PIX, excluir TODOS os outros métodos para forçar apenas PIX
        return {
          excluded_payment_methods: [
            { id: 'visa' },
            { id: 'master' },
            { id: 'amex' },
            { id: 'naranja' },
            { id: 'cabal' },
            { id: 'debvisa' },
            { id: 'debmaster' }
          ],
          excluded_payment_types: [
            { id: 'credit_card' },
            { id: 'debit_card' },
            { id: 'ticket' },
            { id: 'atm' },
            { id: 'prepaid_card' },
            { id: 'digital_currency' },
            { id: 'digital_wallet' }
          ],
          installments: 1
        }
      
      case 'credit_card':
        return {
          excluded_payment_methods: [],
          excluded_payment_types: [
            { id: 'pix' },
            { id: 'ticket' },
            { id: 'atm' },
            { id: 'debit_card' }
          ],
          installments: 12
        }

      case 'debit_card':
        return {
          excluded_payment_methods: [],
          excluded_payment_types: [
            { id: 'pix' },
            { id: 'ticket' },
            { id: 'atm' },
            { id: 'credit_card' }
          ],
          installments: 1
        }

      default:
        // Permitir todos os métodos se não especificado
        return {
          excluded_payment_methods: [],
          excluded_payment_types: [
            { id: 'ticket' } // Remover apenas boleto por padrão
          ],
          installments: 12
        }
    }
  }

  /**
   * Verificar se deve configurar notification_url
   * No desenvolvimento local, só funciona com HTTPS (ngrok)
   */
  private shouldSetNotificationUrl(): boolean {
    const baseUrl = process.env.NGROK_URL || process.env.NEXT_PUBLIC_APP_URL || ''
    return baseUrl.startsWith('https://') || process.env.NODE_ENV === 'production'
  }

  private getBaseUrl(): string {
    return getAppUrl()
  }

  // Mapear status do Mercado Pago para status interno PaymentStatus
  private mapMpStatus(status?: string, detail?: string): 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' {
    return normalizeMercadoPagoStatus(status, detail).paymentStatus
  }

  /**
   * Criar reembolso total para um pagamento
   */
  async createRefund(paymentId: string, amount?: number) {
    try {
      console.log('Criando reembolso:', { paymentId, amount })
      
      // Criar PaymentRefund usando o SDK do MercadoPago
      const { PaymentRefund } = await import('mercadopago')
      const refund = new PaymentRefund(this.paymentClient)
      
      const refundRequest: {
        payment_id: string
        body?: { amount: number }
      } = {
        payment_id: paymentId,
      }
      
      // Se amount for especificado, é reembolso parcial
      if (amount) {
        refundRequest.body = { amount: Number(amount.toFixed(2)) }
      }
      
      const result = await refund.create(refundRequest)
      console.log('Reembolso criado:', { id: result.id, status: result.status, amount: result.amount })
      
      return {
        id: result.id,
        status: result.status,
        amount: result.amount,
        payment_id: result.payment_id,
        date_created: result.date_created
      }
    } catch (error) {
      console.error('Erro ao criar reembolso:', error)
      throw error
    }
  }

  /**
   * Buscar reembolsos de um pagamento
   */
  async getRefunds(paymentId: string) {
    try {
      const { PaymentRefund } = await import('mercadopago')
      const refund = new PaymentRefund(this.paymentClient)
      
      const result = await refund.list({ payment_id: paymentId })
      return result
    } catch (error) {
      console.error('Erro ao buscar reembolsos:', error)
      throw error
    }
  }

  /**
   * Buscar um reembolso específico
   */
  async getRefund(paymentId: string, refundId: string) {
    try {
      const { PaymentRefund } = await import('mercadopago')
      const refund = new PaymentRefund(this.paymentClient)
      
      const result = await refund.get({ 
        payment_id: paymentId, 
        refund_id: refundId 
      })
      return result
    } catch (error) {
      console.error('Erro ao buscar reembolso específico:', error)
      throw error
    }
  }
}

/**
 * Factory function para criar instância do MercadoPagoService
 */
export async function createMercadoPagoService(businessId: string): Promise<MercadoPagoService> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      mercadoPagoAccessToken: true,
      mercadoPagoConfigured: true
    }
  })

  if (!business || !business.mercadoPagoConfigured || !business.mercadoPagoAccessToken) {
    throw new Error('Mercado Pago não configurado para este negócio')
  }

  // Se houver refresh token e o token estiver expirado (campo mercadoPagoExpiresAt), tentar renovar
  const businessFull = await prisma.business.findUnique({ where: { id: businessId }, select: { mercadoPagoAccessToken: true, mercadoPagoRefreshToken: true, mercadoPagoExpiresAt: true, mercadoPagoConfigured: true } })

  let accessTokenToUse = businessFull?.mercadoPagoAccessToken || ''

  try {
    const expiresAt = businessFull?.mercadoPagoExpiresAt
    const now = new Date()
    const willExpireSoon = expiresAt ? (new Date(expiresAt).getTime() - now.getTime()) < (5 * 60 * 1000) : false // 5 minutos

    if (willExpireSoon && businessFull?.mercadoPagoRefreshToken) {
      // Tentar refresh
      const res = await fetch('https://api.mercadopago.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.MERCADOPAGO_CLIENT_ID || '',
          client_secret: process.env.MERCADOPAGO_CLIENT_SECRET || '',
          grant_type: 'refresh_token',
          refresh_token: businessFull.mercadoPagoRefreshToken || ''
        })
      })

      if (res.ok) {
        const json = await res.json()
        const expiresIn = json.expires_in ? parseInt(String(json.expires_in), 10) : undefined
        const expiresAtNew = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null

        // Persistir novos tokens
        await prisma.business.update({
          where: { id: businessId },
          data: {
            mercadoPagoAccessToken: json.access_token || null,
            mercadoPagoRefreshToken: json.refresh_token || null,
            mercadoPagoPublicKey: json.public_key || null,
            mercadoPagoExpiresAt: expiresAtNew || null,
            mercadoPagoConfigured: true
          }
        })

        accessTokenToUse = json.access_token || accessTokenToUse
      } else {
        console.warn('Falha no refresh token Mercado Pago ao criar serviço')
      }
    }
  } catch (err) {
    console.warn('Erro ao tentar refresh automático do token Mercado Pago', err)
  }

  // Criar o serviço passando as credenciais do negócio
  return new MercadoPagoService(accessTokenToUse)
}

/**
 * Validar credenciais do Mercado Pago
 */
export async function validateMercadoPagoCredentials(accessToken: string, _publicKey: string): Promise<boolean> {
  try {
    // Criar cliente temporário para validar as credenciais
    const client = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 10000 }
    })

    // Tentar fazer uma requisição simples para testar as credenciais
    const preference = new Preference(client)
    
    // Criar uma preferência de teste simples para validar
    const testPreferenceData = {
      items: [
        {
          id: 'test-item',
          title: 'Test Item - Validation',
          description: 'Item de teste para validação de credenciais',
          quantity: 1,
          unit_price: 1.00,
          currency_id: 'BRL'
        }
      ],
      payer: {
        email: 'test@test.com'
      },
      back_urls: {
        success: 'https://example.com/success',
        failure: 'https://example.com/failure',
        pending: 'https://example.com/pending'
      },
      auto_return: 'approved',
      external_reference: 'test-validation-' + Date.now()
    }

    // Tentar criar a preferência
    const result = await preference.create({ body: testPreferenceData })
    
    // Se chegou até aqui, as credenciais são válidas
    console.log('Credenciais validadas com sucesso:', {
      preferenceId: result.id,
      tokenType: accessToken.substring(0, 10) + '...',
      isTestMode: accessToken.startsWith('TEST-')
    })

    return true
  } catch (error: unknown) {
    console.error('Erro ao validar credenciais:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStatus = (error as { status?: number })?.status
    
    // Verificar tipos específicos de erro
    if (errorMessage?.includes('Invalid access token') || 
        errorMessage?.includes('401') || 
        errorStatus === 401) {
      console.error('Access token inválido')
      return false
    }
    
    if (errorMessage?.includes('Invalid credentials') || 
        errorStatus === 403) {
      console.error('Credenciais inválidas')
      return false
    }

    // Para outros erros, assumimos que as credenciais podem estar corretas
    // mas há algum problema temporário
    console.warn('Erro na validação - assumindo credenciais válidas:', errorMessage)
    return true
  }
}
