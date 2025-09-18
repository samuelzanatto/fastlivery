import { NextRequest, NextResponse } from 'next/server'
import { checkExpiredPayments } from '@/lib/payment-timeout'

export async function POST(_request: NextRequest) {
  try {
    const expiredCount = await checkExpiredPayments()
    
    return NextResponse.json({
      success: true,
      message: `${expiredCount} pedidos processados`,
      expiredCount
    })
  } catch (error) {
    console.error('Erro no timeout check:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
