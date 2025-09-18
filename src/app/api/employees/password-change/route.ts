import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = sessionResponse.user

    // Verificar se é funcionário e se precisa trocar senha
    const employeeProfile = await prisma.employeeProfile.findFirst({
      where: { userId: user.id },
      include: { user: true }
    })

    if (!employeeProfile) {
      return NextResponse.json({ 
        requiresPasswordChange: false,
        isEmployee: false 
      })
    }

    // Verificar se o usuário foi criado recentemente e ainda não verificou o email
    // ou se há indicação nas notas de que precisa trocar senha
    const requiresPasswordChange = 
      !employeeProfile.user.emailVerified || 
      (employeeProfile.notes && employeeProfile.notes.includes('TempPass123!'))

    return NextResponse.json({
      requiresPasswordChange,
      isEmployee: true,
      isEmailVerified: employeeProfile.user.emailVerified,
      userName: employeeProfile.user.name,
      userEmail: employeeProfile.user.email
    })

  } catch (error) {
    console.error('Erro ao verificar status da senha:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

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
        error: 'Nova senha deve ter pelo menos 8 caracteres' 
      }, { status: 400 })
    }

    // Verificar senha atual e trocar por nova usando BetterAuth
    try {
      const changeResult = await auth.api.changePassword({
        body: {
          currentPassword,
          newPassword
        },
        headers: request.headers
      })

      if (!changeResult.user) {
        return NextResponse.json({ 
          error: 'Senha atual incorreta' 
        }, { status: 400 })
      }

      // Atualizar notes do funcionário para remover referência à senha padrão
      await prisma.employeeProfile.updateMany({
        where: { userId: sessionResponse.user.id },
        data: {
          notes: null // Remove a referência à senha padrão
        }
      })

      // Marcar email como verificado se era funcionário novo
      await prisma.user.update({
        where: { id: sessionResponse.user.id },
        data: {
          emailVerified: true,
          isActive: true
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Senha alterada com sucesso'
      })

    } catch (error) {
      console.error('Erro ao trocar senha:', error)
      return NextResponse.json({ 
        error: 'Erro ao alterar senha. Verifique a senha atual.' 
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Erro ao processar troca de senha:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}