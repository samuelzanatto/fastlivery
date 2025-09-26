import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { withRateLimit } from '@/lib/security/rate-limit'
import { createAuthErrorResponse, handleBetterAuthError, validateEmail } from '@/lib/security/auth-errors'

const handleSendOTP = async (request: NextRequest) => {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return createAuthErrorResponse('UNAUTHORIZED', null, {
        route: '/api/employees/send-otp',
        action: 'send_otp'
      })
    }

    const { email } = await request.json()

    // Validar email usando sistema padronizado
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      return createAuthErrorResponse(emailValidation.error!.code, emailValidation.error!.details, {
        userId: sessionResponse.user.id,
        email: sessionResponse.user.email,
        route: '/api/employees/send-otp'
      })
    }    console.log('[employees/send-otp] Enviando OTP para funcionário:', email)

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
      const authError = handleBetterAuthError(error, {
        userId: sessionResponse.user.id,
        email: email,
        route: '/api/employees/send-otp',
        action: 'send_verification_otp'
      })
      
      return createAuthErrorResponse(authError.code, authError.details, {
        userId: sessionResponse.user.id,
        email: email,
        route: '/api/employees/send-otp'
      })
    }

  } catch (error) {
    console.error('Erro crítico ao processar envio de OTP:', error)
    return createAuthErrorResponse('INTERNAL_ERROR', error, {
      route: '/api/employees/send-otp',
      action: 'critical_error'
    })
  }
}

// Aplicar rate limiting para OTPs
export const POST = withRateLimit('otp', handleSendOTP)