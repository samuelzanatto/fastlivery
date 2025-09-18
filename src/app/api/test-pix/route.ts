import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createMercadoPagoService } from '@/lib/mercadopago'

export async function POST(request: NextRequest) {
  try {
    const { restaurantSlug } = await request.json()

    if (!restaurantSlug) {
      return NextResponse.json(
        { error: 'restaurantSlug é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar restaurante
    const restaurant = await prisma.restaurant.findFirst({
      where: { slug: restaurantSlug },
      select: { 
        id: true, 
        name: true,
        mercadoPagoConfigured: true,
        mercadoPagoAccessToken: true,
        mercadoPagoPublicKey: true,
        isActive: true
      }
    })

    if (!restaurant || !restaurant.mercadoPagoConfigured || !restaurant.mercadoPagoAccessToken) {
      return NextResponse.json({ 
        error: 'Restaurante não encontrado ou Mercado Pago não configurado' 
      }, { status: 400 })
    }

    // Criar serviço Mercado Pago
    const mercadoPagoService = await createMercadoPagoService(restaurant.id)

    // Dados de teste
    const testData = {
      items: [
        {
          id: 'test-item-1',
          name: 'Hambúrguer de Teste',
          description: 'Hambúrguer de teste para validação PIX',
          price: 25.90,
          quantity: 1
        }
      ],
      customerInfo: {
        name: 'João da Silva',
        email: 'test@example.com',
        phone: '11999999999'
      },
      paymentMethod: 'pix' as const,
      restaurantId: restaurant.id,
      orderNumber: `TEST-PIX-${Date.now()}`
    }

    console.log('=== TESTE DE PIX ===')
    console.log('Restaurante:', restaurant.name)
    console.log('Dados de teste:', testData)

    // Tentar criar pagamento PIX
  const pixResult = await mercadoPagoService.createPixPayment(testData)

    console.log('=== RESULTADO DO TESTE ===')
    console.log('PIX ID:', pixResult.id)
    console.log('Status:', pixResult.status)
    console.log('QR Code length:', pixResult.qr_code?.length)
    console.log('QR Code (primeiros 100 chars):', pixResult.qr_code?.substring(0, 100))
    console.log('Has Base64:', !!pixResult.qr_code_base64)

    // Validar se o QR code parece ser um PIX válido
    const qrValidation = {
      hasQrCode: !!pixResult.qr_code,
      isValidLength: pixResult.qr_code && pixResult.qr_code.length > 100,
      startsCorrectly: pixResult.qr_code?.startsWith('00020126') || pixResult.qr_code?.startsWith('0002010'),
      hasPixKey: pixResult.qr_code?.includes('br.gov.bcb.pix'),
      hasBRCountryCode: pixResult.qr_code?.includes('5802BR'),
      hasValue: pixResult.qr_code?.includes(testData.items[0].price.toString().replace('.', ''))
    }

    console.log('=== VALIDAÇÃO QR CODE ===')
    console.log(qrValidation)

    return NextResponse.json({
      success: true,
      restaurantName: restaurant.name,
      testData,
      pixResult: {
        id: pixResult.id,
        status: pixResult.status,
        qr_code_preview: pixResult.qr_code?.substring(0, 200) + '...',
        qr_code_length: pixResult.qr_code?.length,
        has_base64: !!pixResult.qr_code_base64,
        total_amount: pixResult.total_amount,
        payment: pixResult.payment || null
      },
      validation: qrValidation
    })

  } catch (error) {
    console.error('Erro no teste PIX:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
