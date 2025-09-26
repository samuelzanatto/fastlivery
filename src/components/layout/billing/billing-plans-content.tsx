'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle } from 'lucide-react'
import { getUsageOverview, getBillingPlans, upgradeSubscription } from '@/actions/subscription/subscription'

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

interface PlanData {
  id: string
  name: string
  price: string
  description: string
  features: string[]
  color: string
  buttonColor: string
  textColor: string
  popular?: boolean
  stripeProductId?: string
  stripePriceId?: string
}

interface PlansComparisonProps {
  currentPlan: string
  onUpgrade: (planId: string) => void
  isUpgrading: boolean
}

function PlansComparison({ currentPlan, onUpgrade, isUpgrading }: PlansComparisonProps) {
  const [stripePlans, setStripePlans] = useState<StripePlan[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch plans from Stripe
  useEffect(() => {
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
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchStripePlans()
  }, [])

  // Fallback plans if Stripe data is not available
  const fallbackPlans: PlanData[] = [
    {
      id: 'basic',
      name: 'Basic',
      price: 'R$ 97',
      description: 'Ideal para pequenos negócios',
      features: [
        '100 pedidos/mês',
        '50 produtos',
        '5 mesas',
        '2 usuários',
        'Suporte por email',
        'Relatórios básicos'
      ],
      color: 'border-blue-200',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
      textColor: 'text-blue-600'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 'R$ 197',
      description: 'Para negócios em crescimento',
      popular: true,
      features: [
        'Pedidos ilimitados',
        '200 produtos',
        '20 mesas',
        '5 usuários',
        'Suporte prioritário',
        'Analytics avançado',
        'Relatórios detalhados'
      ],
      color: 'border-orange-200',
      buttonColor: 'bg-orange-600 hover:bg-orange-700',
      textColor: 'text-orange-600'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'R$ 497',
      description: 'Para grandes operações',
      features: [
        'Tudo ilimitado',
        'Produtos ilimitados',
        'Mesas ilimitadas',
        'Usuários ilimitados',
        'Suporte dedicado 24/7',
        'Analytics avançado',
        'Marca personalizada',
        'API completa'
      ],
      color: 'border-purple-200',
      buttonColor: 'bg-purple-600 hover:bg-purple-700',
      textColor: 'text-purple-600'
    }
  ]

  // Merge Stripe data with fallback plans
  const getPlansWithStripeData = (): PlanData[] => {
    if (stripePlans.length === 0) return fallbackPlans

    return fallbackPlans.map(fallbackPlan => {
      const stripePlan = stripePlans.find(sp => sp.id === fallbackPlan.id)
      if (stripePlan) {
        return {
          ...fallbackPlan,
          name: stripePlan.name || fallbackPlan.name,
          price: stripePlan.price ? `R$ ${stripePlan.price}` : fallbackPlan.price,
          stripeProductId: stripePlan.productId,
          stripePriceId: stripePlan.priceId
        }
      }
      return fallbackPlan
    })
  }

  const plans = getPlansWithStripeData()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        <span className="ml-2">Carregando planos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Escolha o melhor plano para você</h3>
        <p className="text-gray-600">Faça upgrade ou downgrade a qualquer momento</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = plan.id === currentPlan

          return (
            <Card
              key={plan.id}
              className={`relative ${plan.color} ${
                plan.popular ? 'border border-orange-500' : ''
              } ${isCurrentPlan ? 'bg-gray-50' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-orange-500 text-white">Mais Popular</Badge>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-green-500 text-white">Plano Atual</Badge>
                </div>
              )}

              <CardHeader className="text-center">
                <CardTitle className={`text-xl ${plan.textColor}`}>
                  {plan.name}
                </CardTitle>
                <div className={`text-3xl font-bold ${plan.textColor}`}>
                  {plan.price}
                  <span className="text-sm text-gray-500 font-normal">/mês</span>
                </div>
                <p className="text-gray-600 text-sm">{plan.description}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-4">
                  {isCurrentPlan ? (
                    <Button className="w-full" disabled variant="outline">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Plano Atual
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${plan.buttonColor} text-white`}
                      onClick={() => onUpgrade(plan.id)}
                      disabled={isUpgrading}
                    >
                      {isUpgrading ? 'Processando...' : `Trocar para ${plan.name}`}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export function BillingPlansContent() {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)

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

  const handleUpgrade = async (newPlanId: string) => {
    setIsUpgrading(true)
    try {
      const result = await upgradeSubscription(newPlanId)
      
      if (!result.success) {
        throw new Error(result.error)
      }
      
      if (result.data?.url) {
        window.location.href = result.data.url
      } else {
        alert('Plano atualizado com sucesso!')
        fetchUsageData()
      }
    } catch (error) {
      console.error('Erro ao fazer upgrade do plano:', error)
      alert(`Erro ao fazer upgrade do plano: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setIsUpgrading(false)
    }
  }

  useEffect(() => {
    fetchUsageData()
  }, [])

  if (isLoading || !usageData) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <PlansComparison currentPlan={usageData.planId} onUpgrade={handleUpgrade} isUpgrading={isUpgrading} />
  )
}