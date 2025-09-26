import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import { createMercadoPagoService } from '@/lib/payments/mercadopago'

// Helper para notificar novo pedido via WebSocket - REMOVIDO
async function notifyNewOrder(businessId: string, orderId: string) {
  // Funcionalidade WebSocket removida do projeto
  console.log(`� Notificação de novo pedido para negócio ${businessId}, pedido ${orderId} (WebSocket removido)`)
}

/**
 * Endpoint unificado para submissões do Payment Brick.
 * Suporta inicialmente:
 * - bank_transfer (PIX) -> fluxo transparente (QR Code) via createPixPayment
 * - credit_card / debit_card -> fallback temporário para Checkout Pro Preference
 *   (TODO: Implementar pagamento direto com token usando MercadoPago SDK - Payment.create com token)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Extrair dados do Payment Brick - estrutura real do componente
    const selectedPaymentMethod = body?.selectedPaymentMethod
    const brickFormData = body?.formData || {}
    const context = body?.context || {}
    
    // Dados do contexto (enviados pelo frontend)
    const _amount = context.amount || body.amount
    const items = context.items || body.items || []
    const customerInfo = context.customer || body.customerInfo || {}
    const selectedAddress = context.address || body.selectedAddress
    const businessSlug = context.businessId || body.businessId
    
    // Dados do Brick extraídos corretamente
    const paymentType = selectedPaymentMethod
    const brickToken = brickFormData.token
    const brickPaymentMethodId = brickFormData.payment_method_id
    const brickInstallments = brickFormData.installments || 1

    console.log('[API] Dados recebidos:', {
      paymentType: selectedPaymentMethod,
      selectedPaymentMethod,
      hasToken: !!brickFormData.token,
      payment_method_id: brickFormData.payment_method_id,
      installments: brickFormData.installments || 1,
      itemsCount: items.length,
      customerEmail: customerInfo?.email,
      rawPaymentBrickData: brickFormData
    })

    if (!selectedPaymentMethod) {
      return NextResponse.json({ 
        error: 'Dados incompletos para pagamento: tipo de pagamento não especificado',
        debug: { 
          selectedPaymentMethod, 
          brickFormData, 
          bodyKeys: Object.keys(body),
          contextKeys: Object.keys(context)
        }
      }, { status: 400 })
    }

    if (!items.length || !customerInfo?.email || !businessSlug) {
      return NextResponse.json({
        error: 'Dados incompletos para pagamento: itens, email ou empresa ausentes',
        debug: { itemsCount: items.length, hasEmail: !!customerInfo?.email, hasBusiness: !!businessSlug }
      }, { status: 400 })
    }

    // Buscar negócio via slug
    const business = await prisma.business.findFirst({
      where: { slug: businessSlug },
      select: { id: true, name: true, mercadoPagoAccessToken: true, mercadoPagoConfigured: true, isActive: true, deliveryFee: true }
    })

    if (!business) return NextResponse.json({ error: 'Negócio não encontrado' }, { status: 404 })
    if (!business.isActive) return NextResponse.json({ error: 'Negócio inativo' }, { status: 400 })
    if (!business.mercadoPagoConfigured || !business.mercadoPagoAccessToken) {
      return NextResponse.json({ error: 'Mercado Pago não configurado' }, { status: 400 })
    }

    const mercadoPagoService = await createMercadoPagoService(business.id)

    // Calcular subtotal (ignorar totalAmount recebido para consistência)
    const deliveryFee = business.deliveryFee || 0
  interface BrickItem { id: string; name: string; price: number; quantity: number }
  const typedItems: BrickItem[] = items as BrickItem[]
  const subtotal = typedItems.reduce((acc: number, it) => acc + (it.price * it.quantity), 0)
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
        paymentMethod: paymentType === 'bank_transfer' ? 'PIX' : 'CREDIT_CARD',
        items: {
          create: typedItems.map(it => ({
            productId: it.id || 'temp-product-id',
            quantity: it.quantity,
            price: it.price,
            notes: it.name
          }))
        },
        notes: selectedAddress ? JSON.stringify({ address: selectedAddress }) : undefined
      }
    })

    // Montar payload reutilizável
    const paymentMethod: 'pix' | 'credit_card' | 'debit_card' = paymentType === 'bank_transfer' 
      ? 'pix' 
      : 'credit_card'

    const cartItems = typedItems.map(it => ({
      id: it.id,
      name: it.name,
      description: '',
      price: it.price,
      quantity: it.quantity
    }))

    const paymentData = {
      items: cartItems,
      customerInfo: {
        name: customerInfo.name as string,
        phone: customerInfo.phone as string,
        email: customerInfo.email as string
      },
      paymentMethod,
      businessId: business.id,
      orderNumber
    }

    if (paymentType === 'bank_transfer') {
      try {
        const pix = await mercadoPagoService.createPixPayment(paymentData)
        await prisma.order.update({
          where: { id: order.id },
          data: { stripeSessionId: String(pix.id) }
        })
        
        // Notificar negócio sobre novo pedido PIX
        await notifyNewOrder(business.id, order.id)
        
        return NextResponse.json({
          type: 'pix_payment',
            payment_id: pix.id,
            status: pix.status,
            qr_code: pix.qr_code,
            qr_code_base64: pix.qr_code_base64,
            ticket_url: pix.ticket_url,
            total_amount: pix.total_amount,
            order_id: order.id,
            order_number: order.orderNumber,
            payment: pix.payment || null
        })
      } catch (err) {
        console.error('Erro PIX Payment Brick:', err)
        return NextResponse.json({ error: 'Falha ao criar PIX' }, { status: 500 })
      }
    }

    // Pagamento direto com cartão: usar dados extraídos do Brick
    const token = brickToken || body?.formData?.token || body?.formData?.cardToken || body?.formData?.tokenId
    const installments = brickInstallments || body?.formData?.installments || 1
    const payment_method_id = brickPaymentMethodId || body?.formData?.payment_method_id || body?.formData?.paymentMethodId
    const identification = brickFormData?.payer?.identification || body?.formData?.payer?.identification || { type: 'CPF', number: '11144477735' }

    if (token && payment_method_id) {
      try {
        const cardResult = await mercadoPagoService.createCardPayment({
          ...paymentData,
          token,
          payment_method_id,
          installments,
          identification
        })

        await prisma.order.update({
          where: { id: order.id },
          data: { stripeSessionId: String(cardResult.id) }
        })

        // Notificar negócio sobre novo pedido com cartão
        await notifyNewOrder(business.id, order.id)

        return NextResponse.json({
          type: 'card_payment',
          payment_id: cardResult.id,
          status: cardResult.status,
          status_detail: cardResult.status_detail,
          total_amount: cardResult.total_amount,
          order_id: order.id,
          order_number: order.orderNumber
        })
      } catch (cardErr) {
        console.error('Erro pagamento direto cartão, tentando fallback preference:', cardErr)
        // fallback preference
      }
    }

    // Fallback: criar preferência (Checkout Pro)
    try {
      const pref = await mercadoPagoService.createPaymentPreference(paymentData)
      await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: String(pref.id) } })
      
      // Notificar negócio sobre novo pedido (Checkout Pro)
      await notifyNewOrder(business.id, order.id)
      
      return NextResponse.json({
        type: 'checkout_pro',
        preference_id: pref.id,
        init_point: pref.init_point,
        sandbox_init_point: pref.sandbox_init_point,
        total_amount: pref.total_amount,
        payment_method: pref.payment_method,
        order_id: order.id,
        order_number: order.orderNumber,
        payment: pref.payment || null,
        fallback: token ? 'direct_card_failed' : 'missing_token'
      })
    } catch (err) {
      console.error('Erro Preference Payment Brick cartão:', err)
      return NextResponse.json({ error: 'Falha ao iniciar pagamento cartão' }, { status: 500 })
    }
  } catch (error) {
    console.error('Erro endpoint Payment Brick:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
