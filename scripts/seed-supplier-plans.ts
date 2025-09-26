import { PrismaClient, SupplierPlanType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding supplier subscription plans...')
  
  const plans = [
    {
      planType: SupplierPlanType.STARTER,
      name: 'Plano Starter - Fornecedor',
      description: 'Plano de entrada para fornecedores pequenos. Inclui até 50 produtos, até 20 parcerias ativas, comissão de 5%, suporte por email e dashboard básico.',
      monthlyPrice: 4900,
      stripeProductId: 'prod_T7AOhCBDHoJItV',
      stripePriceId: 'price_1SAw52EQcZJjqJoqxNnYY1uH',
      maxProducts: 50,
      maxPartnerships: 20,
      commissionRate: 0.05,
      prioritySupport: false,
      advancedAnalytics: false,
      apiAccess: false,
      whiteLabel: false,
      dedicatedManager: false,
      customReports: false,
      slaGuarantee: false,
    },
    {
      planType: SupplierPlanType.GROWTH,
      name: 'Plano Growth - Fornecedor',
      description: 'Plano para fornecedores em expansão. Inclui até 200 produtos, até 100 parcerias ativas, comissão de 3%, suporte prioritário, analytics avançado e integração com sistemas externos.',
      monthlyPrice: 14900,
      stripeProductId: 'prod_T7AOrC7viRtUXk',
      stripePriceId: 'price_1SAw5REQcZJjqJoqb9K15ZHV',
      maxProducts: 200,
      maxPartnerships: 100,
      commissionRate: 0.03,
      prioritySupport: true,
      advancedAnalytics: true,
      apiAccess: true,
      whiteLabel: false,
      dedicatedManager: false,
      customReports: false,
      slaGuarantee: false,
    },
    {
      planType: SupplierPlanType.PROFESSIONAL,
      name: 'Plano Professional - Fornecedor',
      description: 'Plano para fornecedores estabelecidos. Produtos ilimitados, parcerias ilimitadas, comissão de 2%, suporte dedicado, white-label, relatórios customizados e gerente de conta.',
      monthlyPrice: 29900,
      stripeProductId: 'prod_T7APElelSfW3Gg',
      stripePriceId: 'price_1SAw5aEQcZJjqJoqnQuC4EGO',
      maxProducts: null,
      maxPartnerships: null,
      commissionRate: 0.02,
      prioritySupport: true,
      advancedAnalytics: true,
      apiAccess: true,
      whiteLabel: true,
      dedicatedManager: true,
      customReports: true,
      slaGuarantee: false,
    },
    {
      planType: SupplierPlanType.ENTERPRISE,
      name: 'Plano Enterprise - Fornecedor',
      description: 'Plano corporativo para grandes fornecedores e distribuidores. Tudo do Professional + comissão negociável, SLA garantido, integração customizada, onboarding dedicado e suporte 24/7.',
      monthlyPrice: 99900,
      stripeProductId: 'prod_T7AP7lmF2DegIa',
      stripePriceId: 'price_1SAw5hEQcZJjqJoqsukcAjbV',
      maxProducts: null,
      maxPartnerships: null,
      commissionRate: 0.015,
      prioritySupport: true,
      advancedAnalytics: true,
      apiAccess: true,
      whiteLabel: true,
      dedicatedManager: true,
      customReports: true,
      slaGuarantee: true,
    },
  ]

  for (const plan of plans) {
    try {
      const created = await prisma.supplierSubscriptionPlan.create({
        data: plan,
      })
      console.log(`Created plan: ${created.name} (${created.planType})`)
    } catch (error) {
      console.error(`Error creating plan ${plan.name}:`, error)
    }
  }
  
  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })