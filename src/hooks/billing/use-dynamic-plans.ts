'use client'

import { useState, useEffect } from 'react'
import { getBillingPlans } from '@/actions/subscription/subscription'

export interface DynamicPlan {
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

export interface UseDynamicPlansReturn {
  plans: DynamicPlan[]
  deliveryPlans: DynamicPlan[]
  supplierPlans: DynamicPlan[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useDynamicPlans(): UseDynamicPlansReturn {
  const [plans, setPlans] = useState<DynamicPlan[]>([])
  const [deliveryPlans, setDeliveryPlans] = useState<DynamicPlan[]>([])
  const [supplierPlans, setSupplierPlans] = useState<DynamicPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlans = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Buscar planos para empresas de delivery
      const deliveryResult = await getBillingPlans('delivery_company')
      // Buscar planos para fornecedores
      const supplierResult = await getBillingPlans('supplier')
      
      if (!deliveryResult.success || !supplierResult.success) {
        const deliveryError = !deliveryResult.success ? (deliveryResult as { success: false; error: string }).error : ''
        const supplierError = !supplierResult.success ? (supplierResult as { success: false; error: string }).error : ''
        throw new Error(deliveryError || supplierError || 'Erro ao carregar planos')
      }
      
      // Mapear planos de delivery (manter todos)
      const mappedDeliveryPlans: DynamicPlan[] = deliveryResult.data.plans
        .map(plan => ({
          id: `delivery_${plan.id}`, // Adicionar prefixo para evitar keys duplicadas
          name: plan.name,
          description: plan.description,
          price: Math.round(parseFloat(plan.price) * 100), // Converter reais para centavos
          currency: 'BRL',
          interval: plan.metadata.interval || 'month',
          limits: {
            maxOrders: Number(plan.metadata.maxOrders) || 100,
            maxProducts: Number(plan.metadata.maxProducts) || 50,
            maxTables: Number(plan.metadata.maxTables) || 20,
            maxUsers: Number(plan.metadata.maxUsers) || 5,
            hasAdvancedAnalytics: Boolean(plan.metadata.hasAdvancedAnalytics),
            hasPrioritySupport: Boolean(plan.metadata.hasPrioritySupport),
            hasCustomBranding: Boolean(plan.metadata.hasCustomBranding)
          },
          stripePriceId: plan.priceId || ''
        }))
      
      // Mapear planos de fornecedor (excluir apenas "Plano Enterprise - Fornecedor")
      const mappedSupplierPlans: DynamicPlan[] = supplierResult.data.plans
        .filter(plan => {
          // Excluir apenas o plano "Enterprise - Fornecedor" específico
          return !(plan.name.toLowerCase().includes('enterprise') && plan.name.toLowerCase().includes('fornecedor'))
        })
        .map(plan => ({
        id: `supplier_${plan.id}`, // Adicionar prefixo para evitar keys duplicadas
        name: plan.name,
        description: plan.description,
        price: Math.round(parseFloat(plan.price) * 100), // Converter reais para centavos
        currency: 'BRL',
        interval: plan.metadata.interval || 'month',
        limits: {
          maxOrders: Number(plan.metadata.maxOrders) || 100,
          maxProducts: Number(plan.metadata.maxProducts) || 50,
          maxTables: Number(plan.metadata.maxTables) || 20,
          maxUsers: Number(plan.metadata.maxUsers) || 5,
          hasAdvancedAnalytics: Boolean(plan.metadata.hasAdvancedAnalytics),
          hasPrioritySupport: Boolean(plan.metadata.hasPrioritySupport),
          hasCustomBranding: Boolean(plan.metadata.hasCustomBranding)
        },
        stripePriceId: plan.priceId || ''
      }))
      
      const sortedDeliveryPlans = mappedDeliveryPlans.sort((a, b) => a.price - b.price)
      const sortedSupplierPlans = mappedSupplierPlans.sort((a, b) => a.price - b.price)
      
      // Planos combinados (para compatibilidade)
      const allPlans = [...sortedDeliveryPlans, ...sortedSupplierPlans]
      
      setPlans(allPlans)
      setDeliveryPlans(sortedDeliveryPlans)
      setSupplierPlans(sortedSupplierPlans)
    } catch (err) {
      console.error('Erro ao carregar planos:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }

  const refetch = async () => {
    await fetchPlans()
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  return {
    plans,
    deliveryPlans,
    supplierPlans,
    isLoading,
    error,
    refetch
  }
}
