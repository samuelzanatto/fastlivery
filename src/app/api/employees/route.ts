import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId obrigatório' }, { status: 400 })
    }

    // Verificar se usuário tem acesso ao restaurante
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { ownerId: true }
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 })
    }

    const isOwner = restaurant.ownerId === sessionResponse.user.id
    
    if (!isOwner) {
      // Verificar se é funcionário
      const employeeProfile = await prisma.employeeProfile.findFirst({
        where: {
          userId: sessionResponse.user.id,
          restaurantId,
          isActive: true
        }
      })
      
      if (!employeeProfile) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
      }
    }

    const employees = await prisma.employeeProfile.findMany({
      where: { restaurantId },
      include: {
        user: {
          select: { 
            id: true, 
            name: true, 
            email: true, 
            phone: true, 
            image: true,
            isActive: true 
          }
        },
        role: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(employees)
  } catch (error) {
    console.error('Erro ao buscar funcionários:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { restaurantId, email, roleId, name, notes } = await request.json()

    if (!restaurantId || !email || !roleId) {
      return NextResponse.json({ 
        error: 'restaurantId, email e roleId são obrigatórios' 
      }, { status: 400 })
    }

    // Verificar se usuário é dono do restaurante
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { ownerId: true }
    })

    if (!restaurant || restaurant.ownerId !== sessionResponse.user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Verificar se o cargo existe
    const role = await prisma.role.findFirst({
      where: { id: roleId, restaurantId }
    })

    if (!role) {
      return NextResponse.json({ error: 'Cargo não encontrado' }, { status: 404 })
    }

    // Buscar ou criar usuário
    let user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      // Gerar senha padrão (será obrigatório trocar no primeiro login)
      const defaultPassword = "TempPass123!"
      
      // Criar conta de usuário com senha usando BetterAuth
      const authResult = await auth.api.signUpEmail({
        body: {
          email,
          password: defaultPassword,
          name: name || email.split('@')[0]
        }
      })

      if (!authResult.user) {
        throw new Error('Falha ao criar conta do usuário')
      }

      // Atualizar o usuário criado com informações específicas de funcionário
      user = await prisma.user.update({
        where: { id: authResult.user.id },
        data: {
          userType: 'EMPLOYEE',
          isActive: false, // Só será ativo após verificação de email
          emailVerified: false
        }
      })
    }

    // Verificar se usuário já é funcionário neste restaurante
    const existingEmployee = await prisma.employeeProfile.findFirst({
      where: {
        userId: user.id,
        restaurantId
      }
    })

    if (existingEmployee) {
      return NextResponse.json({ 
        error: 'Usuário já é funcionário deste restaurante' 
      }, { status: 400 })
    }

    // Criar perfil de funcionário
    const employeeProfile = await prisma.employeeProfile.create({
      data: {
        userId: user.id,
        restaurantId,
        roleId,
        notes: notes || (user.emailVerified ? null : `Senha padrão: TempPass123! - DEVE ser alterada no primeiro login`),
        createdById: sessionResponse.user.id
      },
      include: {
        user: {
          select: { 
            id: true, 
            name: true, 
            email: true, 
            phone: true, 
            image: true,
            isActive: true,
            emailVerified: true
          }
        },
        role: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Enviar OTP de verificação por email usando better-auth
    try {
      await auth.api.sendVerificationOTP({
        body: {
          email: user.email,
          type: "email-verification"
        }
      })
      console.log(`OTP de verificação enviado para: ${user.email}`)
    } catch (error) {
      console.error('Erro ao enviar OTP:', error)
      // Continua mesmo se falhar o envio do OTP
    }

    return NextResponse.json({
      ...employeeProfile,
      _metadata: {
        defaultPassword: !user.emailVerified ? "TempPass123!" : null,
        requiresPasswordChange: !user.emailVerified,
        message: !user.emailVerified 
          ? "Funcionário criado com senha padrão. Email de verificação enviado." 
          : "Funcionário adicionado ao restaurante."
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar funcionário:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
