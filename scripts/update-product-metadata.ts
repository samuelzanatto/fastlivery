import Stripe from 'stripe'
import dotenv from 'dotenv'

dotenv.config()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

async function updateProductMetadata() {
  console.log('🏷️ Atualizando metadados dos produtos do Stripe...')

  // Planos de fornecedor (B2B)
  const supplierPlans = [
    {
      id: 'prod_T7AOhCBDHoJItV', // Plano Starter - Fornecedor
      metadata: {
        target_audience: 'supplier',
        company_type: 'supplier',
        plan_type: 'starter',
        tier: '1',
        max_products: '50',
        max_partnerships: '20',
        commission_rate: '5.0',
        support_level: 'email',
        analytics: 'basic'
      }
    },
    {
      id: 'prod_T7AOrC7viRtUXk', // Plano Growth - Fornecedor  
      metadata: {
        target_audience: 'supplier',
        company_type: 'supplier', 
        plan_type: 'growth',
        tier: '2',
        max_products: '200',
        max_partnerships: '100',
        commission_rate: '3.0',
        support_level: 'priority',
        analytics: 'advanced'
      }
    },
    {
      id: 'prod_T7APElelSfW3Gg', // Plano Professional - Fornecedor
      metadata: {
        target_audience: 'supplier',
        company_type: 'supplier',
        plan_type: 'professional', 
        tier: '3',
        max_products: 'unlimited',
        max_partnerships: 'unlimited',
        commission_rate: '2.0',
        support_level: 'dedicated',
        analytics: 'custom'
      }
    },
    {
      id: 'prod_T7AP7lmF2DegIa', // Plano Enterprise - Fornecedor
      metadata: {
        target_audience: 'supplier',
        company_type: 'supplier',
        plan_type: 'enterprise',
        tier: '4', 
        max_products: 'unlimited',
        max_partnerships: 'unlimited',
        commission_rate: 'negotiable',
        support_level: '24/7',
        analytics: 'custom'
      }
    }
  ]

  // Planos de empresa de delivery
  const deliveryPlans = [
    {
      id: 'prod_T1qjHPxG3ZQtlT', // FastLivery Basic
      metadata: {
        target_audience: 'delivery_company',
        company_type: 'delivery_company',
        plan_type: 'basic',
        tier: '1',
        max_orders: '500',
        max_products: '50', 
        max_tables: '10',
        max_users: '3',
        advanced_analytics: 'false',
        priority_support: 'false',
        custom_branding: 'false'
      }
    },
    {
      id: 'prod_T1qkg0wVq4nmQt', // FastLivery Pro
      metadata: {
        target_audience: 'delivery_company',
        company_type: 'delivery_company',
        plan_type: 'pro',
        tier: '2',
        max_orders: 'unlimited',
        max_products: '200',
        max_tables: '25',
        max_users: '10',
        advanced_analytics: 'true',
        priority_support: 'true',
        custom_branding: 'false'
      }
    },
    {
      id: 'prod_T1qkKYQ753swZ3', // FastLivery Enterprise
      metadata: {
        target_audience: 'delivery_company',
        company_type: 'delivery_company',
        plan_type: 'enterprise',
        tier: '3',
        max_orders: 'unlimited',
        max_products: 'unlimited',
        max_tables: 'unlimited', 
        max_users: 'unlimited',
        advanced_analytics: 'true',
        priority_support: 'true',
        custom_branding: 'true'
      }
    }
  ]

  const allPlans = [...supplierPlans, ...deliveryPlans]

  for (const plan of allPlans) {
    try {
      console.log(`📝 Atualizando produto ${plan.id}...`)
      
      await stripe.products.update(plan.id, {
        metadata: plan.metadata
      })
      
      console.log(`✅ Produto ${plan.id} atualizado com sucesso`)
      
      // Verificar se foi atualizado
      const product = await stripe.products.retrieve(plan.id)
      console.log(`📋 Metadados atualizados:`, product.metadata)
      console.log('---')
      
    } catch (error) {
      console.error(`❌ Erro ao atualizar produto ${plan.id}:`, error)
    }
  }

  console.log('🎉 Processo de atualização concluído!')
}

updateProductMetadata().catch(console.error)