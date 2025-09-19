import { NextRequest, NextResponse } from 'next/server'
import { StripeSyncService } from '@/lib/stripe-sync'

// API Route para sincronização automática do Stripe via cron job
export async function GET(request: NextRequest) {
  try {
    // Verificar se é uma chamada autorizada (por segurança)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // Em desenvolvimento, permitir chamadas sem autenticação
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    if (!isDevelopment && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🕐 [CRON] Iniciando sincronização automática do Stripe...')
    const startTime = Date.now()
    
    // Sincronizar dados do Stripe
    const result = await StripeSyncService.fullSync()
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    const message = `Sincronização concluída em ${duration}s: ${result.products.length} produtos, ${result.prices.length} preços`
    
    console.log(`✅ [CRON] ${message}`)
    
    return NextResponse.json({
      success: true,
      message,
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      data: {
        products: result.products.length,
        prices: result.prices.length
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('❌ [CRON] Erro na sincronização automática:', errorMessage)
    console.error('❌ [CRON] Stack trace:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro na sincronização automática', 
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Também permitir POST para flexibilidade
export async function POST(request: NextRequest) {
  return GET(request)
}
