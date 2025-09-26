'use server'

import { auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'

export interface PartnershipRequest {
  id: string
  companyId: string
  supplierId: string
  requesterId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  message?: string
  response?: string
  serviceIds: string[]
  expectedVolume?: string
  budget?: number
  timeline?: string
  respondedAt?: Date
  respondedById?: string
  createdAt: Date
  updatedAt: Date
  company?: {
    id: string
    name: string
    email: string
    website?: string
    logo?: string
  }
  supplier: {
    id: string
    companyId: string
    category: string
    company: {
      id: string
      name: string
      email: string
      website?: string
      logo?: string
    }
  }
  requester: {
    id: string
    name: string
    email: string
  }
  respondedBy?: {
    id: string
    name: string
    email: string
  }
}

// Função temporária simplificada para retornar dados mock
export async function getPartnershipRequests(): Promise<PartnershipRequest[]> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    
    if (!session?.user?.id) {
      return []
    }

    // Por enquanto retorna dados mock até ajustarmos a estrutura completa
    return []
  } catch (_error) {
    console.error('Erro ao buscar solicitações de parceria:', _error)
    return []
  }
}

export async function getSupplierPartnershipRequests(): Promise<PartnershipRequest[]> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    
    if (!session?.user?.id) {
      return []
    }

    return []
  } catch (_error) {
    console.error('Erro ao buscar solicitações de parceria do fornecedor:', _error)
    return []
  }
}

export async function getPartnershipRequestStats() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    
    if (!session?.user?.id) {
      return {
        sent: 0,
        received: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      }
    }

    return {
      sent: 0,
      received: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    }
  } catch (_error) {
    console.error('Erro ao obter estatísticas:', _error)
    return {
      sent: 0,
      received: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    }
  }
}

export interface CreatePartnershipRequestData {
  supplierId: string
  message?: string
  serviceIds?: string[]
  expectedVolume?: string
  budget?: number
  timeline?: string
}

export async function createPartnershipRequest(_data: CreatePartnershipRequestData) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    
    if (!session?.user?.id) {
      return {
        success: false,
        message: 'Não autorizado'
      }
    }

    // Implementação simplificada por enquanto
    return {
      success: true,
      message: 'Solicitação enviada com sucesso (mock)'
    }
  } catch (_error: unknown) {
    return {
      success: false,
      message: _error instanceof Error ? _error.message : 'Erro ao criar solicitação de parceria'
    }
  }
}

export async function respondToPartnershipRequest(data: {
  requestId: string
  status: 'APPROVED' | 'REJECTED'
  response?: string
}) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    
    if (!session?.user?.id) {
      return {
        success: false,
        message: 'Não autorizado'
      }
    }

    return {
      success: true,
      message: data.status === 'APPROVED' 
        ? 'Parceria aprovada com sucesso! (mock)' 
        : 'Solicitação rejeitada (mock)'
    }
  } catch (_error: unknown) {
    return {
      success: false,
      message: _error instanceof Error ? _error.message : 'Erro ao responder solicitação de parceria'
    }
  }
}

export async function cancelPartnershipRequest(_requestId: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    
    if (!session?.user?.id) {
      return {
        success: false,
        message: 'Não autorizado'
      }
    }

    return {
      success: true,
      message: 'Solicitação cancelada com sucesso (mock)'
    }
  } catch (_error: unknown) {
    return {
      success: false,
      message: _error instanceof Error ? _error.message : 'Erro ao cancelar solicitação de parceria'
    }
  }
}