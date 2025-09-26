import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    console.log('[customer-mark-verified] Marcando email como verificado:', email)

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }

    // Encontrar o usuário pelo email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      console.log('[customer-mark-verified] Usuário não encontrado:', email)
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Marcar email como verificado
    await prisma.user.update({
      where: { email },
      data: { emailVerified: true }
    })

    console.log('[customer-mark-verified] Email marcado como verificado:', email)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Email marcado como verificado' 
    })

  } catch (error) {
    console.error('[customer-mark-verified] Erro:', error)
    
    return NextResponse.json({ 
      error: 'Erro interno ao marcar email como verificado',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}