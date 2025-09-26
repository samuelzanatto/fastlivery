import { prisma } from '@/lib/database/prisma'

/**
 * Remove todas as verificações expiradas do banco de dados
 * Deve ser executado periodicamente para manter o banco limpo
 */
export async function cleanupExpiredVerifications() {
  try {
    const result = await prisma.verification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })
    
    console.log('[cleanup-verifications] Removidas', result.count, 'verificações expiradas')
    return result.count
  } catch (error) {
    console.error('[cleanup-verifications] Erro ao limpar verificações expiradas:', error)
    return 0
  }
}

/**
 * Remove verificações específicas por padrão de ID
 * Útil para limpar tipos específicos de verificação
 */
export async function cleanupVerificationsByPattern(pattern: string) {
  try {
    const verifications = await prisma.verification.findMany({
      where: {
        id: {
          startsWith: pattern
        },
        expiresAt: {
          lt: new Date()
        }
      }
    })
    
    if (verifications.length > 0) {
      const result = await prisma.verification.deleteMany({
        where: {
          id: {
            in: verifications.map(v => v.id)
          }
        }
      })
      
      console.log('[cleanup-verifications] Removidas', result.count, `verificações expiradas com padrão "${pattern}"`)
      return result.count
    }
    
    return 0
  } catch (error) {
    console.error('[cleanup-verifications] Erro ao limpar verificações por padrão:', error)
    return 0
  }
}

/**
 * Middleware de limpeza automática que pode ser usado em endpoints
 * Remove verificações expiradas relacionadas ao contexto atual
 */
export async function autoCleanup(context?: 'otp' | 'checkout' | 'all') {
  try {
    let totalCleaned = 0
    
    if (context === 'otp' || context === 'all') {
      // Limpar OTPs expirados (aqueles que são apenas email como ID)
      const otpResult = await prisma.verification.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
          id: { contains: '@' } // OTPs usam email como ID
        }
      })
      totalCleaned += otpResult.count
    }
    
    if (context === 'checkout' || context === 'all') {
      // Limpar senhas de checkout expiradas
      const checkoutResult = await cleanupVerificationsByPattern('checkout:pwd:')
      totalCleaned += checkoutResult
    }
    
    if (context === 'all' || !context) {
      // Limpar qualquer outra verificação expirada
      const generalResult = await cleanupExpiredVerifications()
      totalCleaned += generalResult
    }
    
    if (totalCleaned > 0) {
      console.log('[auto-cleanup] Total de verificações limpas:', totalCleaned)
    }
    
    return totalCleaned
  } catch (error) {
    console.error('[auto-cleanup] Erro na limpeza automática:', error)
    return 0
  }
}