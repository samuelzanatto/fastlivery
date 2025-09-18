import { NextRequest, NextResponse } from 'next/server'
import { StripeSyncService } from '@/lib/stripe-sync'

// API Route que pode ser chamada por cron job (Vercel Cron, GitHub Actions, etc.)
export async function GET(request: NextRequest) {
  try {
    // Verificar se é uma chamada autorizada (por segurança)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🕐 Iniciando sincronização automática do Stripe...')
    
    // Sincronizar dados do Stripe
    const result = await StripeSyncService.fullSync()
    
    console.log(`✅ Sincronização automática concluída: ${result.products.length} produtos, ${result.prices.length} preços`)
    
    return NextResponse.json({
      success: true,
      message: `Sincronização concluída: ${result.products.length} produtos, ${result.prices.length} preços`,
      timestamp: new Date().toISOString(),
      data: result
    })
  } catch (error) {
    console.error('❌ Erro na sincronização automática:', error)
    return NextResponse.json(
      { 
        error: 'Erro na sincronização automática', 
        details: error instanceof Error ? error.message : 'Erro desconhecido',
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
