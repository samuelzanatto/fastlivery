import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ 
        error: 'Senha atual e nova senha são obrigatórias' 
      }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ 
        error: 'A nova senha deve ter pelo menos 8 caracteres' 
      }, { status: 400 })
    }

    // Usar BetterAuth para alterar senha
    try {
      await auth.api.changePassword({
        body: {
          currentPassword,
          newPassword,
          revokeOtherSessions: false
        },
        headers: request.headers
      })

      return NextResponse.json({ 
        success: true,
        message: 'Senha alterada com sucesso' 
      })

    } catch (error) {
      console.error('Erro ao alterar senha via BetterAuth:', error)
      return NextResponse.json({ 
        error: 'Senha atual incorreta ou erro ao alterar senha' 
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Erro ao alterar senha:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}