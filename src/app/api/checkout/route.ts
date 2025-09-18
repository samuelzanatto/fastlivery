import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

interface CartItem {
  id: string
  name: string
  description: string
  price: number
  quantity: number
  image?: string
}

interface CustomerInfo {
  name: string
  phone: string
  email: string
}

export async function POST(request: NextRequest) {
  try {
    const { 
      items, 
      customerInfo, 
      paymentMethod,
      restaurantId 
    }: {
      items: CartItem[]
      customerInfo: CustomerInfo
      paymentMethod: string
      restaurantId: string
    } = await request.json()

    console.log('Dados recebidos no checkout:', {
      itemsCount: items.length,
      items: items.map(item => ({ 
        id: item.id, 
        name: item.name, 
        image: item.image,
        imageType: typeof item.image 
      })),
      paymentMethod,
      restaurantId
    })

    // Buscar informações do restaurante
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      )
    }

    // Configurar line items para o Stripe
    const deliveryFee = 5.00
    
    // Função para validar e corrigir URLs de imagem
    const getValidImageUrl = (image?: string): string[] => {
      if (!image || typeof image !== 'string') return []
      
      try {
        // Se já é uma URL válida (começa com http/https), validar
        if (image.startsWith('http://') || image.startsWith('https://')) {
          // Tentar criar um objeto URL para validar
          new URL(image)
          return [image]
        }
        
        // Se é um caminho relativo, converter para URL absoluta
        const baseUrl = process.env.NEXTAUTH_URL || 'https://zaplivery.vercel.app'
        const fullUrl = image.startsWith('/') ? `${baseUrl}${image}` : `${baseUrl}/${image}`
        
        // Validar a URL construída
        new URL(fullUrl)
        return [fullUrl]
      } catch {
        // Se houver qualquer erro na validação, não incluir imagem
        console.warn(`URL de imagem inválida ignorada: ${image}`)
        return []
      }
    }
    
    const lineItems = items.map((item: CartItem) => {
      const validImages = getValidImageUrl(item.image)
      console.log(`Processando item ${item.name}:`, {
        originalImage: item.image,
        validImages: validImages
      })
      
      const productData: {
        name: string
        description: string
        images?: string[]
      } = {
        name: item.name,
        description: item.description || `Produto ${item.name}`,
      }
      
      // Só incluir imagens se forem válidas
      if (validImages.length > 0) {
        productData.images = validImages
      }
      
      return {
        price_data: {
          currency: 'brl',
          product_data: productData,
          unit_amount: Math.round(item.price * 100), // Converter para centavos
        },
        quantity: item.quantity,
      }
    })

    // Adicionar taxa de entrega
    lineItems.push({
      price_data: {
        currency: 'brl',
        product_data: {
          name: 'Taxa de entrega',
          description: 'Entrega do pedido',
          images: [],
        },
        unit_amount: Math.round(deliveryFee * 100),
      },
      quantity: 1,
    })

    // Configurar métodos de pagamento baseado na seleção
    let paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = []
    let paymentMethodOptions: Stripe.Checkout.SessionCreateParams.PaymentMethodOptions = {}

    switch (paymentMethod) {
      case 'pix':
        // Tentar PIX primeiro, com fallback para cartão
        paymentMethodTypes = ['card'] // Começar com cartão como seguro
        // Se PIX estiver configurado, adicionar
        try {
          // Primeiro, tentar criar com cartão + PIX para ver se PIX está disponível
          paymentMethodTypes = ['card', 'pix']
          paymentMethodOptions = {
            pix: {
              expires_after_seconds: 1800, // 30 minutos
            }
          }
        } catch {
          console.warn('PIX não disponível, usando apenas cartão')
          paymentMethodTypes = ['card']
          paymentMethodOptions = {}
        }
        break
      case 'card':
        paymentMethodTypes = ['card']
        break
      case 'money':
        // Para dinheiro, criar pedido diretamente sem Stripe
        const subtotalMoney = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
        const totalMoney = subtotalMoney + deliveryFee
        const orderNumberMoney = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        const cashOrder = await prisma.order.create({
          data: {
            orderNumber: orderNumberMoney,
            restaurantId,
            type: 'DELIVERY',
            status: 'PENDING',
            subtotal: subtotalMoney,
            deliveryFee,
            total: totalMoney,
            customerName: customerInfo.name,
            customerPhone: customerInfo.phone,
            customerEmail: customerInfo.email,
            paymentMethod: 'MONEY',
            paymentStatus: 'PENDING',
            items: {
              create: items.map((item: CartItem) => ({
                productId: item.id,
                quantity: item.quantity,
                price: item.price,
                notes: item.description
              }))
            }
          },
          include: {
            items: true
          }
        })

        console.log('Pedido em dinheiro criado:', {
          orderId: cashOrder.id,
          orderNumber: cashOrder.orderNumber,
          total: cashOrder.total
        })

        return NextResponse.json({
          type: 'cash_payment',
          message: 'Pedido confirmado para pagamento em dinheiro',
          orderId: cashOrder.id,
          orderNumber: cashOrder.orderNumber
        })
      default:
        // Fallback seguro - sempre usar cartão se não especificado
        paymentMethodTypes = ['card']
    }

    console.log('Métodos de pagamento configurados:', {
      paymentMethod,
      paymentMethodTypes,
      hasPixOptions: !!paymentMethodOptions.pix
    })

    // Função para criar sessão do Stripe com fallback
    const createStripeSession = async (
      methods: Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
      options: Stripe.Checkout.SessionCreateParams.PaymentMethodOptions
    ) => {
      return await stripe.checkout.sessions.create({
        ui_mode: 'embedded',
        payment_method_types: methods,
        line_items: lineItems,
        mode: 'payment',
        return_url: `${process.env.NEXTAUTH_URL}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        automatic_tax: { enabled: false },
        customer_creation: 'always',
        customer_email: customerInfo.email,
        payment_method_options: options,
        metadata: {
          restaurantId: restaurantId,
          customerName: customerInfo.name,
          customerPhone: customerInfo.phone,
          orderType: 'DELIVERY',
          items: JSON.stringify(items.map((item: CartItem) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price
          })))
        }
      })
    }

    // Criar sessão do Stripe Checkout com fallback
    let session: Stripe.Checkout.Session
    
    try {
      // Tentar criar com os métodos configurados
      session = await createStripeSession(paymentMethodTypes, paymentMethodOptions)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Erro ao criar sessão com métodos preferidos:', errorMessage)
      
      // Se foi erro relacionado ao PIX e estávamos tentando usar PIX, fazer fallback
      if (errorMessage.includes('pix') && paymentMethodTypes.includes('pix')) {
        console.log('Fazendo fallback para apenas cartão...')
        try {
          session = await createStripeSession(['card'], {})
        } catch (fallbackError: unknown) {
          const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
          console.error('Erro no fallback para cartão:', fallbackErrorMessage)
          throw error // Re-throw the original error
        }
      } else {
        throw error
      }
    }

    // Calcular valores do pedido
    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    const total = subtotal + deliveryFee

    // Gerar número único do pedido
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Criar pedido no banco de dados
    const order = await prisma.order.create({
      data: {
        orderNumber,
        restaurantId,
        type: 'DELIVERY',
        status: 'PENDING',
        subtotal,
        deliveryFee,
        total,
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerEmail: customerInfo.email,
        paymentMethod: paymentMethod.toUpperCase() === 'PIX' ? 'PIX' : 
                      paymentMethod.toUpperCase() === 'CARD' ? 'CREDIT_CARD' : 
                      paymentMethod.toUpperCase() === 'MONEY' ? 'MONEY' : 'STRIPE',
        paymentStatus: 'PENDING',
        stripeSessionId: session.id,
        items: {
          create: items.map((item: CartItem) => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price,
            notes: item.description
          }))
        }
      },
      include: {
        items: true
      }
    })

    console.log('Pedido criado com sucesso:', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      itemsCount: order.items.length
    })

    return NextResponse.json({
      type: 'stripe_checkout',
      clientSecret: session.client_secret,
      sessionId: session.id,
      orderId: order.id,
      orderNumber: order.orderNumber
    })

  } catch (error: unknown) {
    console.error('Erro ao criar sessão de checkout:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
