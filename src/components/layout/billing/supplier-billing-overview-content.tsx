'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  Crown,
  Package,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { SupplierUsageDashboard } from '@/components/supplier/SupplierUsageDashboard'
import { getSupplierUsageStats, getCurrentSupplierSubscription, type SupplierSubscriptionData } from '@/actions/supplier-subscription-actions'
import { toast } from 'sonner'

interface UsageStats {
  currentProductCount: number
  currentPartnershipCount: number
  planName: string
  planLimits: {
    maxProducts: number
    maxPartnerships: number
  }
  status: string
  currentPeriodEnd: string
}

interface SupplierBillingOverviewContentProps {
  onUpgrade: () => void
}

export function SupplierBillingOverviewContent({ onUpgrade }: SupplierBillingOverviewContentProps) {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [subscription, setSubscription] = useState<SupplierSubscriptionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [stats, sub] = await Promise.all([
        getSupplierUsageStats(),
        getCurrentSupplierSubscription()
      ])
      
      setUsageStats(stats)
      setSubscription(sub)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Erro ao carregar dados da assinatura')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!usageStats) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Não foi possível carregar os dados da assinatura.
        </AlertDescription>
      </Alert>
    )
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price / 100)
  }

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'starter':
        return <Package className="h-5 w-5" />
      case 'growth':
        return <TrendingUp className="h-5 w-5" />
      case 'professional':
        return <Crown className="h-5 w-5" />
      case 'enterprise':
        return <Crown className="h-5 w-5 text-amber-500" />
      default:
        return <Package className="h-5 w-5" />
    }
  }

  return (
    <div className="space-y-6">
      {/* No subscription alert */}
      {!subscription && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            <strong>Nenhum plano ativo!</strong> Escolha um plano para começar a usar o marketplace.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan */}
      {subscription && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getPlanIcon(usageStats.planName)}
                <div>
                  <CardTitle>Plano {usageStats.planName}</CardTitle>
                  <CardDescription>Seu plano atual de fornecedor</CardDescription>
                </div>
              </div>
              <Badge variant={subscription.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {subscription.status === 'ACTIVE' ? 'Ativo' : subscription.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{formatPrice(subscription.plan.monthlyPrice)}/mês</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Próxima cobrança: {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Produtos: {usageStats.currentProductCount}/{usageStats.planLimits.maxProducts === -1 ? '∞' : usageStats.planLimits.maxProducts}
                </span>
              </div>
            </div>

            {subscription.cancelAtPeriodEnd && (
              <Alert className="mt-4 border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  Sua assinatura será cancelada em {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Usage Dashboard */}
      {subscription && (
        <SupplierUsageDashboard 
          usage={usageStats} 
          onUpgrade={onUpgrade}
        />
      )}

      {/* No subscription call to action */}
      {!subscription && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Comece agora como fornecedor
                </h3>
                <p className="text-gray-600">
                  Escolha um plano e comece a vender no nosso marketplace.
                </p>
              </div>
              <Button 
                onClick={onUpgrade}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size="lg"
              >
                <Crown className="h-4 w-4 mr-2" />
                Escolher Plano
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {subscription && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" className="flex-1" onClick={onUpgrade}>
            <Crown className="h-4 w-4 mr-2" />
            Alterar Plano
          </Button>
          <Button variant="outline" className="flex-1">
            <CreditCard className="h-4 w-4 mr-2" />
            Método de Pagamento
          </Button>
        </div>
      )}
    </div>
  )
}