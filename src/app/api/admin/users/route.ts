import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

// Verificar se é admin da plataforma
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

// GET - Listar todos os usuários
export async function GET(request: Request) {
  try {
    const authResult = await verifyPlatformAdmin()
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const available = searchParams.get('available')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (role) {
      where.role = role
    }

    // Se buscar apenas disponíveis (sem empresa), para associar como dono
    if (available === 'true') {
      where.businessId = null
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        businessId: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Erro ao listar usuários:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Criar novo usuário
export async function POST(request: Request) {
  try {
    const authResult = await verifyPlatformAdmin()
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json()
    const {
      name,
      email,
      phone,
      role,
      businessId,
      isActive,
      sendSetupEmail,
    } = body

    // Validações básicas
    if (!name || !email || !role) {
      return NextResponse.json({ message: 'Campos obrigatórios não preenchidos' }, { status: 400 })
    }

    // Verificar se já existe usuário com este email
    const existingUser = await prisma.user.findFirst({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ message: 'Já existe um usuário com este email' }, { status: 400 })
    }

    const userId = crypto.randomUUID()
    const tempPassword = crypto.randomBytes(16).toString('hex')
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    await prisma.$transaction(async (tx) => {
      // Criar usuário
      await tx.user.create({
        data: {
          id: userId,
          name,
          email,
          phone: phone || null,
          role,
          businessId: businessId && businessId !== '_none' ? businessId : null,
          isActive: isActive ?? false,
          emailVerified: false,
        },
      })

      // Criar account credential
      await tx.account.create({
        data: {
          id: crypto.randomUUID(),
          accountId: email,
          providerId: 'credential',
          userId,
          type: 'credential',
          password: hashedPassword,
        },
      })

      // Se deve enviar email de setup
      if (sendSetupEmail) {
        const resetToken = crypto.randomBytes(32).toString('hex')
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')

        await tx.passwordResetToken.create({
          data: {
            id: crypto.randomUUID(),
            userId,
            tokenHash,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
          },
        })

        try {
          const link = await sendSetupEmail(email, resetToken)
          console.log(`[ADMIN] Link de setup para ${email}: ${link}`)
        } catch (err) {
          console.error('Falha ao enviar email de setup:', err)
        }
      }

      // Se associou a uma empresa, atualizar o ownerId dela
      if (businessId && businessId !== '_none' && role === 'businessOwner') {
        await tx.business.update({
          where: { id: businessId },
          data: { ownerId: userId },
        })
      }
    })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        businessId: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
