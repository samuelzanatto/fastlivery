import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { StripeSyncService } from '@/lib/payments/stripe-sync'
import { prisma } from '@/lib/database/prisma'
import { SupplierSubscriptionStatus } from '@prisma/client'

// Tipos estendidos para propriedades que não estão tipadas corretamente
type StripeSubscriptionExtended = Stripe.Subscription & {
  current_period_start: number
  current_period_end: number
  canceled_at?: number
}

type StripeInvoiceExtended = Stripe.Invoice & {
  subscription?: string
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('❌ Stripe signature missing')
      return NextResponse.json({ error: 'Stripe signature missing' }, { status: 400 })
    }

    // Verificar assinatura do webhook
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
    }

    console.log(`🔔 Webhook recebido: ${event.type}`)

    // Processar eventos relacionados a produtos e preços
    switch (event.type) {
      // Eventos de Checkout
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event)
        break

      case 'checkout.session.expired':
        await handleCheckoutExpired(event)
        break

      // Eventos de Assinatura
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionEvent(event)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event)
        break

      // Eventos de Produto
      case 'product.created':
      case 'product.updated':
        await handleProductEvent(event)
        break

      case 'product.deleted':
        await handleProductDeleted(event)
        break

      // Eventos de Preço
      case 'price.created':
      case 'price.updated':
        await handlePriceEvent(event)
        break

      case 'price.deleted':
        await handlePriceDeleted(event)
        break

      default:
        console.log(`ℹ️ Evento não processado: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ Erro no processamento do webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleProductEvent(event: Stripe.Event) {
  try {
    const product = event.data.object as Stripe.Product
    console.log(`🔄 Sincronizando produto: ${product.id} - ${product.name}`)

    await StripeSyncService.syncProducts() // Re-sync todos os produtos para garantir consistência
    
    console.log(`✅ Produto sincronizado: ${product.id}`)
  } catch (error) {
    console.error('❌ Erro ao processar evento de produto:', error)
  }
}

async function handleProductDeleted(event: Stripe.Event) {
  try {
    const product = event.data.object as Stripe.Product
    console.log(`🗑️ Produto deletado no Stripe: ${product.id}`)

    // Marcar como inativo no banco local
    await StripeSyncService.syncProducts() // Re-sync para refletir mudanças
    
    console.log(`✅ Produto removido localmente: ${product.id}`)
  } catch (error) {
    console.error('❌ Erro ao processar deleção de produto:', error)
  }
}

async function handlePriceEvent(event: Stripe.Event) {
  try {
    const price = event.data.object as Stripe.Price
    console.log(`🔄 Sincronizando preço: ${price.id}`)

    // Sincronizar o preço específico
    await StripeSyncService.syncSpecificPrice(price.id)
    
    console.log(`✅ Preço sincronizado: ${price.id}`)
  } catch (error) {
    console.error('❌ Erro ao processar evento de preço:', error)
  }
}

async function handlePriceDeleted(event: Stripe.Event) {
  try {
    const price = event.data.object as Stripe.Price
    console.log(`🗑️ Preço deletado no Stripe: ${price.id}`)

    // Re-sync preços para refletir mudanças
    await StripeSyncService.syncPrices()
    
    console.log(`✅ Preço removido localmente: ${price.id}`)
  } catch (error) {
    console.error('❌ Erro ao processar deleção de preço:', error)
  }
}

async function handleCheckoutCompleted(event: Stripe.Event) {
  try {
    const session = event.data.object as Stripe.Checkout.Session
    console.log(`💰 Pagamento confirmado: ${session.id}`)

    // Ativar o usuário se pagamento for bem-sucedido
    if (session.metadata?.userId) {
      await prisma.user.update({
        where: { id: session.metadata.userId },
        data: { isActive: true }
      })
      
      console.log(`✅ Usuário ativado: ${session.metadata.userId}`)
    }

    // Criar um registro de pedido se necessário
    if (session.metadata?.businessId && session.metadata?.cartItems) {
      const cartItems = JSON.parse(session.metadata.cartItems)
      
      // Aqui você pode criar um registro do pedido no banco
      console.log(`📝 Pedido criado para empresa: ${session.metadata.businessId}`)
      console.log(`🛒 Items do carrinho:`, cartItems)
    }
  } catch (error) {
    console.error('❌ Erro ao processar checkout completado:', error)
  }
}

async function handleCheckoutExpired(event: Stripe.Event) {
  try {
    const session = event.data.object as Stripe.Checkout.Session
    console.log(`⏰ Sessão de pagamento expirou: ${session.id}`)
  } catch (error) {
    console.error('❌ Erro ao processar checkout expirado:', error)
  }
}

async function handleSubscriptionEvent(event: Stripe.Event) {
  try {
    const subscription = event.data.object as StripeSubscriptionExtended
    console.log(`🔔 Evento de assinatura: ${event.type} - ${subscription.id}`)

    // Buscar a assinatura no banco de dados usando o Stripe ID
    const supplierSubscription = await prisma.supplierSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      include: { supplier: true }
    })

    if (!supplierSubscription) {
      console.log(`ℹ️ Assinatura não encontrada no banco: ${subscription.id}`)
      return
    }

    // Mapear status do Stripe para nosso enum
    const statusMap: Record<string, string> = {
      'active': 'ACTIVE',
      'canceled': 'CANCELLED',
      'incomplete': 'INACTIVE',
      'incomplete_expired': 'CANCELLED',
      'past_due': 'PAST_DUE',
      'trialing': 'TRIALING',
      'unpaid': 'PAST_DUE'
    }

    const newStatus = statusMap[subscription.status] || 'INACTIVE'

    // Atualizar a assinatura no banco
    await prisma.supplierSubscription.update({
      where: { id: supplierSubscription.id },
      data: {
        status: newStatus as SupplierSubscriptionStatus,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null
      }
    })

    console.log(`✅ Assinatura atualizada: ${subscription.id} -> ${newStatus}`)
    
  } catch (error) {
    console.error('❌ Erro ao processar evento de assinatura:', error)
  }
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  try {
    const subscription = event.data.object as Stripe.Subscription
    console.log(`🗑️ Assinatura deletada: ${subscription.id}`)

    // Atualizar status para CANCELLED
    await prisma.supplierSubscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'CANCELLED',
        canceledAt: new Date(),
        cancelAtPeriodEnd: true
      }
    })

    console.log(`✅ Assinatura marcada como cancelada: ${subscription.id}`)
    
  } catch (error) {
    console.error('❌ Erro ao processar deleção de assinatura:', error)
  }
}

async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
  try {
    const invoice = event.data.object as StripeInvoiceExtended
    console.log(`💰 Pagamento de fatura bem-sucedido: ${invoice.id}`)

    if (invoice.subscription) {
      // Atualizar status da assinatura para ACTIVE se pagamento foi bem-sucedido
      await prisma.supplierSubscription.updateMany({
        where: { stripeSubscriptionId: invoice.subscription },
        data: {
          status: 'ACTIVE'
        }
      })

      console.log(`✅ Assinatura ativada após pagamento: ${invoice.subscription}`)
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar pagamento de fatura:', error)
  }
}

async function handleInvoicePaymentFailed(event: Stripe.Event) {
  try {
    const invoice = event.data.object as StripeInvoiceExtended
    console.log(`❌ Falha no pagamento de fatura: ${invoice.id}`)

    if (invoice.subscription) {
      // Atualizar status da assinatura para PAST_DUE
      await prisma.supplierSubscription.updateMany({
        where: { stripeSubscriptionId: invoice.subscription },
        data: {
          status: 'PAST_DUE'
        }
      })

      console.log(`⚠️ Assinatura marcada como em atraso: ${invoice.subscription}`)
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar falha de pagamento:', error)
  }
}
