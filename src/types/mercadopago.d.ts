// Declarações de tipos para Mercado Pago SDK JavaScript
declare global {
  interface Window {
    MercadoPago: {
      new (publicKey: string): {
        bricks(): {
          create(
            type: 'cardPayment' | 'payment' | 'wallet',
            container: string,
            settings: {
              initialization?: {
                amount?: number
                preferenceId?: string
                payer?: {
                  email?: string
                  first_name?: string
                  last_name?: string
                  customer_id?: string
                  card_ids?: string[]
                }
              }
              customization?: {
                paymentMethods?: {
                  ticket?: 'all' | string[]
                  bankTransfer?: 'all' | string[]
                  creditCard?: 'all' | string[]
                  prepaidCard?: 'all' | string[]
                  debitCard?: 'all' | string[]
                  mercadoPago?: 'all' | string[]
                }
                visual?: {
                  style?: {
                    theme?: 'default' | 'dark' | 'bootstrap' | 'flat'
                  }
                }
              }
              callbacks?: {
                onReady?: () => void
                onSubmit?: (data: {
                  selectedPaymentMethod?: string
                  formData?: Record<string, unknown>
                  paymentType?: string
                  transaction_amount?: number
                  token?: string
                  payment_method_id?: string
                  installments?: number
                  payer?: {
                    email?: string
                    identification?: {
                      type?: string
                      number?: string
                    }
                  }
                }) => Promise<void> | void
                onError?: (error: unknown) => void
              }
            }
          ): Promise<{
            unmount(): void
            update(settings: Record<string, unknown>): void
          }>
        }
      }
    }
  }
}

export {}
