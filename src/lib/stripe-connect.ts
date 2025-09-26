import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
  typescript: true,
})

/**
 * Cria uma conta conectada (Express) para um fornecedor
 */
export async function createStripeConnectAccount(supplierData: {
  email: string
  companyName: string
  country: string
  type?: 'express' | 'standard' | 'custom'
}) {
  try {
    const account = await stripe.accounts.create({
      type: supplierData.type || 'express', // Express é mais simples para onboarding
      country: supplierData.country,
      email: supplierData.email,
      business_type: 'company',
      company: {
        name: supplierData.companyName,
      },
      capabilities: {
        transfers: {
          requested: true,
        },
        card_payments: {
          requested: true,
        },
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'weekly', // Pagamentos semanais
            weekly_anchor: 'friday', // Toda sexta-feira
          },
        },
      },
    })

    return account
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error)
    throw error
  }
}

/**
 * Cria um link de onboarding para que o fornecedor complete sua configuração
 */
export async function createStripeOnboardingLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
) {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    })

    return accountLink
  } catch (error) {
    console.error('Error creating Stripe onboarding link:', error)
    throw error
  }
}

/**
 * Verifica o status de uma conta conectada
 */
export async function getStripeAccountStatus(accountId: string) {
  try {
    const account = await stripe.accounts.retrieve(accountId)

    return {
      id: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      currentlyDue: account.requirements?.currently_due || [],
      disabled: account.requirements?.disabled_reason,
      capabilities: account.capabilities,
      business_profile: account.business_profile,
    }
  } catch (error) {
    console.error('Error retrieving Stripe account:', error)
    throw error
  }
}

/**
 * Cria um pagamento com split automático
 */
export async function createPaymentWithSplit({
  amount,
  currency = 'brl',
  connectedAccountId,
  platformCommissionRate = 5.0,
  description,
  metadata = {},
}: {
  amount: number // valor em centavos
  currency?: string
  connectedAccountId: string
  platformCommissionRate?: number
  description?: string
  metadata?: Record<string, string>
}) {
  try {
    // Calcula a comissão da plataforma
    const platformCommission = Math.round(amount * (platformCommissionRate / 100))
    const supplierAmount = amount - platformCommission

    // Cria o Payment Intent com destino para a conta conectada
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      application_fee_amount: platformCommission, // Comissão da plataforma
      on_behalf_of: connectedAccountId, // Pagamento será processado em nome do fornecedor
      transfer_data: {
        destination: connectedAccountId, // Destino final do dinheiro
      },
      description,
      metadata: {
        ...metadata,
        supplier_amount: supplierAmount.toString(),
        platform_commission: platformCommission.toString(),
        commission_rate: platformCommissionRate.toString(),
      },
    })

    return paymentIntent
  } catch (error) {
    console.error('Error creating payment with split:', error)
    throw error
  }
}

/**
 * Cria uma transferência direta para um fornecedor
 */
export async function createTransferToSupplier({
  amount,
  currency = 'brl',
  destination,
  description,
  metadata = {},
}: {
  amount: number
  currency?: string
  destination: string
  description?: string
  metadata?: Record<string, string>
}) {
  try {
    const transfer = await stripe.transfers.create({
      amount,
      currency,
      destination,
      description,
      metadata,
    })

    return transfer
  } catch (error) {
    console.error('Error creating transfer:', error)
    throw error
  }
}

/**
 * Lista transações de uma conta conectada
 */
export async function getAccountTransactions(
  accountId: string,
  limit = 50,
  startingAfter?: string
) {
  try {
    const charges = await stripe.charges.list(
      {
        limit,
        starting_after: startingAfter,
      },
      {
        stripeAccount: accountId,
      }
    )

    return charges
  } catch (error) {
    console.error('Error listing account transactions:', error)
    throw error
  }
}

/**
 * Obtém o saldo de uma conta conectada
 */
export async function getAccountBalance(accountId: string) {
  try {
    const balance = await stripe.balance.retrieve({
      stripeAccount: accountId,
    })

    return balance
  } catch (error) {
    console.error('Error retrieving account balance:', error)
    throw error
  }
}

export { stripe }