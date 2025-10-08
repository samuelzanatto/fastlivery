import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json()
    
    console.log('[customer-verify-otp] Verificando OTP:', { email, otp })

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email e código obrigatórios' }, { status: 400 })
    }

    // SECURITY CHECK: Verificar se email já está em uso por qualquer usuário ativo
    const existingUser = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    })
    
    if (existingUser && existingUser.isActive && existingUser.role) {
      console.log(`[customer-verify-otp] SECURITY ERROR: Email ${email} já em uso por usuário ativo com role ${existingUser.role}`)
      
      let errorMessage = 'Este email já está em uso.'
      if (existingUser.role === 'customer') {
        errorMessage = 'Este email já está associado a uma conta de cliente. Faça login na sua conta existente.'
      } else if (existingUser.role === 'businessOwner') {
        errorMessage = 'Este email já está associado a uma conta de empresa. Faça login na sua conta existente.'
      } else if (existingUser.role === 'supplierOwner') {
        errorMessage = 'Este email já está associado a uma conta de fornecedor. Faça login na sua conta existente.'
      }
      
      return NextResponse.json({ error: errorMessage, code: 'EMAIL_IN_USE' }, { status: 409 })
    }

    // Buscar verificação no banco (com prefixo customer)
    const verification = await prisma.verification.findUnique({
      where: { id: `customer:${email}` }
    })

    if (!verification) {
      console.log('[customer-verify-otp] Verificação não encontrada para:', email)
      return NextResponse.json({ error: 'Código inválido ou expirado' }, { status: 400 })
    }

    // Verificar se não expirou
    if (verification.expiresAt < new Date()) {
      console.log('[customer-verify-otp] Código expirado para:', email)
      await prisma.verification.delete({ where: { id: `customer:${email}` } })
      return NextResponse.json({ error: 'Código expirado' }, { status: 400 })
    }

    // Verificar se o código confere
    if (verification.value !== otp) {
      console.log('[customer-verify-otp] Código incorreto para:', email)
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
    }

    // Remover a verificação
    await prisma.verification.delete({ where: { id: `customer:${email}` } })

    console.log('[customer-verify-otp] Verificação bem-sucedida para:', email)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Email verificado com sucesso' 
    })

  } catch (error) {
    console.error('[customer-verify-otp] Erro:', error)
    
    return NextResponse.json({ 
      error: 'Erro interno na verificação',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}