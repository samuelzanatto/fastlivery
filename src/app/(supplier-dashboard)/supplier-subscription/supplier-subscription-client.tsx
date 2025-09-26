'use client'

import { useState } from 'react'
import { createSupplierSubscription, changeSupplierSubscriptionPlan } from '@/actions/supplier-subscription-actions'
import { SupplierPlanSelector } from '@/components/supplier/SupplierPlanSelector'
import { SupplierUsageDashboard } from '@/components/supplier/SupplierUsageDashboard'
import { SubscriptionPlan } from '@/actions/supplier-subscription-actions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

interface SupplierSubscriptionClientProps {
  plans: SubscriptionPlan[]
  currentPlan?: SubscriptionPlan | null
  usageStats: UsageStats
}

export function SupplierSubscriptionClient({ 
  plans, 
  currentPlan,
  usageStats 
}: SupplierSubscriptionClientProps) {
  const [loading, setLoading] = useState(false)

  const handlePlanSelection = async (planId: string) => {
    setLoading(true)
    try {
      let result

      if (currentPlan) {
        // Change existing subscription
        result = await changeSupplierSubscriptionPlan(planId)
      } else {
        // Create new subscription
        result = await createSupplierSubscription(planId)
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao processar assinatura')
      }
      
      // Refresh the page to show updated data
      window.location.reload()
    } catch (error) {
      console.error('Erro ao processar assinatura:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = () => {
    // Scroll to plans section or switch to plans tab
    const plansTab = document.querySelector('[value="plans"]')
    if (plansTab) {
      (plansTab as HTMLElement).click()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gerenciar Assinatura
        </h1>
        <p className="text-gray-600">
          {currentPlan 
            ? 'Visualize seu uso atual e gerencie seu plano de assinatura.' 
            : 'Escolha um plano para começar a vender no marketplace.'
          }
        </p>
      </div>

      <Tabs defaultValue={currentPlan ? "dashboard" : "plans"} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard" disabled={!currentPlan}>
            Dashboard de Uso
          </TabsTrigger>
          <TabsTrigger value="plans">
            Planos Disponíveis
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="mt-6">
          {currentPlan && (
            <SupplierUsageDashboard 
              usage={usageStats}
              onUpgrade={handleUpgrade}
            />
          )}
        </TabsContent>
        
        <TabsContent value="plans" className="mt-6">
          <SupplierPlanSelector
            plans={plans}
            currentPlan={currentPlan}
            onSelectPlan={handlePlanSelection}
            isLoading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}