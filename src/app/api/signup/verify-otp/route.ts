import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json()

    if (!email || !otp) {
      return NextResponse.json({ 
        error: 'Email e código OTP são obrigatórios' 
      }, { status: 400 })
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Email inválido' 
      }, { status: 400 })
    }

    // Validar formato do OTP (6 dígitos)
    const otpRegex = /^\d{6}$/
    if (!otpRegex.test(otp)) {
      return NextResponse.json({ 
        error: 'Código OTP deve ter 6 dígitos' 
      }, { status: 400 })
    }

    // Verificar OTP usando better-auth
    try {
      console.log(`[DEBUG] Verificando OTP para signup: ${email.toLowerCase()}, OTP: ${otp}`)
      
      // Verificar se existe usuário
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
      if (!user) {
        console.log(`[DEBUG] Usuário não encontrado para verificação`)
        return NextResponse.json({ 
          error: 'Email não encontrado. Solicite um novo código.' 
        }, { status: 404 })
      }

      // SECURITY CHECK: Impedir verificação para qualquer usuário já ativo
      if (user.isActive && user.role) {
        console.log(`[DEBUG] SECURITY ERROR: Usuário ativo com role ${user.role} tentando verificação de signup - bloqueando`)
        
        let errorMessage = 'Esta conta já está ativa.'
        if (user.role === 'customer') {
          errorMessage = 'Esta conta de cliente já está ativa. Faça login na sua conta existente.'
        } else if (user.role === 'businessOwner') {
          errorMessage = 'Esta conta de empresa já está ativa. Faça login na sua conta existente.'
        } else if (user.role === 'supplierOwner') {
          errorMessage = 'Esta conta de fornecedor já está ativa. Faça login na sua conta existente.'
        }
        
        return NextResponse.json({ error: errorMessage, code: 'ACCOUNT_ACTIVE' }, { status: 409 })
      }
      
      const verificationResult = await auth.api.verifyEmailOTP({
        body: {
          email: email.toLowerCase(),
          otp
        }
      })

      console.log(`[DEBUG] Resultado da verificação:`, verificationResult)

      if (!verificationResult || !verificationResult.user) {
        console.log(`[DEBUG] Verificação falhou - resultado inválido`)
        return NextResponse.json({ 
          error: 'Código inválido ou expirado' 
        }, { status: 400 })
      }

      console.log(`[DEBUG] Verificação bem-sucedida para: ${email.toLowerCase()}`)
      
      // IMPORTANTE: NÃO marcar emailVerified = true durante signup
      // Isso só deve acontecer quando o cadastro for completamente finalizado
      // Por enquanto, apenas confirmamos que a verificação foi bem-sucedida
      
      // Verificação bem-sucedida
      return NextResponse.json({ 
        success: true,
        message: 'Email verificado com sucesso!',
        verified: true,
        user: {
          id: verificationResult.user.id,
          email: verificationResult.user.email,
          emailVerified: true // Informamos que foi verificado, mas não persistimos ainda
        }
      })

    } catch (error) {
      console.error('Erro na verificação OTP para signup:', error)
      
      // Verificar se é erro de código inválido ou expirado
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = String(error.message).toLowerCase()
        if (errorMessage.includes('invalid') || errorMessage.includes('expired') || 
            errorMessage.includes('not found') || errorMessage.includes('attempts')) {
          return NextResponse.json({ 
            error: 'Código inválido ou expirado' 
          }, { status: 400 })
        }
      }
      
      return NextResponse.json({ 
        error: 'Erro ao verificar código. Tente novamente.' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Erro na API de verificação OTP para signup:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}