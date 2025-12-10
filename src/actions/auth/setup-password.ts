'use server'
import { prisma } from '@/lib/database/prisma'
import { z } from 'zod'
import crypto from 'crypto'

const setupSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres').max(128),
  confirmPassword: z.string()
}).refine(d => d.password === d.confirmPassword, { 
  message: 'Senhas não conferem', 
  path: ['confirmPassword'] 
})

async function hashPassword(pwd: string) {
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

export async function setupPassword(form: { token: string, password: string, confirmPassword: string }) {
  const { token, password } = setupSchema.parse(form)
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const now = new Date()
  
  // Buscar token válido
  const record = await prisma.passwordResetToken.findFirst({ 
    where: { 
      tokenHash, 
      expiresAt: { gt: now }, 
      usedAt: null 
    }, 
    include: { 
      user: { 
        include: { accounts: true } 
      } 
    } 
  })
  
  if (!record) {
    return { success: false, error: 'Token inválido ou expirado. Solicite um novo convite.' }
  }

  // Hash da nova senha
  const hashed = await hashPassword(password)
  
  // Atualizar senha e ativar usuário
  await prisma.$transaction([
    // Atualizar senha na account credential
    prisma.account.updateMany({ 
      where: { userId: record.userId, type: 'credential' }, 
      data: { password: hashed } 
    }),
    // Ativar usuário e marcar email como verificado
    prisma.user.update({
      where: { id: record.userId },
      data: {
        isActive: true,
        emailVerified: true
      }
    }),
    // Marcar token como usado
    prisma.passwordResetToken.update({ 
      where: { id: record.id }, 
      data: { usedAt: now } 
    }),
    // Atualizar notas do perfil de funcionário (se existir)
    prisma.employeeProfile.updateMany({
      where: { userId: record.userId },
      data: { notes: null } // Remove a nota de "aguardando senha"
    })
  ])
  
  return { success: true }
}
