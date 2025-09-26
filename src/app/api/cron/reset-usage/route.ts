import { NextRequest, NextResponse } from 'next/server'
import SubscriptionService from '@/lib/billing/subscription-service'

export async function POST(request: NextRequest) {
  try {
    // Verificar se a requisição tem autorização (via cron secret)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'default-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Resetar contadores mensais
    await SubscriptionService.resetMonthlyUsage()

    return NextResponse.json({ 
      success: true, 
      message: 'Contadores mensais resetados com sucesso',
      timestamp: new Date().toISOString() 
    })
  } catch (error) {
    console.error('Erro ao resetar contadores mensais:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
