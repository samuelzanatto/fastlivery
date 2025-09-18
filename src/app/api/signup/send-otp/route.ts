import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Throttle em memória (processo) para prevenir envios múltiplos em janela curta
// Extendendo o tipo global para armazenar mapa de throttling
interface GlobalWithSignupThrottle {
  __signupOtpLastSendMap?: Map<string, number>
}
const g = globalThis as GlobalWithSignupThrottle
const lastSendMap: Map<string, number> = g.__signupOtpLastSendMap || new Map<string, number>()
g.__signupOtpLastSendMap = lastSendMap

// Janela mínima entre envios (ms)
const THROTTLE_WINDOW_MS = 5000

export async function POST(request: NextRequest) {
  console.log('[DEBUG] Rota /api/signup/send-otp chamada')
  try {
    const { email, auto } = await request.json()
    console.log(`[DEBUG] Dados recebidos - email: ${email}, auto: ${auto}`)

    if (!email) {
      console.log('[DEBUG] Erro: Email não fornecido')
      return NextResponse.json({ 
        error: 'Email é obrigatório' 
      }, { status: 400 })
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log('[DEBUG] Erro: Email inválido')
      return NextResponse.json({ 
        error: 'Email inválido' 
      }, { status: 400 })
    }

    // Verificar se o email já não está em uso POR UMA CONTA COMPLETAMENTE CRIADA
    const existingUser = await prisma.user.findUnique({ 
      where: { email } 
    })
    console.log(`[DEBUG] Usuário existente encontrado: ${existingUser ? 'Sim' : 'Não'}`)

    // IMPORTANTE: Durante o signup, permitir OTP mesmo para emails "verificados" 
    // se o usuário ainda é temporário (name = 'Usuário Temporário')
    if (existingUser && existingUser.emailVerified && existingUser.name !== 'Usuário Temporário') {
      console.log('[DEBUG] Erro: Email já em uso por conta COMPLETA (não temporária)')
      return NextResponse.json({ 
        error: 'Este email já está em uso por uma conta verificada' 
      }, { status: 400 })
    }

    // Enviar OTP usando better-auth (com throttle idempotente)
    try {
      console.log(`[DEBUG] Iniciando processo de envio OTP para signup: ${email.toLowerCase()}`)
      const emailLower = email.toLowerCase()
      const now = Date.now()
      const last = lastSendMap.get(emailLower)

      if (last && now - last < THROTTLE_WINDOW_MS) {
        console.log(`[DEBUG] Throttle ativo: reutilizando envio recente para ${emailLower} (${(now - last)}ms < ${THROTTLE_WINDOW_MS}ms)`)
        return NextResponse.json({ 
          success: true,
          throttled: true,
          message: 'Código já enviado recentemente'
        })
      }
      
      // Primeiro, vamos tentar criar um usuário temporário se não existir
      // Isso garante que o sistema de OTP tenha uma referência
      if (!existingUser) {
        console.log(`[DEBUG] Criando usuário temporário para OTP`)
        try {
          await prisma.user.create({
            data: {
              email: emailLower,
              name: 'Usuário Temporário',
              emailVerified: false,
              isActive: false,
              userType: 'ADMIN' // Para cadastro de empresa
            }
          })
          console.log(`[DEBUG] Usuário temporário criado com sucesso`)
        } catch (createError) {
          console.log(`[DEBUG] Erro ao criar usuário temporário (pode já existir):`, createError)
          // Continua mesmo se falhar - pode ser que o usuário já exista
        }
      } else if (existingUser.name === 'Usuário Temporário') {
        console.log(`[DEBUG] Reaproveitando usuário temporário existente`)
        // Usuário temporário existente - permitir nova verificação
        // Resetar emailVerified para false para permitir nova verificação
        await prisma.user.update({
          where: { email: emailLower },
          data: { emailVerified: false }
        })
        console.log(`[DEBUG] Usuário temporário resetado para nova verificação`)
      }
      
      console.log(`[DEBUG] Chamando auth.api.sendVerificationOTP...`)
      await auth.api.sendVerificationOTP({
        body: {
          email: emailLower,
          type: "email-verification"
        }
      })

      console.log(`[DEBUG] auth.api.sendVerificationOTP concluído para: ${emailLower}`)
      lastSendMap.set(emailLower, now)
      
      return NextResponse.json({ 
        success: true,
        message: 'Código de verificação enviado para seu email',
        auto: Boolean(auto)
      })

    } catch (error) {
      console.error('[DEBUG] Erro ao enviar OTP para signup:', error)
      return NextResponse.json({ 
        error: 'Erro ao enviar código de verificação. Tente novamente.' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[DEBUG] Erro geral na API de envio de OTP para signup:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}