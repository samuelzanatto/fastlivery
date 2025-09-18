import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ 
        error: 'Email é obrigatório' 
      }, { status: 400 })
    }

    // Verificar se o usuário existe e ainda não foi verificado
    const user = await prisma.user.findUnique({ 
      where: { email },
      include: {
        employeeProfiles: true
      }
    })

    if (!user) {
      return NextResponse.json({ 
        error: 'Usuário não encontrado' 
      }, { status: 404 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ 
        error: 'Email já verificado' 
      }, { status: 400 })
    }

    // Verificar se é funcionário
    if (user.employeeProfiles.length === 0) {
      return NextResponse.json({ 
        error: 'Usuário não é funcionário' 
      }, { status: 400 })
    }

    // Reenviar OTP usando better-auth
    try {
      await auth.api.sendVerificationOTP({
        body: {
          email,
          type: "email-verification"
        }
      })

      return NextResponse.json({ 
        success: true,
        message: 'Código reenviado com sucesso' 
      })

    } catch (error) {
      console.error('Erro ao reenviar OTP:', error)
      return NextResponse.json({ 
        error: 'Erro ao reenviar código de verificação' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Erro ao reenviar OTP:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}