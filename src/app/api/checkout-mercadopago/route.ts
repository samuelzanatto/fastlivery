import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import { createMercadoPagoService, CartItem, CustomerInfo } from '@/lib/payments/mercadopago'

export async function POST(request: NextRequest) {
  try {
    const { 
      items, 
      customerInfo, 
      _addressInfo,
      paymentMethod,
      businessSlug,
      _amount,
      _formData
    }: {
      items: CartItem[]
      customerInfo: CustomerInfo
      _addressInfo?: unknown
      paymentMethod: 'pix' | 'credit_card' | 'debit_card'
      businessSlug: string
      _amount?: number
      _formData?: unknown
    } = await request.json()

    console.log('Dados recebidos no checkout Mercado Pago:', {
      itemsCount: items.length,
      paymentMethod,
      businessSlug,
      customerEmail: customerInfo.email
    })

    // Validar dados obrigatórios
    if (!items || !customerInfo || !paymentMethod || !businessSlug) {
      return NextResponse.json(
        { error: 'Dados obrigatórios: items, customerInfo, paymentMethod, businessSlug' },
        { status: 400 }
      )
    }

    // Buscar informações da empresa pelo slug
    const business = await prisma.business.findFirst({
      where: { slug: businessSlug },
      select: { 
        id: true, 
        name: true, 
        deliveryFee: true,
        mercadoPagoConfigured: true,
        mercadoPagoAccessToken: true,
        mercadoPagoPublicKey: true,
        isActive: true
      }
    })

    if (!business) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    if (!business.isActive) {
      return NextResponse.json({ error: 'Empresa inativa' }, { status: 400 })
    }

    if (!business.mercadoPagoConfigured || !business.mercadoPagoAccessToken) {
      return NextResponse.json({ 
        error: 'Mercado Pago não configurado para esta empresa' 
      }, { status: 400 })
    }

    // Criar instância do serviço Mercado Pago usando credenciais da empresa
    let mercadoPagoService
    try {
      mercadoPagoService = await createMercadoPagoService(business.id)
    } catch (error) {
      console.error('Erro ao criar serviço Mercado Pago:', error)
      return NextResponse.json({ 
        error: 'Erro na configuração do Mercado Pago' 
      }, { status: 400 })
    }

    // Calcular valores
    const subtotal = items.reduce((acc: number, item: CartItem) => acc + (item.price * item.quantity), 0)
    const deliveryFee = business.deliveryFee || 0
    const finalTotal = subtotal + deliveryFee

    // Gerar número único do pedido
    const orderNumber = `MP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    try {
          // Criar pedido no banco de dados
    const order = await prisma.order.create({
      data: {
        businessId: business.id,
        orderNumber: orderNumber,
        type: 'DELIVERY', // Assumindo delivery como padrão
        status: 'PENDING',
        total: finalTotal,
        subtotal: subtotal,
        deliveryFee: business.deliveryFee || 0,
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerEmail: customerInfo.email,
        paymentMethod: paymentMethod === 'pix' ? 'PIX' : 'CREDIT_CARD',
        items: {
          create: items.map((item: CartItem) => ({
            productId: item.id || 'temp-product-id', // Usar o ID do item ou temporário
            quantity: item.quantity,
            price: item.price,
            notes: item.name, // Colocar o nome no campo notes temporariamente
          }))
        }
      }
    })

      console.log('Pedido criado:', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: order.total
      })

      const paymentData = {
        items,
        customerInfo,
        paymentMethod,
        businessId: business.id,
        orderNumber: order.orderNumber
      }

      if (paymentMethod === 'pix') {
        try {
          // Para PIX, tentar modo transparente primeiro (retorna QR Code direto)
          const pixPayment = await mercadoPagoService.createPixPayment(paymentData)
          
          // PIX transparente funcionou - retornar QR Code
          await prisma.order.update({
            where: { id: order.id },
            data: {
              stripeSessionId: pixPayment.id?.toString() // Reutilizando campo para MP payment ID
            }
          })

          // Vincular Payment.orderId se payment retornado
          if (pixPayment.payment?.preferenceId) {
            await prisma.payment.update({
              where: { preferenceId: pixPayment.payment.preferenceId },
              data: { orderId: order.id }
            }).catch(() => {})
          }

          return NextResponse.json({
            type: 'pix_payment',
            payment_id: pixPayment.id,
            status: pixPayment.status,
            qr_code: pixPayment.qr_code,
            qr_code_base64: pixPayment.qr_code_base64,
            ticket_url: pixPayment.ticket_url,
            total_amount: pixPayment.total_amount,
            order_id: order.id,
            order_number: order.orderNumber,
            payment: pixPayment.payment || null
          })
        } catch (pixError) {
          // Se PIX transparente falhou por credenciais, usar Checkout Pro
          const errorMessage = pixError instanceof Error ? pixError.message : String(pixError)
          
          if (errorMessage.includes('CREDENTIALS_NOT_SUPPORTED_FOR_PIX')) {
            console.warn('PIX transparente não suportado. Usando Checkout Pro para PIX.')
            
            // Usar Checkout Pro como fallback
            const preference = await mercadoPagoService.createPaymentPreference(paymentData)
            
            await prisma.order.update({
              where: { id: order.id },
              data: {
                stripeSessionId: preference.id // ID da preferência do Checkout Pro
              }
            })

            if (preference.payment?.preferenceId) {
              await prisma.payment.update({
                where: { preferenceId: preference.payment.preferenceId },
                data: { orderId: order.id }
              }).catch(() => {})
            }

            return NextResponse.json({
              type: 'checkout_pro',
              preference_id: preference.id,
              init_point: preference.init_point,
              sandbox_init_point: preference.sandbox_init_point,
              total_amount: preference.total_amount,
              payment_method: preference.payment_method,
              order_id: order.id,
              order_number: order.orderNumber,
              fallback_reason: 'PIX transparente não disponível com estas credenciais',
              payment: preference.payment || null
            })
          } else {
            // Outro erro - repassar
            throw pixError
          }
        }
      } else {
        // Para cartão, usar Checkout Pro (redireciona para MP)
        const preference = await mercadoPagoService.createPaymentPreference(paymentData)
        
        // Atualizar pedido com ID da preferência
        await prisma.order.update({
          where: { id: order.id },
          data: {
            stripeSessionId: preference.id // Reutilizando campo para MP preference ID
          }
        })

        if (preference.payment?.preferenceId) {
          await prisma.payment.update({
            where: { preferenceId: preference.payment.preferenceId },
            data: { orderId: order.id }
          }).catch(() => {})
        }

        return NextResponse.json({
          type: 'checkout_pro',
          preference_id: preference.id,
          init_point: preference.init_point,
          sandbox_init_point: preference.sandbox_init_point,
          total_amount: preference.total_amount,
          payment_method: preference.payment_method,
          order_id: order.id,
          order_number: order.orderNumber,
          payment: preference.payment || null
        })
      }

    } catch (paymentError) {
      console.error('Erro ao processar pagamento:', paymentError)
      
      // Se criou o pedido mas falhou o pagamento, cancelar o pedido
      try {
        await prisma.order.update({
          where: { orderNumber },
          data: { status: 'CANCELLED' }
        })
      } catch (cancelError) {
        console.error('Erro ao cancelar pedido:', cancelError)
      }

      return NextResponse.json({ 
        error: 'Erro ao processar pagamento. Tente novamente.' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Erro no checkout Mercado Pago:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
