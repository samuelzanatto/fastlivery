import SubscriptionService from '@/lib/billing/subscription-service'

export class LimitError extends Error {
  constructor(message: string, public limitType: string) {
    super(message)
    this.name = 'LimitError'
  }
}

export async function checkLimit(businessId: string, type: 'order' | 'product' | 'table' | 'user') {
  const canCreate = await SubscriptionService.canCreate(businessId, type)

  if (!canCreate) {
    const messages = {
      order: 'Limite mensal de pedidos atingido. Faça upgrade do seu plano para continuar.',
      product: 'Limite de produtos atingido. Faça upgrade do seu plano para adicionar mais produtos.',
      table: 'Limite de mesas atingido. Faça upgrade do seu plano para adicionar mais mesas.',
      user: 'Limite de usuários atingido. Faça upgrade do seu plano para adicionar mais usuários.',
    }
    
    throw new LimitError(messages[type], type)
  }
  
  return true
}

export async function incrementUsageAfterCreate(businessId: string, type: 'order' | 'product' | 'table' | 'user') {
  try {
    await SubscriptionService.incrementUsage(businessId, type)
  } catch (error) {
    console.error(`Erro ao incrementar uso de ${type}:`, error)
    // Não falhar a operação por causa do tracking de uso
  }
}

export async function decrementUsageAfterDelete(businessId: string, type: 'order' | 'product' | 'table' | 'user') {
  try {
    await SubscriptionService.decrementUsage(businessId, type)
  } catch (error) {
    console.error(`Erro ao decrementar uso de ${type}:`, error)
    // Não falhar a operação por causa do tracking de uso
  }
}

// Middleware para APIs que criam novos recursos
export function withLimitCheck(type: 'order' | 'product' | 'table' | 'user') {
  return function(target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function(...args: unknown[]) {
      try {
        // Assumindo que o primeiro argumento é o businessId
        const businessId = args[0] as string

        // Verificar limite antes de criar
        await checkLimit(businessId, type)

        // Executar a função original
        const result = await method.apply(this, args)
        
        // Incrementar uso após criação bem-sucedida
        await incrementUsageAfterCreate(businessId, type)
        
        return result
      } catch (error) {
        throw error
      }
    }

    return descriptor
  }
}

const limitMiddleware = {
  checkLimit,
  incrementUsageAfterCreate,
  decrementUsageAfterDelete,
  withLimitCheck,
  LimitError,
}

export default limitMiddleware
