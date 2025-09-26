import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import { autoCleanup } from '@/lib/utils/cleanup-verifications'
import nodemailer from 'nodemailer'

// Throttling em memória para OTPs
const otpSendMap = new Map<string, number>()
const THROTTLE_MINUTES = 1 // 1 minuto entre envios

// Configuração SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

// Gerar OTP de 6 dígitos
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 })
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    console.log('[send-verification-otp] Enviando OTP para verificação:', email)
    console.log('[send-verification-otp] SMTP Config:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER ? '***' : 'undefined',
      from: process.env.SMTP_FROM
    })

    // Limpeza automática de OTPs expirados
    autoCleanup('otp').catch(error => 
      console.warn('[send-verification-otp] Falha na limpeza automática:', error)
    )

    // Throttling: verificar último envio
    const lastSent = otpSendMap.get(email)
    const now = Date.now()
    const throttleTime = THROTTLE_MINUTES * 60 * 1000

    if (lastSent && (now - lastSent) < throttleTime) {
      const waitTime = Math.ceil((throttleTime - (now - lastSent)) / 1000)
      return NextResponse.json({ 
        error: `Aguarde ${waitTime} segundos antes de solicitar novo código` 
      }, { status: 429 })
    }

    // Gerar OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos
    
    console.log(`[send-verification-otp] OTP gerado: ${otp} para ${email}`)

    // Armazenar na tabela Verification (como grandes plataformas fazem)
    await prisma.verification.upsert({
      where: {
        id: email // Usar email como ID único para essa verificação
      },
      update: {
        value: otp,
        expiresAt,
        updatedAt: new Date(),
      },
      create: {
        id: email,
        identifier: email,
        value: otp,
        expiresAt,
      }
    })

    // Enviar email
    const transporter = createTransporter()
    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">FastLivery</h1>
        </div>
        
        <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <h2 style="color: #1e293b; margin: 0 0 16px 0;">Seu código de verificação</h2>
          <p style="color: #64748b; margin: 0 0 20px 0;">
            Use o código abaixo para verificar seu email:
          </p>
          
          <div style="text-align: center; margin: 20px 0;">
            <span style="
              background: #2563eb;
              color: white;
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 24px;
              font-weight: bold;
              letter-spacing: 4px;
              display: inline-block;
            ">${otp}</span>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0;">
            Este código expira em 10 minutos. Se você não solicitou este código, ignore este email.
          </p>
        </div>
        
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
          © 2024 FastLivery. Todos os direitos reservados.
        </p>
      </div>
    `

    await transporter.sendMail({
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'Código de Verificação - FastLivery',
      html,
    })

    // Marcar último envio
    otpSendMap.set(email, now)
    
    console.log(`[send-verification-otp] OTP ${otp} enviado com sucesso para: ${email}`)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Código de verificação enviado para seu email'
    })

  } catch (error) {
    console.error('[send-verification-otp] Erro:', error)
    
    return NextResponse.json({ 
      error: 'Erro ao enviar código de verificação',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}