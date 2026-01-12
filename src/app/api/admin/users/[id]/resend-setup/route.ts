import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import nodemailer from 'nodemailer'

async function sendSetupEmail(to: string, token: string) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Configuração SMTP ausente (SMTP_HOST/SMTP_USER/SMTP_PASS)')
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const link = `${baseUrl}/setup-password/${token}`

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Defina sua senha no FastLivery',
    html: `
      <p>Você foi convidado(a) para acessar o painel do FastLivery.</p>
      <p>Defina sua senha pelo link abaixo (válido por 7 dias):</p>
      <p><a href="${link}">${link}</a></p>
      <p>Se não foi você, ignore este email.</p>
    `,
  })

  return link
}

async function verifyPlatformAdmin() {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })

  if (!session?.user) {
    return { error: 'Não autorizado', status: 401 }
  }

  const role = session.user.role
  if (role !== 'platformAdmin' && role !== 'platformSupport') {
    return { error: 'Acesso negado', status: 403 }
  }

  return { session }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyPlatformAdmin()
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: 'Usuário já verificado' }, { status: 400 })
    }

    // Limpar tokens antigos
    await prisma.passwordResetToken.deleteMany({ where: { userId: id } })

    // Gerar novo token de setup
    const resetToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')

    await prisma.passwordResetToken.create({
      data: {
        id: crypto.randomUUID(),
        userId: id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
      },
    })

    try {
      const link = await sendSetupEmail(user.email, resetToken)
      console.log(`[ADMIN] Reenvio de setup para ${user.email}: ${link}`)
      return NextResponse.json({ success: true, link })
    } catch (err) {
      console.error('Falha ao enviar email de setup:', err)
      return NextResponse.json({ error: 'Falha ao enviar email' }, { status: 500 })
    }
  } catch (error) {
    console.error('Erro ao reenviar setup:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
