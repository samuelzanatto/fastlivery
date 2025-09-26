import { NextRequest, NextResponse } from 'next/server'
import { cleanupExpiredVerifications } from '@/lib/utils/cleanup-verifications'

/**
 * Cron job do Vercel para limpeza automática de verificações expiradas
 * Executado a cada hora via vercel.json
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[cron-cleanup] Iniciando limpeza automática de verificações expiradas')
    
    // Verificar se é uma chamada do cron do Vercel (OBRIGATÓRIO em produção)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // Em produção, SEMPRE validar o CRON_SECRET
    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        console.log('[cron-cleanup] Tentativa de acesso não autorizada em produção')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else {
      // Em desenvolvimento, permitir sem secret mas logar warning
      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.log('[cron-cleanup] AVISO: CRON_SECRET não confere em desenvolvimento')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }
    
    const startTime = Date.now()
    const totalCleaned = await cleanupExpiredVerifications()
    const duration = Date.now() - startTime
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      cleaned: totalCleaned,
      duration_ms: duration,
      message: `Limpeza automática concluída: ${totalCleaned} verificações removidas em ${duration}ms`
    }
    
    console.log('[cron-cleanup]', result.message)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('[cron-cleanup] Erro na limpeza automática:', error)
    
    const errorResult = {
      success: false,
      timestamp: new Date().toISOString(),
      error: 'Falha na limpeza automática',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
    
    return NextResponse.json(errorResult, { status: 500 })
  }
}

// Para compatibilidade com outros métodos HTTP (caso necessário)
export const POST = GET