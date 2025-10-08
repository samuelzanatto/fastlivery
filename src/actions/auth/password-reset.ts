'use server'
import { prisma } from '@/lib/database/prisma'
import { z } from 'zod'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

const requestSchema = z.object({
  email: z.string().email('Email inválido')
})

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8,'Senha deve ter no mínimo 8 caracteres').max(128),
  confirmPassword: z.string()
}).refine(d => d.password === d.confirmPassword, { message: 'Senhas não conferem', path: ['confirmPassword'] })

async function sendMail(to: string, subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  })
  await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, html })
}

export async function requestPasswordReset(form: { email: string }) {
  const { email } = requestSchema.parse(form)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    // Para evitar enumeração, retornar sucesso mesmo assim
    return { success: true }
  }
  const now = new Date()
  // invalidar tokens antigos (opcional)
  await prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } })

  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60) // 1 hora

  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const link = `${baseUrl}/reset-password/${rawToken}`

  await sendMail(user.email, 'Redefinição de Senha', `
    <p>Você solicitou a redefinição de senha.</p>
    <p>Clique no link abaixo (válido por 1 hora):</p>
    <p><a href="${link}">${link}</a></p>
    <p>Se não foi você, ignore este email.</p>
  `)

  return { success: true }
}

export async function resetPassword(form: { token: string, password: string, confirmPassword: string }) {
  const { token, password } = resetSchema.parse(form)
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const now = new Date()
  const record = await prisma.passwordResetToken.findFirst({ where: { tokenHash, expiresAt: { gt: now }, usedAt: null }, include: { user: { include: { accounts: true } } } })
  if (!record) {
    return { success: false, error: 'Token inválido ou expirado' }
  }

  // Atualizar senha no(s) account(s) credential do usuário
  const hashed = await hashPassword(password)
  await prisma.$transaction([
    prisma.account.updateMany({ where: { userId: record.userId, type: 'credential' }, data: { password: hashed } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: now } })
  ])
  return { success: true }
}

async function hashPassword(pwd: string) {
  // Usar bcrypt se já instalado, senão fallback para scrypt
  try {
    const bcrypt = await import('bcryptjs')
    const salt = await bcrypt.genSalt(10)
    return await bcrypt.hash(pwd, salt)
  } catch {
    return await new Promise<string>((resolve, reject) => {
      const salt = crypto.randomBytes(16)
      crypto.scrypt(pwd, salt, 64, (err, derivedKey) => {
        if (err) reject(err)
        else resolve(salt.toString('hex') + ':' + derivedKey.toString('hex'))
      })
    })
  }
}
