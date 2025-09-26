import { auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/database/prisma'
import Link from 'next/link'
import { 
  getAvailableSubscriptionPlans, 
  getCurrentSupplierSubscription,
  getSupplierUsageStats
} from '@/actions/supplier-subscription-actions'
import { SupplierSubscriptionClient } from './supplier-subscription-client'

export default async function SupplierSubscriptionPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  
  if (!session?.user?.id) {
    redirect('/login')
  }

  // Verificar se o usuário tem uma empresa associada (como owner)
  const company = await prisma.company.findFirst({
    where: { ownerId: session.user.id },
    include: {
      supplier: true
    }
  })

  if (!company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
          <p className="text-muted-foreground mb-6">
            Você precisa estar associado a uma empresa para acessar os planos de assinatura.
          </p>
          <Link 
            href="/marketplace" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar ao Marketplace
          </Link>
        </div>
      </div>
    )
  }

  if (!company.supplier) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Torne-se um Fornecedor</h1>
          <p className="text-muted-foreground mb-6">
            Sua empresa ainda não está registrada como fornecedor. Complete seu cadastro para acessar os planos.
          </p>
          <Link 
            href="/supplier-onboarding" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Completar Cadastro
          </Link>
        </div>
      </div>
    )
  }

  // Buscar planos disponíveis, assinatura atual e estatísticas de uso
  const [availablePlans, currentSubscription, usageStats] = await Promise.all([
    getAvailableSubscriptionPlans(),
    getCurrentSupplierSubscription(),
    getSupplierUsageStats()
  ])

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <SupplierSubscriptionClient
        plans={availablePlans}
        currentPlan={currentSubscription?.plan || null}
        usageStats={usageStats}
      />
    </div>
  )
}