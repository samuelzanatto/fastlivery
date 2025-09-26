'use server'

import { prisma } from '@/lib/database/prisma'
import { revalidatePath } from 'next/cache'
import {
  ActionResult,
  createSuccessResult,
  handleActionError
} from '@/lib/actions/auth-helpers'
import { createMercadoPagoService } from '@/lib/payments/mercadopago'
import { validateId } from '@/lib/actions/validation-helpers'

export interface PaymentStatusResponse {
  order: {
    id: string
    orderNumber: string
    status: string
    paymentStatus: string | null
  }
  payment: {
    id: string
    gatewayId: string
    status: string
    type: string
  } | null
}

export interface CreatePaymentInput {
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
  customerInfo: {
    name: string
    phone: string
    email: string
  }
  selectedAddress?: unknown
  businessSlug: string
  paymentMethod: 'pix' | 'credit_card' | 'debit_card'
  formData?: {
    token?: string
    payment_method_id?: string
    installments?: number
    identification?: {
      type: string
      number: string
    }
  }
}

export interface PaymentResult {
  type: 'pix_payment' | 'card_payment' | 'checkout_pro'
  payment_id?: string | number
  preference_id?: string
  status?: string
  status_detail?: string
  qr_code?: string
  qr_code_base64?: string
  ticket_url?: string
  init_point?: string
  sandbox_init_point?: string
  total_amount?: number
  order_id: string
  order_number: string
  fallback?: string
}

/**
 * Verificar status de pagamento por orderNumber
 */
export async function getPaymentStatus(orderNumber: string): Promise<ActionResult<PaymentStatusResponse>> {
  try {
    const validatedOrderNumber = validateId(orderNumber, 'Número do pedido')

    const order = await prisma.order.findUnique({
      where: { orderNumber: validatedOrderNumber },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        stripeSessionId: true,
        businessId: true,
        payments: { 
          select: { 
            id: true, 
            preferenceId: true, 
            status: true, 
            createdAt: true, 
            type: true 
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!order) {
      return {
        success: false,
        error: 'Pedido não encontrado',
        code: 'ORDER_NOT_FOUND'
      }
    }

    // Selecionar último pagamento (por createdAt)
    const lastPayment = order.payments[0]

    const result: PaymentStatusResponse = {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus
      },
      payment: lastPayment ? {
        id: lastPayment.id,
        gatewayId: lastPayment.preferenceId,
        status: lastPayment.status,
        type: lastPayment.type
      } : null
    }

    return createSuccessResult(result)
  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Criar pagamento com MercadoPago
 */
export async function createPayment(input: CreatePaymentInput): Promise<ActionResult<PaymentResult>> {
  try {
    const { items, customerInfo, selectedAddress, businessSlug, paymentMethod, formData } = input

    if (!items.length || !customerInfo?.email || !businessSlug) {
      return {
        success: false,
        error: 'Dados incompletos para pagamento: itens, email ou negócio ausentes',
        code: 'INCOMPLETE_PAYMENT_DATA'
      }
    }

    // Buscar negócio via slug
    const business = await prisma.business.findFirst({
      where: { slug: businessSlug },
      select: { 
        id: true, 
        name: true, 
        mercadoPagoAccessToken: true, 
        mercadoPagoConfigured: true, 
        isActive: true, 
        deliveryFee: true 
      }
    })

    if (!business) {
      return {
        success: false,
        error: 'Negócio não encontrado',
        code: 'BUSINESS_NOT_FOUND'
      }
    }

    if (!business.isActive) {
      return {
        success: false,
        error: 'Negócio inativo',
        code: 'BUSINESS_INACTIVE'
      }
    }

    if (!business.mercadoPagoConfigured || !business.mercadoPagoAccessToken) {
      return {
        success: false,
        error: 'Mercado Pago não configurado',
        code: 'MERCADOPAGO_NOT_CONFIGURED'
      }
    }

    const mercadoPagoService = await createMercadoPagoService(business.id)

    // Calcular subtotal
    const deliveryFee = business.deliveryFee || 0
    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    const finalTotal = subtotal + deliveryFee

    // Criar orderNumber
    const orderNumber = `MPBRICK-${Date.now()}-${Math.random().toString(36).slice(2,8)}`

    // Criar pedido preliminar
    const order = await prisma.order.create({
      data: {
        businessId: business.id,
        orderNumber,
        type: 'DELIVERY', // assumindo delivery
        status: 'PENDING',
        total: finalTotal,
        subtotal,
        deliveryFee,
        customerName: customerInfo.name || 'Cliente',
        customerPhone: customerInfo.phone || '',
        customerEmail: customerInfo.email,
        paymentMethod: paymentMethod === 'pix' ? 'PIX' : 'CREDIT_CARD',
        items: {
          create: items.map(item => ({
            productId: item.id || 'temp-product-id',
            quantity: item.quantity,
            price: item.price,
            notes: item.name
          }))
        },
        notes: selectedAddress ? JSON.stringify({ address: selectedAddress }) : undefined
      }
    })

    // Criar registro Payment inicial
    const existingPayment = await prisma.payment.findUnique({ 
      where: { preferenceId: order.orderNumber } 
    })
    
    if (!existingPayment) {
      await prisma.payment.create({
        data: {
          preferenceId: order.orderNumber,
          externalReference: order.orderNumber,
          status: 'PENDING',
          amount: finalTotal,
          type: paymentMethod === 'pix' ? 'PIX' : 'CARD',
          businessId: business.id,
          orderId: order.id,
          metadata: { bootstrap: true, source: 'payment_brick_create' }
        }
      })
    }

    // Preparar dados do pagamento
    const cartItems = items.map(item => ({
      id: item.id,
      name: item.name,
      description: '',
      price: item.price,
      quantity: item.quantity
    }))

    const paymentData = {
      items: cartItems,
      customerInfo: {
        name: customerInfo.name,
        phone: customerInfo.phone,
        email: customerInfo.email
      },
      paymentMethod: paymentMethod === 'pix' ? 'pix' as const : 'credit_card' as const,
      businessId: business.id,
      orderNumber
    }

    // Processar pagamento baseado no método
    if (paymentMethod === 'pix') {
      try {
        const pix = await mercadoPagoService.createPixPayment(paymentData)
        
        await prisma.$transaction(async tx => {
          await tx.order.update({ 
            where: { id: order.id }, 
            data: { stripeSessionId: String(pix.id) } 
          })
          
          // Atualizar ou criar payment com ID do PIX
          await tx.payment.upsert({
            where: { preferenceId: String(pix.id) },
            update: {
              orderId: order.id,
              businessId: business.id,
              externalReference: order.orderNumber
            },
            create: {
              preferenceId: String(pix.id),
              externalReference: order.orderNumber,
              status: 'PENDING',
              amount: finalTotal,
              type: 'PIX',
              businessId: business.id,
              orderId: order.id,
              metadata: { source: 'pix_create' }
            }
          })
        })

        revalidatePath('/orders')

        return createSuccessResult({
          type: 'pix_payment' as const,
          payment_id: pix.id,
          status: pix.status,
          qr_code: pix.qr_code,
          qr_code_base64: pix.qr_code_base64,
          ticket_url: pix.ticket_url,
          total_amount: pix.total_amount,
          order_id: order.id,
          order_number: order.orderNumber
        })
      } catch (error) {
        console.error('Erro PIX Payment:', error)
        return {
          success: false,
          error: 'Falha ao criar PIX',
          code: 'PIX_CREATION_FAILED'
        }
      }
    }

    // Pagamento com cartão
    const token = formData?.token
    const payment_method_id = formData?.payment_method_id
    const installments = formData?.installments || 1
    const identification = formData?.identification || { type: 'CPF', number: '11144477735' }

    if (token && payment_method_id) {
      try {
        const cardResult = await mercadoPagoService.createCardPayment({
          ...paymentData,
          token,
          payment_method_id,
          installments,
          identification
        })

        const providerId = String(cardResult.id)
        const mpStatus = String(cardResult.status || '').toLowerCase()
        let paymentStatusEnum: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' = 'PENDING'
        
        if (mpStatus === 'approved') paymentStatusEnum = 'APPROVED'
        else if (mpStatus === 'rejected') paymentStatusEnum = 'REJECTED'
        else if (mpStatus === 'cancelled') paymentStatusEnum = 'CANCELLED'

        await prisma.$transaction(async tx => {
          await tx.order.update({
            where: { id: order.id },
            data: {
              stripeSessionId: providerId,
              paymentStatus: paymentStatusEnum,
              status: paymentStatusEnum === 'APPROVED' ? 'CONFIRMED' : order.status
            }
          })
          
          await tx.payment.upsert({
            where: { preferenceId: providerId },
            update: {
              status: paymentStatusEnum,
              orderId: order.id,
              businessId: business.id,
              metadata: {
                mp_status: mpStatus,
                status_detail: cardResult.status_detail || null,
                source: 'card_direct'
              }
            },
            create: {
              preferenceId: providerId,
              externalReference: order.orderNumber,
              status: paymentStatusEnum,
              amount: finalTotal,
              type: 'CARD',
              businessId: business.id,
              orderId: order.id,
              metadata: {
                mp_status: mpStatus,
                status_detail: cardResult.status_detail || null,
                source: 'card_direct'
              }
            }
          })
        })

        revalidatePath('/orders')

        return createSuccessResult({
          type: 'card_payment' as const,
          payment_id: cardResult.id,
          status: cardResult.status,
          status_detail: cardResult.status_detail,
          total_amount: cardResult.total_amount,
          order_id: order.id,
          order_number: order.orderNumber
        })
      } catch (cardError) {
        console.error('Erro pagamento direto cartão:', cardError)
        // Fallback para checkout pro
      }
    }

    // Fallback: criar preferência (Checkout Pro)
    try {
      const preference = await mercadoPagoService.createPaymentPreference(paymentData)
      
      await prisma.$transaction(async tx => {
        await tx.order.update({ 
          where: { id: order.id }, 
          data: { stripeSessionId: String(preference.id) } 
        })
        
        await tx.payment.upsert({
          where: { preferenceId: String(preference.id) },
          update: {
            orderId: order.id,
            businessId: business.id,
            externalReference: order.orderNumber
          },
          create: {
            preferenceId: String(preference.id),
            externalReference: order.orderNumber,
            status: 'PENDING',
            amount: finalTotal,
            type: 'CARD',
            businessId: business.id,
            orderId: order.id,
            metadata: { source: 'checkout_pro_fallback' }
          }
        })
      })

      revalidatePath('/orders')

      return createSuccessResult({
        type: 'checkout_pro' as const,
        preference_id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
        total_amount: preference.total_amount,
        order_id: order.id,
        order_number: order.orderNumber,
        fallback: token ? 'direct_card_failed' : 'missing_token'
      })
    } catch (error) {
      console.error('Erro Preference Payment:', error)
      return {
        success: false,
        error: 'Falha ao iniciar pagamento',
        code: 'PAYMENT_CREATION_FAILED'
      }
    }
  } catch (error) {
    return handleActionError(error)
  }
}