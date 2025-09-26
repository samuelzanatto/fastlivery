import { NextRequest, NextResponse } from 'next/server'
import { getAppUrl } from '@/lib/utils/urls'

/**
 * Endpoint para disparar verificação de timeouts via cron job
 * Pode ser usado com serviços como Vercel Cron, cron-job.org, etc.
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar se tem o header correto do cron
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Chamar o endpoint de verificação de timeout
    const baseUrl = getAppUrl()
    const apiKey = process.env.INTERNAL_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Chave API interna não configurada' }, { status: 500 })
    }

    const response = await fetch(`${baseUrl}/api/payments/check-timeouts`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(`Erro na verificação: ${result.error}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Verificação de timeout executada via cron',
      timestamp: new Date().toISOString(),
      result
    })

  } catch (error) {
    console.error('[CRON] Erro ao executar verificação de timeout:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}