import Stripe from 'stripe'
import { prisma } from '@/lib/database/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

export interface StripeProduct {
  id: string
  name: string
  description: string | null
  active: boolean
  metadata: Record<string, string>
  created: number
  updated: number
}

export interface StripePrice {
  id: string
  product_id: string
  active: boolean
  currency: string
  unit_amount: number | null
  recurring: {
    interval: string
    interval_count: number
  } | null
  type: 'one_time' | 'recurring'
  metadata: Record<string, string>
  created: number
}

export class StripeSyncService {
  /**
   * Busca e sincroniza produtos do Stripe com o banco local
   */
  static async syncProducts(): Promise<StripeProduct[]> {
    try {
      console.log('🔄 Sincronizando produtos do Stripe...')
      
      const products = await stripe.products.list({
        active: true,
        expand: ['data.default_price'],
        limit: 100
      })

      const syncedProducts: StripeProduct[] = []

      for (const product of products.data) {
        console.log(`📦 Processando produto: ${product.id} - ${product.name}`)
        
        const productData: StripeProduct = {
          id: product.id,
          name: product.name,
          description: product.description,
          active: product.active,
          metadata: product.metadata,
          created: product.created,
          updated: product.updated,
        }
        
        // Upsert no banco de dados local
        await prisma.stripeProduct.upsert({
          where: { id: product.id },
          update: {
            name: product.name,
            description: product.description,
            active: product.active,
            metadata: product.metadata,
            updated: new Date(),
          },
          create: {
            id: product.id,
            name: product.name,
            description: product.description,
            active: product.active,
            metadata: product.metadata,
            created: new Date(product.created * 1000),
            updated: new Date(),
          },
        })

        syncedProducts.push(productData)
      }

      console.log(`✅ Sincronizados ${syncedProducts.length} produtos`)
      return syncedProducts
    } catch (error) {
      console.error('❌ Erro ao sincronizar produtos:', error)
      throw error
    }
  }

  /**
   * Busca e sincroniza preços do Stripe com o banco local
   */
  static async syncPrices(): Promise<StripePrice[]> {
    try {
      console.log('🔄 Sincronizando preços do Stripe...')
      
      // Buscar todos os preços ativos do Stripe
      const prices = await stripe.prices.list({
        active: true,
        limit: 100, // Ajustar conforme necessário
      })

      const syncedPrices: StripePrice[] = []

      for (const price of prices.data) {
        const priceData: StripePrice = {
          id: price.id,
          product_id: typeof price.product === 'string' ? price.product : price.product.id,
          active: price.active,
          currency: price.currency,
          unit_amount: price.unit_amount,
          recurring: price.recurring ? {
            interval: price.recurring.interval,
            interval_count: price.recurring.interval_count,
          } : null,
          type: price.type,
          metadata: price.metadata,
          created: price.created,
        }

        // Upsert no banco de dados local
        await prisma.stripePrice.upsert({
          where: { id: price.id },
          update: {
            productId: priceData.product_id,
            active: price.active,
            currency: price.currency,
            unitAmount: price.unit_amount,
            recurring: price.recurring ? JSON.parse(JSON.stringify(price.recurring)) : null,
            type: price.type,
            metadata: price.metadata,
            updated: new Date(),
          },
          create: {
            id: price.id,
            productId: priceData.product_id,
            active: price.active,
            currency: price.currency,
            unitAmount: price.unit_amount,
            recurring: price.recurring ? JSON.parse(JSON.stringify(price.recurring)) : null,
            type: price.type,
            metadata: price.metadata,
            created: new Date(price.created * 1000),
            updated: new Date(),
          },
        })

        syncedPrices.push(priceData)
      }

      console.log(`✅ Sincronizados ${syncedPrices.length} preços`)
      return syncedPrices
    } catch (error) {
      console.error('❌ Erro ao sincronizar preços:', error)
      throw error
    }
  }

  /**
   * Sincronização completa (produtos + preços)
   */
  static async fullSync(): Promise<{ products: StripeProduct[], prices: StripePrice[] }> {
    console.log('🚀 Iniciando sincronização completa com Stripe...')
    
    const products = await this.syncProducts()
    const prices = await this.syncPrices()
    
    console.log('✨ Sincronização completa finalizada!')
    
    return { products, prices }
  }

  /**
   * Busca um preço específico do Stripe e sincroniza
   */
  static async syncSpecificPrice(priceId: string): Promise<StripePrice | null> {
    try {
      const price = await stripe.prices.retrieve(priceId)
      
      const priceData: StripePrice = {
        id: price.id,
        product_id: typeof price.product === 'string' ? price.product : price.product.id,
        active: price.active,
        currency: price.currency,
        unit_amount: price.unit_amount,
        recurring: price.recurring ? {
          interval: price.recurring.interval,
          interval_count: price.recurring.interval_count,
        } : null,
        type: price.type,
        metadata: price.metadata,
        created: price.created,
      }

      // Upsert no banco de dados local
      await prisma.stripePrice.upsert({
        where: { id: price.id },
        update: {
          productId: priceData.product_id,
          active: price.active,
          currency: price.currency,
          unitAmount: price.unit_amount,
          recurring: price.recurring ? JSON.parse(JSON.stringify(price.recurring)) : null,
          type: price.type,
          metadata: price.metadata,
          updated: new Date(),
        },
        create: {
          id: price.id,
          productId: priceData.product_id,
          active: price.active,
          currency: price.currency,
          unitAmount: price.unit_amount,
          recurring: price.recurring ? JSON.parse(JSON.stringify(price.recurring)) : null,
          type: price.type,
          metadata: price.metadata,
          created: new Date(price.created * 1000),
          updated: new Date(),
        },
      })

      return priceData
    } catch (error) {
      console.error(`❌ Erro ao sincronizar preço ${priceId}:`, error)
      return null
    }
  }

  /**
   * Obter produtos locais com preços
   */
  static async getLocalProductsWithPrices() {
    return await prisma.stripeProduct.findMany({
      where: { active: true },
      include: {
        prices: {
          where: { active: true },
          orderBy: { unitAmount: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    })
  }

  /**
   * Obter preço formatado
   */
  static formatPrice(unitAmount: number | null, currency: string = 'brl'): string {
    if (!unitAmount) return 'Grátis'
    
    const amount = unitAmount / 100
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount)
  }
}
