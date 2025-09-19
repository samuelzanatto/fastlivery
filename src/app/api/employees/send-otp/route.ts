import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

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

    console.log('[employees/send-otp] Enviando OTP para funcionário:', email)

    // Enviar OTP usando better-auth
    try {
      await auth.api.sendVerificationOTP({
        body: {
          email,
          type: "email-verification"
        }
      })

      console.log(`[employees/send-otp] OTP enviado com sucesso para: ${email}`)
      
      return NextResponse.json({ 
        success: true, 
        message: 'Código de verificação enviado para o email do funcionário'
      })

    } catch (error) {
      console.error('Erro ao enviar OTP via better-auth:', error)
      return NextResponse.json({ 
        error: 'Erro ao enviar código de verificação'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Erro ao processar envio de OTP:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}