import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/database/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

const endpointSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = (await headers()).get('stripe-signature')

  let event: Stripe.Event

  try {
    if (!endpointSecret) {
      console.error('Missing STRIPE_CONNECT_WEBHOOK_SECRET environment variable')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 400 })
    }

    event = stripe.webhooks.constructEvent(body, signature!, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      // Eventos de contas conectadas
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account)
        break

      // Eventos de pagamento
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
        break

      // Eventos de transferência
      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer)
        break

      case 'transfer.updated':
        await handleTransferUpdated(event.data.object as Stripe.Transfer)
        break

      // Eventos de charge (cobrança)
      case 'charge.succeeded':
        await handleChargeSucceeded(event.data.object as Stripe.Charge)
        break

      case 'charge.failed':
        await handleChargeFailed(event.data.object as Stripe.Charge)
        break

      // Eventos de pagamento
      case 'payout.created':
        await handlePayoutCreated(event.data.object as Stripe.Payout)
        break

      case 'payout.updated':
        await handlePayoutUpdated(event.data.object as Stripe.Payout)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

/**
 * Atualiza o status da conta conectada
 */
async function handleAccountUpdated(account: Stripe.Account) {
  try {
    console.log('Processing account.updated:', account.id)

    // Busca o supplier pela conta Stripe
    const supplier = await prisma.supplier.findFirst({
      where: {
        stripeConnectAccountId: account.id,
      },
      include: {
        company: true,
      },
    })

    if (!supplier || !supplier.company) {
      console.log(`Supplier not found for account: ${account.id}`)
      return
    }

    // Determina o status baseado nas capacidades
    let status: 'NOT_CONNECTED' | 'PENDING' | 'CONNECTED' | 'RESTRICTED' | 'REJECTED' = 'PENDING'

    if (account.charges_enabled && account.payouts_enabled) {
      status = 'CONNECTED'
    } else if (account.requirements?.disabled_reason) {
      status = 'RESTRICTED'
    } else if (account.requirements?.currently_due?.length === 0 && account.details_submitted) {
      status = 'CONNECTED'
    }

    // Atualiza a company
    await prisma.company.update({
      where: {
        id: supplier.companyId,
      },
      data: {
        stripeConnectStatus: status,
        stripeConnectChargesEnabled: account.charges_enabled,
        stripeConnectPayoutsEnabled: account.payouts_enabled,
        stripeConnectOnboardedAt: account.details_submitted ? new Date() : null,
      },
    })

    console.log(`Updated account status for ${supplier.company.name}: ${status}`)
  } catch (error) {
    console.error('Error handling account.updated:', error)
  }
}

/**
 * Atualiza transação quando payment intent é bem-sucedido
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log('Processing payment_intent.succeeded:', paymentIntent.id)

    const transaction = await prisma.stripeConnectTransaction.findFirst({
      where: {
        stripeTransactionId: paymentIntent.id,
      },
    })

    if (transaction) {
      await prisma.stripeConnectTransaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          status: 'SUCCEEDED',
          updatedAt: new Date(),
        },
      })
      console.log(`Updated transaction status to SUCCEEDED: ${transaction.id}`)
    }
  } catch (error) {
    console.error('Error handling payment_intent.succeeded:', error)
  }
}

/**
 * Atualiza transação quando payment intent falha
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log('Processing payment_intent.payment_failed:', paymentIntent.id)

    const transaction = await prisma.stripeConnectTransaction.findFirst({
      where: {
        stripeTransactionId: paymentIntent.id,
      },
    })

    if (transaction) {
      await prisma.stripeConnectTransaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          status: 'FAILED',
          updatedAt: new Date(),
        },
      })
      console.log(`Updated transaction status to FAILED: ${transaction.id}`)
    }
  } catch (error) {
    console.error('Error handling payment_intent.payment_failed:', error)
  }
}

/**
 * Cria registro de transferência
 */
