'use client'

import { useState, useEffect } from 'react'
import { SupplierPlanSelector } from '@/components/supplier/SupplierPlanSelector'
import { 
  getAvailableSubscriptionPlans, 
  getCurrentSupplierSubscription, 
  createSupplierSubscription,
  changeSupplierSubscriptionPlan,
  cancelSupplierSubscription,
  reactivateSupplierSubscription,
  type SubscriptionPlan,
  type SupplierSubscriptionData
} from '@/actions/supplier-subscription-actions'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface SupplierBillingPlansContentProps {
  onPlanSelected?: () => void
}

export function SupplierBillingPlansContent({ onPlanSelected }: SupplierBillingPlansContentProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [currentSubscription, setCurrentSubscription] = useState<SupplierSubscriptionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [availablePlans, subscription] = await Promise.all([
        getAvailableSubscriptionPlans(),
        getCurrentSupplierSubscription()
      ])
      
      setPlans(availablePlans)
      setCurrentSubscription(subscription)
    } catch (error) {
      console.error('Error loading plans:', error)
      toast.error('Erro ao carregar planos disponíveis')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectPlan = async (planId: string) => {
    try {
      setIsProcessing(true)
      
      if (currentSubscription) {
        // Change existing subscription
        const result = await changeSupplierSubscriptionPlan(planId)
        if (result.success) {
          toast.success('Plano alterado com sucesso!')
          await loadData()
          onPlanSelected?.()
        } else {
          toast.error(result.error || 'Erro ao alterar plano')
        }
      } else {
        // Create new subscription
        const result = await createSupplierSubscription(planId)
        if (result.success) {
          toast.success('Assinatura criada com sucesso!')
          await loadData()
          onPlanSelected?.()
        } else {
          toast.error(result.error || 'Erro ao criar assinatura')
        }
      }
    } catch (error) {
      console.error('Error selecting plan:', error)
      toast.error('Erro inesperado ao processar solicitação')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancelSubscription = async () => {
    try {
      setIsProcessing(true)
      const result = await cancelSupplierSubscription()
      
      if (result.success) {
        toast.success('Assinatura cancelada. Será finalizada no final do período.')
        await loadData()
      } else {
        toast.error(result.error || 'Erro ao cancelar assinatura')
      }
    } catch (error) {
      console.error('Error canceling subscription:', error)
      toast.error('Erro inesperado ao cancelar assinatura')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReactivateSubscription = async () => {
    try {
      setIsProcessing(true)
      const result = await reactivateSupplierSubscription()
      
      if (result.success) {
        toast.success('Assinatura reativada com sucesso!')
        await loadData()
      } else {
        toast.error(result.error || 'Erro ao reativar assinatura')
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error)
      toast.error('Erro inesperado ao reativar assinatura')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current subscription status */}
      {currentSubscription && (
        <Alert className={currentSubscription.cancelAtPeriodEnd ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}>
          {currentSubscription.cancelAtPeriodEnd ? (
            <>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700 flex items-center justify-between">
                <span>
                  <strong>Assinatura será cancelada</strong> em {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString('pt-BR')}.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReactivateSubscription}
                  disabled={isProcessing}
                  className="ml-4"
                >
                  {isProcessing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Reativar
                </Button>
              </AlertDescription>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 flex items-center justify-between">
                <span>
                  <strong>Assinatura ativa</strong> - Plano {currentSubscription.plan.name}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelSubscription}
                  disabled={isProcessing}
                  className="ml-4 text-red-600 border-red-200 hover:bg-red-50"
                >
                  {isProcessing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Cancelar
                </Button>
              </AlertDescription>
            </>
          )}
        </Alert>
      )}

      {/* Plans selector */}
      <SupplierPlanSelector
        plans={plans}
        currentPlan={currentSubscription?.plan || null}
        onSelectPlan={handleSelectPlan}
        isLoading={isProcessing}
      />

      {/* Additional information */}
      <div className="text-center text-sm text-muted-foreground space-y-2">
        <p>
          {currentSubscription 
            ? 'Alterações no plano são aplicadas imediatamente com cobrança proporcional.'
            : 'Você pode cancelar sua assinatura a qualquer momento.'
          }
        </p>
        <p>
          Dúvidas sobre os planos? Entre em contato com nosso suporte.
        </p>
      </div>
    </div>
  )
}