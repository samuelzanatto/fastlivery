'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Crown,
  CheckCircle,
  Calendar,
  Zap,
  AlertTriangle,
} from 'lucide-react'
import { getUsageOverview, getBillingPlans } from '@/actions/subscription/subscription'

interface UsageData {
  planId: string
  usage: {
    orders: number
    products: number
    tables: number
    users: number
  }
  limits: {
    orders: number
    products: number
    tables: number
    users: number
  }
  billing: {
    currentPeriodEnd: string
  }
  features: {
    hasAdvancedAnalytics: boolean
    hasPrioritySupport: boolean
    hasCustomBranding: boolean
  }
}

interface StripePlan {
  id: string
  name: string
  price: string
  productId: string
  priceId: string
  description?: string
  metadata?: Record<string, string>
}

interface UsageCardProps {
  title: string
  current: number
  limit: number
  description: string
}

function UsageCard({ title, current, limit, description }: UsageCardProps) {
  const isUnlimited = limit === -1
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100)
  const isNearLimit = percentage > 80
  const isOverLimit = percentage >= 100

  return (
    <Card className={`${isOverLimit ? 'border-red-200 bg-red-50' : isNearLimit ? 'border-yellow-200 bg-yellow-50' : ''}`}>
      <CardContent className="p-4">
        <div className="text-center space-y-3">
          <div>
            <h3 className="font-medium text-sm text-slate-800">{title}</h3>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-slate-800">
                {current.toLocaleString()}
              </span>
              <span className="text-sm text-gray-600">
                {isUnlimited ? 'Ilimitado' : `de ${limit.toLocaleString()}`}
              </span>
            </div>
            
            {!isUnlimited && (
              <Progress 
                value={percentage} 
                className={`h-2 ${
                  isOverLimit ? '[&>div]:bg-red-500' : 
                  isNearLimit ? '[&>div]:bg-yellow-500' : 
                  '[&>div]:bg-green-500'
                }`}
              />
            )}
            
            {isOverLimit && (
              <div className="flex items-center justify-center space-x-1 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-medium">Limite excedido</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function BillingOverviewContent() {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [stripePlans, setStripePlans] = useState<StripePlan[]>([])

  const fetchUsageData = async () => {
    setIsLoading(true)
    try {
      const result = await getUsageOverview()
      if (result.success) {
        // Transformar para o formato esperado
        const transformedData: UsageData = {
          planId: result.data.planId,
          usage: result.data.usage,
          limits: result.data.limits,
          billing: {
            currentPeriodEnd: result.data.billing.currentPeriodEnd.toISOString()
          },
          features: result.data.features
        }
        setUsageData(transformedData)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Erro ao carregar dados de uso:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStripePlans = async () => {
    try {
      const result = await getBillingPlans()
      if (result.success) {
        // Transformar para o formato esperado
        const transformedPlans = result.data.plans.map(plan => ({
          id: plan.id,
          name: plan.name,
          price: plan.price,
          productId: plan.productId,
          priceId: plan.priceId || '',
          description: plan.description,
          metadata: plan.metadata as Record<string, string>
        }))
        setStripePlans(transformedPlans)
      } else {
        console.error('Error fetching Stripe plans:', result.error)
      }
    } catch (error) {
      console.error('Error fetching Stripe plans:', error)
    }
  }

  const getPlanInfo = (planId: string) => {
    // First try to get from Stripe data
    const stripePlan = stripePlans.find(sp => sp.id === planId)
    if (stripePlan) {
      const colorMap = {
        basic: 'text-blue-600',
        pro: 'text-orange-600',
        enterprise: 'text-purple-600'
      }
      return {
        name: stripePlan.name,
        price: stripePlan.price ? `R$ ${stripePlan.price}` : 'N/A',
        color: colorMap[planId as keyof typeof colorMap] || 'text-blue-600'
      }
    }

    // Fallback to hardcoded values
    const plans = {
      basic: { name: 'Basic', price: 'R$ 97', color: 'text-blue-600' },
      pro: { name: 'Pro', price: 'R$ 197', color: 'text-orange-600' },
      enterprise: { name: 'Enterprise', price: 'R$ 497', color: 'text-purple-600' },
    }
    return plans[planId as keyof typeof plans] || plans.basic
  }

  useEffect(() => {
    fetchUsageData()
    fetchStripePlans()
  }, [])

  if (isLoading || !usageData) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  const planInfo = getPlanInfo(usageData.planId)
  const nextBillingDate = new Date(usageData.billing.currentPeriodEnd)

  return (
    <div className="space-y-6">
      {/* Status da Assinatura */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Crown className="h-5 w-5" />
              <span>Plano Atual</span>
            </div>
            <Badge variant="outline" className={planInfo.color}>
              {planInfo.name}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${planInfo.color}`}>
                {planInfo.price}
              </div>
              <p className="text-sm text-gray-600">por mês</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">Ativo</span>
              </div>
              <p className="text-sm text-gray-600">Status da assinatura</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="font-medium">
                  {nextBillingDate.toLocaleDateString('pt-BR')}
                </span>
              </div>
              <p className="text-sm text-gray-600">Próxima cobrança</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas de Uso */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Uso Mensal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <UsageCard
            title="Pedidos"
            current={usageData.usage.orders}
            limit={usageData.limits.orders}
            description="Este mês"
          />
          <UsageCard
            title="Produtos"
            current={usageData.usage.products}
            limit={usageData.limits.products}
            description="Cadastrados"
          />
          <UsageCard
            title="Mesas"
            current={usageData.usage.tables}
            limit={usageData.limits.tables}
            description="Ativas"
          />
          <UsageCard
            title="Usuários"
            current={usageData.usage.users}
            limit={usageData.limits.users}
            description="Ativos"
          />
        </div>
      </div>

      {/* Recursos Inclusos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Recursos do Plano</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              {usageData.features.hasAdvancedAnalytics ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
              )}
              <span className={usageData.features.hasAdvancedAnalytics ? '' : 'text-gray-400'}>
                Analytics Avançado
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {usageData.features.hasPrioritySupport ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
              )}
              <span className={usageData.features.hasPrioritySupport ? '' : 'text-gray-400'}>
                Suporte Prioritário
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {usageData.features.hasCustomBranding ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
              )}
              <span className={usageData.features.hasCustomBranding ? '' : 'text-gray-400'}>
                Marca Personalizada
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}