'use server'

import { canAddProduct, canAddPartnership, checkLimitProximity } from '@/lib/subscription/limits-enforcement'

/**
 * Server action para verificar se pode adicionar um produto
 */
export async function checkCanAddProduct() {
  try {
    const result = await canAddProduct()
    return result
  } catch (error) {
    console.error('Error checking product limit:', error)
    return {
      canProceed: false,
      error: 'Erro ao verificar limite de produtos'
    }
  }
}

/**
 * Server action para verificar se pode adicionar uma parceria
 */
export async function checkCanAddPartnership() {
  try {
    const result = await canAddPartnership()
    return result
  } catch (error) {
    console.error('Error checking partnership limit:', error)
    return {
      canProceed: false,
      error: 'Erro ao verificar limite de parcerias'
    }
  }
}

/**
 * Server action para verificar proximidade aos limites (para notificações)
 */
export async function checkSupplierLimitWarnings() {
  try {
    const result = await checkLimitProximity()
    return result
  } catch (error) {
    console.error('Error checking limit warnings:', error)
    return {
      hasWarnings: false,
      warnings: []
    }
  }
}