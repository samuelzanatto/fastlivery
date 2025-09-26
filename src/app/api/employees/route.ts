import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import { createEmployeeSchema, validateUUID } from '@/lib/validation/schemas'
import { secureLogger } from '@/lib/security/sanitize'

export async function GET(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ error: 'businessId obrigatório' }, { status: 400 })
    }

    // Verificar se usuário tem acesso ao negócio
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true }
    })

    if (!business) {
      return NextResponse.json({ error: 'Negócio não encontrado' }, { status: 404 })
    }

    const isOwner = business.ownerId === sessionResponse.user.id
    
    if (!isOwner) {
      // Verificar se é funcionário
      const employeeProfile = await prisma.employeeProfile.findFirst({
        where: {
          userId: sessionResponse.user.id,
          businessId,
          isActive: true
        }
      })
      
      if (!employeeProfile) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
      }
    }

    const employees = await prisma.employeeProfile.findMany({
      where: { businessId },
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

    // Validação rigorosa com Zod
    const body = await request.json()
    const validation = createEmployeeSchema.safeParse(body)
    
    if (!validation.success) {
      secureLogger.warn('Dados inválidos ao criar funcionário', {
        userId: sessionResponse.user.id,
        errors: validation.error.issues,
        ip: request.headers.get('x-forwarded-for')
      })
      
      return NextResponse.json({
        error: 'Dados inválidos',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }, { status: 400 })
    }

    const { businessId, email, roleId, name, notes } = validation.data

    // Validar UUIDs
    if (!validateUUID(businessId) || !validateUUID(roleId)) {
      return NextResponse.json({ 
        error: 'IDs inválidos fornecidos' 
      }, { status: 400 })
    }

    // Verificar se usuário é dono do negócio
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true }
    })

    if (!business || business.ownerId !== sessionResponse.user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Verificar se o cargo existe
    const role = await prisma.role.findFirst({
      where: { id: roleId, businessId }
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
          isActive: false, // Só será ativo após verificação de email
          emailVerified: false
        }
      })
    }

    // Verificar se usuário já é funcionário neste negócio
    const existingEmployee = await prisma.employeeProfile.findFirst({
      where: {
        userId: user.id,
        businessId
      }
    })

    if (existingEmployee) {
      return NextResponse.json({ 
        error: 'Usuário já é funcionário deste negócio' 
      }, { status: 400 })
    }

    // Criar perfil de funcionário
    const employeeProfile = await prisma.employeeProfile.create({
      data: {
        userId: user.id,
        businessId,
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
          : "Funcionário adicionado ao negócio."
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar funcionário:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
