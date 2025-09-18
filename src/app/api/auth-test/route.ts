import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Teste 1: Conexão básica do Prisma
    await prisma.$connect()
    
    // Teste 2: Contar usuários
    const userCount = await prisma.user.count()
    
    // Teste 3: Verificar se tabelas BetterAuth existem
    const sessionCount = await prisma.session.count()
    const accountCount = await prisma.account.count()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database funcionando corretamente',
      stats: {
        users: userCount,
        sessions: sessionCount,
        accounts: accountCount
      }
    })
  } catch (error) {
    console.error('Erro no teste database:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}