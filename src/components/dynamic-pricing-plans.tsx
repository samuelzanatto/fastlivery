'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StripeSyncService } from '@/lib/stripe-sync'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export interface PlanInfo {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: string
  limits: {
    maxOrders: number
    maxProducts: number
    maxTables: number
    maxUsers: number
    hasAdvancedAnalytics: boolean
    hasPrioritySupport: boolean
    hasCustomBranding: boolean
  }
  stripePriceId: string
}

interface DynamicPricingPlansProps {
  onPlanSelect?: (planId: string, priceId: string) => void
  selectedPlanId?: string
}

export function DynamicPricingPlans({ onPlanSelect, selectedPlanId }: DynamicPricingPlansProps) {
  const [plans, setPlans] = useState<PlanInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchPlans = async () => {
    try {
      // Chamar API para buscar planos sincronizados
      const response = await fetch('/api/subscription/plans')
      
      if (!response.ok) throw new Error('Erro ao carregar planos')
      
      const data = await response.json()
      setPlans(data.plans || [])
    } catch (error) {
      console.error('Erro ao carregar planos:', error)
      toast.error('Erro ao carregar planos')
    } finally {
      setLoading(false)
    }
  }

  const refreshPlans = async () => {
    setRefreshing(true)
    try {
      // Forçar sincronização
      await fetch('/api/stripe/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'full' })
      })
      
      await fetchPlans()
      toast.success('Planos atualizados com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar planos:', error)
      toast.error('Erro ao atualizar planos')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const formatPrice = (price: number, currency: string = 'brl') => {
    return StripeSyncService.formatPrice(price, currency)
  }

  const getPlanBadgeColor = (planId: string) => {
    switch (planId.toLowerCase()) {
      case 'starter': return 'bg-blue-500 hover:bg-blue-600'
      case 'pro': return 'bg-purple-500 hover:bg-purple-600'  
      case 'enterprise': return 'bg-gold-500 hover:bg-gold-600'
      default: return 'bg-gray-500 hover:bg-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando planos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Planos de Assinatura</h2>
        <Button 
          onClick={refreshPlans} 
          variant="outline" 
          size="sm"
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Atualizando...' : 'Atualizar Preços'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative transition-all duration-200 hover:shadow-lg ${
              selectedPlanId === plan.id 
                ? 'ring-2 ring-primary shadow-md' 
                : 'hover:shadow-md'
            }`}
          >
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-2">
                <Badge 
                  className={`text-white ${getPlanBadgeColor(plan.id)}`}
                  variant="secondary"
                >
                  {plan.name}
                </Badge>
              </div>
              
              <CardTitle className="text-3xl font-bold">
                {formatPrice(plan.price, plan.currency)}
                <span className="text-sm font-normal text-muted-foreground">
                  /{plan.interval === 'month' ? 'mês' : plan.interval}
                </span>
              </CardTitle>
              
              <p className="text-sm text-muted-foreground">
                {plan.description}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Pedidos</span>
                  <span className="text-sm font-medium">
                    {plan.limits.maxOrders === -1 ? 'Ilimitados' : plan.limits.maxOrders}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Produtos</span>
                  <span className="text-sm font-medium">
                    {plan.limits.maxProducts === -1 ? 'Ilimitados' : plan.limits.maxProducts}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Mesas</span>
                  <span className="text-sm font-medium">
                    {plan.limits.maxTables === -1 ? 'Ilimitadas' : plan.limits.maxTables}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Usuários</span>
                  <span className="text-sm font-medium">
                    {plan.limits.maxUsers === -1 ? 'Ilimitados' : plan.limits.maxUsers}
                  </span>
                </div>
              </div>

              <hr className="my-4" />

              <div className="space-y-2">
                {plan.limits.hasAdvancedAnalytics && (
                  <div className="flex items-center text-sm text-green-600">
                    ✅ Analytics Avançados
                  </div>
                )}
                {plan.limits.hasPrioritySupport && (
                  <div className="flex items-center text-sm text-green-600">
                    ✅ Suporte Prioritário
                  </div>
                )}
                {plan.limits.hasCustomBranding && (
                  <div className="flex items-center text-sm text-green-600">
                    ✅ Marca Personalizada
                  </div>
                )}
              </div>

              {onPlanSelect && (
                <Button 
                  className="w-full mt-4"
                  onClick={() => onPlanSelect(plan.id, plan.stripePriceId)}
                  variant={selectedPlanId === plan.id ? 'default' : 'outline'}
                >
                  {selectedPlanId === plan.id ? 'Selecionado' : 'Selecionar Plano'}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
