import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'

interface CardPaymentRequest {
  formData: {
    transaction_amount: number
    token: string
    payment_method_id: string
    installments: number
    payer: {
      email: string
      identification: {
        type: string
        number: string
      }
    }
  }
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
  customerInfo: {
    name: string
    email: string
    phone: string
  }
  selectedAddress: {
    street: string
    number: string
    neighborhood: string
    city: string
    state: string
    cep: string
  }
  businessId: string
  totalAmount: number
}

export async function POST(request: NextRequest) {
  try {
    const body: CardPaymentRequest = await request.json()
    const { formData, items, customerInfo, selectedAddress, businessId } = body

    // Configurar cliente do Mercado Pago
    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
      options: { timeout: 10000 }
    })

    const payment = new Payment(client)
    
    // Gerar número do pedido único
    const orderNumber = `ORD-${Date.now()}`

    // Dados do pagamento
    const paymentData = {
      transaction_amount: formData.transaction_amount,
      token: formData.token,
      payment_method_id: formData.payment_method_id,
      installments: formData.installments,
      payer: {
        email: formData.payer.email,
        identification: formData.payer.identification,
        first_name: customerInfo.name.split(' ')[0] || '',
        last_name: customerInfo.name.split(' ').slice(1).join(' ') || 'Cliente'
      },
      external_reference: orderNumber,
      description: `Pedido FastLivery - ${orderNumber}`,
      metadata: {
        business_id: businessId,
        order_number: orderNumber,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_email: customerInfo.email,
        delivery_address: JSON.stringify(selectedAddress),
        items: JSON.stringify(items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })))
      }
    }

    // Processar pagamento
    const result = await payment.create({ body: paymentData })

    console.log('Pagamento com cartão processado:', {
      id: result.id,
      status: result.status,
      orderNumber
    })

    // Retornar resultado
    return NextResponse.json({
      success: true,
      payment: {
        id: result.id,
        status: result.status,
        status_detail: result.status_detail,
        external_reference: orderNumber,
        transaction_amount: result.transaction_amount,
        payment_method_id: result.payment_method_id,
        installments: result.installments
      }
    })

  } catch (error) {
    console.error('Erro ao processar pagamento com cartão:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao processar pagamento com cartão'
    }, { status: 500 })
  }
}
