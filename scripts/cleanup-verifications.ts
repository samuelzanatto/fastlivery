#!/usr/bin/env node

/**
 * Script de limpeza automática para ser executado como cron job
 * 
 * Uso:
 * - Como cron job: adicionar ao crontab para executar a cada hora
 *   0 * * * * /path/to/node /path/to/this/script.js
 * 
 * - Manualmente: node scripts/cleanup-verifications.js
 * 
 * - Com PM2: pm2 start scripts/cleanup-verifications.js --cron "0 * * * *"
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanup() {
  try {
    console.log('[cleanup-script] Iniciando limpeza periódica de verificações expiradas')
    console.log('[cleanup-script] Timestamp:', new Date().toISOString())
    
    // Remover todas as verificações expiradas
    const result = await prisma.verification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })
    
    console.log('[cleanup-script] Limpeza concluída:', result.count, 'registros removidos')
    
    // Estatísticas adicionais
    const remainingCount = await prisma.verification.count()
    console.log('[cleanup-script] Verificações restantes no sistema:', remainingCount)
    
    // Verificar se há registros muito antigos (mais de 24h) que ainda não expiraram
    const oldRecords = await prisma.verification.count({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 horas atrás
        }
      }
    })
    
    if (oldRecords > 0) {
      console.warn('[cleanup-script] Atenção:', oldRecords, 'verificações antigas (>24h) ainda ativas')
    }
    
    return {
      cleaned: result.count,
      remaining: remainingCount,
      oldRecords
    }
    
  } catch (error) {
    console.error('[cleanup-script] Erro durante limpeza:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar apenas se chamado diretamente (não importado)
if (require.main === module) {
  cleanup()
    .then((stats) => {
      console.log('[cleanup-script] Limpeza finalizada com sucesso:', stats)
      process.exit(0)
    })
    .catch((error) => {
      console.error('[cleanup-script] Falha na limpeza:', error)
      process.exit(1)
    })
}

export { cleanup }