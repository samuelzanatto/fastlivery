import { auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/database/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DashboardHeader } from '@/components/ui/dashboard-header'
import { PartnershipRequests } from '@/components/partnerships/PartnershipRequests'

export default async function PartnershipRequestsPage() {
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
            Você precisa estar associado a uma empresa para acessar as solicitações de parceria.
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

  const userType = company.supplier ? 'supplier' : 'company'

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <DashboardHeader
        title={userType === 'supplier' ? 'Solicitações Recebidas' : 'Minhas Solicitações'}
        description={
          userType === 'supplier' 
            ? 'Gerencie as solicitações de parceria recebidas de empresas interessadas nos seus serviços.'
            : 'Acompanhe suas solicitações de parceria enviadas para fornecedores.'
        }
      />

      <PartnershipRequests userType={userType} />
    </div>
  )
}