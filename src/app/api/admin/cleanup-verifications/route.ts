import { NextRequest, NextResponse } from 'next/server'
import { autoCleanup, cleanupExpiredVerifications } from '@/lib/utils/cleanup-verifications'

export async function POST(request: NextRequest) {
  try {
    // Verificar se é uma chamada autorizada (pode adicionar autenticação aqui)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CLEANUP_API_TOKEN
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    console.log('[cleanup] Iniciando limpeza manual de verificações expiradas')
    
    const totalCleaned = await cleanupExpiredVerifications()
    
    return NextResponse.json({
      success: true,
      message: `Limpeza concluída. ${totalCleaned} verificações expiradas removidas.`,
      cleaned: totalCleaned
    })

  } catch (error) {
    console.error('[cleanup] Erro na limpeza:', error)
    return NextResponse.json({
      error: 'Erro interno na limpeza',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Status da limpeza automática - retorna estatísticas
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'otp' | 'checkout' | 'all' || 'all'
    
    console.log('[cleanup] Verificando status de limpeza para tipo:', type)
    
    // Executar limpeza automática e retornar estatísticas
    const cleaned = await autoCleanup(type)
    
    return NextResponse.json({
      success: true,
      message: 'Status de limpeza obtido',
      type,
      cleaned,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[cleanup] Erro ao obter status:', error)
    return NextResponse.json({
      error: 'Erro ao obter status de limpeza',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}