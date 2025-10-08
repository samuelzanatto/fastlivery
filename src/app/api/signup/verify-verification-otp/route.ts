import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[verify-verification-otp] Dados recebidos:', { 
      email: body.email, 
      otp: body.otp ? '***' : 'missing', 
      verificationType: body.verificationType 
    })
    
    const { email, otp, verificationType = 'signup' } = body
    
    if (!email || !otp) {
      console.log('[verify-verification-otp] Dados inválidos:', { email: !!email, otp: !!otp })
      return NextResponse.json({ error: 'Email e código obrigatórios' }, { status: 400 })
    }

    // Validar formato do OTP (deve ser 6 dígitos)
    if (!/^\d{6}$/.test(otp)) {
      console.log('[verify-verification-otp] Formato de OTP inválido:', otp)
      return NextResponse.json({ 
        error: 'Código deve ter 6 dígitos numéricos.' 
      }, { status: 400 })
    }

    console.log('[verify-verification-otp] Verificando OTP para:', email)

    // SECURITY CHECK: Verificar se email já está em uso por qualquer usuário ativo
    const existingUser = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    })
    
    if (existingUser && existingUser.isActive && existingUser.role) {
      console.log(`[verify-verification-otp] SECURITY ERROR: Email ${email} já em uso por usuário ativo com role ${existingUser.role}`)
      
      let errorMessage = 'Este email já está em uso.'
      if (existingUser.role === 'customer') {
        errorMessage = 'Este email já está associado a uma conta de cliente. Faça login na sua conta existente.'
      } else if (existingUser.role === 'businessOwner') {
        errorMessage = 'Este email já está associado a uma conta de empresa. Faça login na sua conta existente.'
      } else if (existingUser.role === 'supplierOwner') {
        errorMessage = 'Este email já está associado a uma conta de fornecedor. Faça login na sua conta existente.'
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        code: 'EMAIL_IN_USE'
      }, { status: 409 })
    }

    // Buscar OTP na tabela Verification (como grandes plataformas fazem)
    const verification = await prisma.verification.findUnique({
      where: { id: email }
    })

    console.log('[verify-verification-otp] Verificação encontrada:', !!verification)

    if (!verification) {
      console.log('[verify-verification-otp] Código não encontrado para:', email)
      return NextResponse.json({ 
        error: 'Código não encontrado. Solicite um novo código.',
        code: 'OTP_NOT_FOUND'
      }, { status: 400 })
    }

    // Verificar expiração
    if (verification.expiresAt < new Date()) {
      console.log('[verify-verification-otp] Código expirado para:', email)
      // Remover código expirado
      try {
        await prisma.verification.delete({ where: { id: email } })
      } catch (deleteError) {
        console.warn('[verify-verification-otp] Erro ao remover código expirado:', deleteError)
      }
      
      return NextResponse.json({ 
        error: 'Código expirado. Solicite um novo código.',
        code: 'OTP_EXPIRED'
      }, { status: 400 })
    }

    // Verificar código
    if (verification.value !== otp) {
      console.log('[verify-verification-otp] Código inválido para:', email)
      return NextResponse.json({ 
        error: 'Código inválido.',
        code: 'OTP_INVALID'
      }, { status: 400 })
    }

    console.log('[verify-verification-otp] Verificação bem-sucedida para:', email)

    // Remover código usado (verificação única)
    try {
      await prisma.verification.delete({ where: { id: email } })
      console.log('[verify-verification-otp] Código removido após uso')
    } catch (deleteError) {
      console.warn('[verify-verification-otp] Erro ao remover código usado:', deleteError)
      // Não falha o processo se não conseguiu remover
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Email verificado com sucesso',
      verified: true,
      verificationType
    })

  } catch (error) {
    console.error('[verify-verification-otp] Erro:', error)
    
    return NextResponse.json({ 
      error: 'Erro interno na verificação',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    }, { status: 500 })
  }
}