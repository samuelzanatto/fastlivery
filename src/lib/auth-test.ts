// Teste básico do BetterAuth
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// Configuração mínima para teste
export const authTest = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false
  },
  secret: process.env.BETTER_AUTH_SECRET || "test-secret-key-for-debugging"
})

export type Session = typeof authTest.$Infer.Session.session
export type User = typeof authTest.$Infer.Session.user