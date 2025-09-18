import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json()
    
    if (!email || !otp) {
      return NextResponse.json({ error: 'Email e código obrigatórios' }, { status: 400 })
    }

    console.log('[verify-otp] Verificando OTP:', { email, otp })

    // Buscar OTP na tabela Verification (como grandes plataformas fazem)
    const verification = await prisma.verification.findUnique({
      where: { id: email }
    })

    if (!verification) {
      console.log('[verify-otp] Código não encontrado para:', email)
      return NextResponse.json({ 
        error: 'Código não encontrado. Solicite um novo código.' 
      }, { status: 400 })
    }

    // Verificar expiração
    if (verification.expiresAt < new Date()) {
      console.log('[verify-otp] Código expirado para:', email)
      // Remover código expirado
      await prisma.verification.delete({ where: { id: email } })
      
      return NextResponse.json({ 
        error: 'Código expirado. Solicite um novo código.' 
      }, { status: 400 })
    }

    // Verificar código
    if (verification.value !== otp) {
      console.log('[verify-otp] Código inválido para:', email, 'Esperado:', verification.value, 'Recebido:', otp)
      return NextResponse.json({ 
        error: 'Código inválido.' 
      }, { status: 400 })
    }

    console.log('[verify-otp] Verificação bem-sucedida para:', email)

    // Remover código usado (verificação única)
    await prisma.verification.delete({ where: { id: email } })

    return NextResponse.json({ 
      success: true, 
      message: 'Email verificado com sucesso',
      verified: true
    })

  } catch (error) {
    console.error('[verify-otp] Erro:', error)
    
    return NextResponse.json({ 
      error: 'Erro interno na verificação',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}