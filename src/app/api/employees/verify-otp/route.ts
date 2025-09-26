import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'

export async function POST(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { email, otp } = await request.json()

    if (!email || !otp) {
      return NextResponse.json({ 
        error: 'Email e código OTP são obrigatórios' 
      }, { status: 400 })
    }

    // Verificar OTP usando better-auth
    try {
      const verificationResult = await auth.api.verifyEmailOTP({
        body: {
          email,
          otp
        }
      })

      if (!verificationResult.user) {
        return NextResponse.json({ 
          error: 'Código inválido ou expirado' 
        }, { status: 400 })
      }

      // Ativar usuário e funcionário após verificação bem-sucedida
      await prisma.user.update({
        where: { email },
        data: {
          emailVerified: true,
          isActive: true
        }
      })

      // Ativar perfil de funcionário
      await prisma.employeeProfile.updateMany({
        where: { user: { email } },
        data: { isActive: true }
      })

      return NextResponse.json({ 
        success: true,
        message: 'Email verificado e funcionário ativado com sucesso',
        user: {
          id: verificationResult.user.id,
          email: verificationResult.user.email,
          emailVerified: true
        }
      })

    } catch (error) {
      console.error('Erro na verificação OTP:', error)
      return NextResponse.json({ 
        error: 'Código inválido ou expirado' 
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Erro ao verificar OTP:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}