import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import { auth } from '@/lib/auth/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se o usuário existe no banco
    const userInDb = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    // Buscar todos os usuários com email similar
    const usersWithEmail = await prisma.user.findMany({
      where: { email: session.user.email }
    })

    // Informações da sessão
    const sessionInfo = {
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
      userEmailVerified: session.user.emailVerified
    }

    return NextResponse.json({
      sessionInfo,
      userExistsInDb: !!userInDb,
      userInDb,
      usersWithEmail,
      totalUsersWithEmail: usersWithEmail.length
    })
  } catch (error) {
    console.error('Erro no debug de usuário:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}