async function handleTransferCreated(transfer: Stripe.Transfer) {
  try {
    console.log('Processing transfer.created:', transfer.id)

    // Verifica se já existe o registro
    const existingTransfer = await prisma.stripeConnectTransfer.findFirst({
      where: {
        stripeTransferId: transfer.id,
      },
    })

    if (!existingTransfer) {
      // Busca a transação relacionada se houver
      let transactionId = ''
      if (transfer.metadata?.transaction_id) {
        transactionId = transfer.metadata.transaction_id
      }

      await prisma.stripeConnectTransfer.create({
        data: {
          stripeTransferId: transfer.id,
          connectedAccountId: transfer.destination as string,
          amount: transfer.amount,
          currency: transfer.currency,
          status: 'PENDING',
          description: transfer.description || '',
          stripeCreatedAt: new Date(transfer.created * 1000),
          transactionId: transactionId,
        },
      })
      console.log(`Created transfer record: ${transfer.id}`)
    }
  } catch (error) {
    console.error('Error handling transfer.created:', error)
  }
}

/**
 * Atualiza status da transferência
 */
async function handleTransferUpdated(transfer: Stripe.Transfer) {
  try {
    console.log('Processing transfer.updated:', transfer.id)

    // Converte status do Stripe para nosso enum
    let status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELED' | 'IN_TRANSIT' = 'PENDING'

    // O Stripe não tem todos esses status, mas vamos mapear o que temos
    if (transfer.reversed === true) {
      status = 'FAILED'
    } else {
      // Se não foi revertido, assumimos que foi bem-sucedido
      status = 'PAID'
    }

    await prisma.stripeConnectTransfer.updateMany({
      where: {
        stripeTransferId: transfer.id,
      },
      data: {
        status,
        updatedAt: new Date(),
      },
    })

    console.log(`Updated transfer status to ${status}: ${transfer.id}`)
  } catch (error) {
    console.error('Error handling transfer.updated:', error)
  }
}

/**
 * Processa charge bem-sucedido
 */
async function handleChargeSucceeded(charge: Stripe.Charge) {
  try {
    console.log('Processing charge.succeeded:', charge.id)

    // Se o charge tem um payment_intent, a transação já deve ter sido atualizada
    // Este evento pode ser usado para logs adicionais ou verificações
    if (charge.payment_intent) {
      const transaction = await prisma.stripeConnectTransaction.findFirst({
        where: {
          stripeTransactionId: charge.payment_intent as string,
        },
      })

      if (transaction) {
        console.log(`Charge succeeded for transaction: ${transaction.id}`)
      }
    }
  } catch (error) {
    console.error('Error handling charge.succeeded:', error)
  }
}

/**
 * Processa charge que falhou
 */
async function handleChargeFailed(charge: Stripe.Charge) {
  try {
    console.log('Processing charge.failed:', charge.id)

    if (charge.payment_intent) {
      const transaction = await prisma.stripeConnectTransaction.findFirst({
        where: {
          stripeTransactionId: charge.payment_intent as string,
        },
      })

      if (transaction) {
        await prisma.stripeConnectTransaction.update({
          where: {
            id: transaction.id,
          },
          data: {
            status: 'FAILED',
            updatedAt: new Date(),
          },
        })
        console.log(`Updated transaction status to FAILED due to charge failure: ${transaction.id}`)
      }
    }
  } catch (error) {
    console.error('Error handling charge.failed:', error)
  }
}

/**
 * Processa criação de payout
 */
async function handlePayoutCreated(payout: Stripe.Payout) {
  try {
    console.log('Processing payout.created:', payout.id)
    // Aqui poderíamos criar registros de payout se necessário
    // Por enquanto, apenas logamos
  } catch (error) {
    console.error('Error handling payout.created:', error)
  }
}

/**
 * Processa atualização de payout
 */
async function handlePayoutUpdated(payout: Stripe.Payout) {
  try {
    console.log('Processing payout.updated:', payout.id, 'Status:', payout.status)
    // Aqui poderíamos atualizar o status do payout se necessário
  } catch (error) {
    console.error('Error handling payout.updated:', error)
  }
}