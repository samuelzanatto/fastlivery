import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createMercadoPagoService } from '@/lib/mercadopago'

/**
 * Cria uma preference do Mercado Pago para uso com Payment Brick (wallet / parcelas especiais) ou Checkout Pro fallback.
 * POST /api/payments/mercadopago/preference
 * Body esperado:
 * {
 *   restaurantSlug: string,
 *   items: [{ id,name,price,quantity }],
 *   customer: { name, email, phone },
 *   externalReference?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { restaurantSlug, items, customer, externalReference } = body || {}

    if (!restaurantSlug) return NextResponse.json({ error: 'restaurantSlug ausente' }, { status: 400 })
    if (!Array.isArray(items) || !items.length) return NextResponse.json({ error: 'items vazio' }, { status: 400 })
    if (!customer?.email) return NextResponse.json({ error: 'customer.email ausente' }, { status: 400 })

    const restaurant = await prisma.restaurant.findFirst({
      where: { slug: restaurantSlug },
      select: { id: true, name: true, mercadoPagoAccessToken: true, mercadoPagoConfigured: true, isActive: true, deliveryFee: true }
    })

    if (!restaurant) return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 })
    if (!restaurant.isActive) return NextResponse.json({ error: 'Restaurante inativo' }, { status: 400 })
    if (!restaurant.mercadoPagoConfigured || !restaurant.mercadoPagoAccessToken) {
      return NextResponse.json({ error: 'Mercado Pago não configurado' }, { status: 400 })
    }

    const service = await createMercadoPagoService(restaurant.id)

    // Normalizar itens conforme serviço atual
    interface ReqItem { id: string; name: string; price: number; quantity: number; description?: string }
    const cartItems = (items as ReqItem[]).map((it) => ({
      id: it.id,
      name: it.name,
      description: it.description ? String(it.description) : '', // garantir sempre string
      price: it.price,
      quantity: it.quantity
    }))

    const subtotal = cartItems.reduce((acc, it) => acc + it.price * it.quantity, 0)
    const deliveryFee = restaurant.deliveryFee || 0
    const total = subtotal + deliveryFee

    const orderNumber = externalReference || `PREF-${Date.now()}-${Math.random().toString(36).slice(2,8)}`

    const preferencePayload = {
      items: cartItems,
      customerInfo: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone
      },
      paymentMethod: 'credit_card' as const,
      restaurantId: restaurant.id,
      orderNumber
    }

    const pref = await service.createPaymentPreference(preferencePayload)

    return NextResponse.json({
      preference_id: pref.id,
      init_point: pref.init_point,
      sandbox_init_point: pref.sandbox_init_point,
      total_amount: pref.total_amount ?? total,
      payment_method: pref.payment_method,
      order_number: orderNumber
    })
  } catch (e) {
    console.error('Erro criar preference MP:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
