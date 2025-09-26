'use server'

import { prisma } from '@/lib/database/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth/auth'
import {
  ActionResult,
  createSuccessResult,
  handleActionError,
  withBusiness,
  BusinessContext
} from '@/lib/actions/auth-helpers'
import { 
  EmployeeSchema,
  validateData,
  validateId 
} from '@/lib/actions/validation-helpers'
import { withLimitCheck } from '@/lib/actions/billing-helpers'

export interface Employee {
  id: string
  userId: string
  businessId: string
  roleId: string
  isActive: boolean
  startDate: Date
  endDate: Date | null
  salary: number | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name: string | null
    email: string
    phone: string | null
    image: string | null
    isActive: boolean
    emailVerified: boolean
  }
  role: {
    id: string
    name: string
    description: string | null
  }
  createdBy: {
    id: string
    name: string | null
  }
}

export interface EmployeeCreateInput {
  email: string
  name?: string
  roleId: string
  notes?: string
  salary?: number
  startDate?: Date
}

export interface EmployeeUpdateInput {
  roleId?: string
  isActive?: boolean
  salary?: number
  notes?: string
  endDate?: Date
}

export interface EmployeeFilters {
  search?: string
  roleId?: string
  isActive?: boolean
}

/**
 * Buscar todos os funcionários do negócio
 */
async function _getEmployees(
  { business }: BusinessContext,
  filters?: EmployeeFilters
): Promise<ActionResult<Employee[]>> {
  try {
    const where: {
      businessId: string
      roleId?: string
      isActive?: boolean
      OR?: Array<{
        user?: {
          OR?: Array<{
            name?: { contains: string; mode: 'insensitive' }
            email?: { contains: string; mode: 'insensitive' }
          }>
        }
        role?: {
          name?: { contains: string; mode: 'insensitive' }
        }
      }>
    } = {
      businessId: business.id
    }

    if (filters?.roleId) {
      where.roleId = filters.roleId
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive
    }

    if (filters?.search) {
      where.OR = [
        {
          user: {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } }
            ]
          }
        },
        {
          role: {
            name: { contains: filters.search, mode: 'insensitive' }
          }
        }
      ]
    }

    const employees = await prisma.employeeProfile.findMany({
      where,
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
      },
      orderBy: { createdAt: 'desc' }
    })

    return createSuccessResult(employees as Employee[])
  } catch (error) {
    return handleActionError(error)
  }
}

export const getEmployees = withBusiness(_getEmployees)

/**
 * Buscar funcionário por ID
 */
async function _getEmployee(
  { business }: BusinessContext,
  employeeId: string
): Promise<ActionResult<Employee>> {
  try {
    const validatedId = validateId(employeeId, 'ID do funcionário')

    const employee = await prisma.employeeProfile.findFirst({
      where: {
        id: validatedId,
        businessId: business.id
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

    if (!employee) {
      return {
        success: false,
        error: 'Funcionário não encontrado',
        code: 'EMPLOYEE_NOT_FOUND'
      }
    }

    return createSuccessResult(employee as Employee)
  } catch (error) {
    return handleActionError(error)
  }
}

export const getEmployee = withBusiness(_getEmployee)

/**
 * Criar novo funcionário
 */
async function _createEmployee(
  businessId: string,
  input: EmployeeCreateInput,
  createdById: string
): Promise<ActionResult<Employee>> {
  try {
    const validatedData = validateData(EmployeeSchema, input)

    // Verificar se o cargo existe e pertence ao negócio
    const role = await prisma.role.findFirst({
      where: { 
        id: validatedData.roleId, 
        businessId
      }
    })

    if (!role) {
      return {
        success: false,
        error: 'Cargo não encontrado',
        code: 'ROLE_NOT_FOUND'
      }
    }

    // Buscar ou criar usuário
    let user = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (!user) {
      // Gerar senha padrão
      const defaultPassword = "TempPass123!"
      
      // Criar conta de usuário com Better Auth
      const authResult = await auth.api.signUpEmail({
        body: {
          email: validatedData.email,
          password: defaultPassword,
          name: validatedData.name || validatedData.email.split('@')[0]
        }
      })

      if (!authResult.user) {
        return {
          success: false,
          error: 'Falha ao criar conta do usuário',
          code: 'USER_CREATION_FAILED'
        }
      }

      // Atualizar o usuário criado
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
      return {
        success: false,
        error: 'Usuário já é funcionário deste negócio',
        code: 'EMPLOYEE_ALREADY_EXISTS'
      }
    }

    // Criar perfil de funcionário
    const employeeProfile = await prisma.employeeProfile.create({
      data: {
        userId: user.id,
        businessId,
        roleId: validatedData.roleId,
        notes: validatedData.notes || (!user.emailVerified ? `Senha padrão: TempPass123! - DEVE ser alterada no primeiro login` : undefined),
        salary: validatedData.salary,
        startDate: validatedData.startDate || new Date(),
        createdById
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

    revalidatePath('/dashboard/employees')
    revalidatePath('/dashboard')
    
    return createSuccessResult(employeeProfile as Employee)
  } catch (error) {
    return handleActionError(error)
  }
}

export const createEmployee = withLimitCheck('user', _createEmployee)

/**
 * Atualizar funcionário
 */
async function _updateEmployee(
  { business }: BusinessContext,
  employeeId: string,
  input: EmployeeUpdateInput
): Promise<ActionResult<Employee>> {
  try {
    const validatedId = validateId(employeeId, 'ID do funcionário')
    
    // Verificar se funcionário existe
    const existingEmployee = await prisma.employeeProfile.findFirst({
      where: {
        id: validatedId,
        businessId: business.id
      }
    })

    if (!existingEmployee) {
      return {
        success: false,
        error: 'Funcionário não encontrado',
        code: 'EMPLOYEE_NOT_FOUND'
      }
    }

    // Validar cargo se fornecido
    if (input.roleId) {
      const role = await prisma.role.findFirst({
        where: { 
          id: input.roleId, 
          businessId: business.id 
        }
      })

      if (!role) {
        return {
          success: false,
          error: 'Cargo não encontrado',
          code: 'ROLE_NOT_FOUND'
        }
      }
    }

    const updateData: Partial<EmployeeUpdateInput> = {}
    
    if (input.roleId !== undefined) updateData.roleId = input.roleId
    if (input.isActive !== undefined) updateData.isActive = input.isActive
    if (input.salary !== undefined) updateData.salary = input.salary
    if (input.notes !== undefined) updateData.notes = input.notes
    if (input.endDate !== undefined) updateData.endDate = input.endDate

    const employee = await prisma.employeeProfile.update({
      where: { id: validatedId },
      data: updateData,
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

    revalidatePath('/dashboard/employees')
    revalidatePath('/dashboard')
    
    return createSuccessResult(employee as Employee)
  } catch (error) {
    return handleActionError(error)
  }
}

export const updateEmployee = withBusiness(_updateEmployee)

/**
 * Remover funcionário (desativar)
 */
async function _removeEmployee(
  { business }: BusinessContext,
  employeeId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const validatedId = validateId(employeeId, 'ID do funcionário')

    // Verificar se funcionário existe
    const employee = await prisma.employeeProfile.findFirst({
      where: {
        id: validatedId,
        businessId: business.id
      }
    })

    if (!employee) {
      return {
        success: false,
        error: 'Funcionário não encontrado',
        code: 'EMPLOYEE_NOT_FOUND'
      }
    }

    // Desativar ao invés de deletar para manter histórico
    await prisma.employeeProfile.update({
      where: { id: validatedId },
      data: { 
        isActive: false,
        endDate: new Date()
      }
    })

    revalidatePath('/dashboard/employees')
    revalidatePath('/dashboard')
    
    return createSuccessResult({ id: validatedId })
  } catch (error) {
    return handleActionError(error)
  }
}

export const removeEmployee = withBusiness(_removeEmployee)

/**
 * Reativar funcionário
 */
async function _reactivateEmployee(
  { business }: BusinessContext,
  employeeId: string
): Promise<ActionResult<Employee>> {
  try {
    const validatedId = validateId(employeeId, 'ID do funcionário')

    const employee = await prisma.employeeProfile.update({
      where: {
        id: validatedId,
        businessId: business.id
      },
      data: { 
        isActive: true,
        endDate: null
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

    revalidatePath('/dashboard/employees')
    revalidatePath('/dashboard')
    
    return createSuccessResult(employee as Employee)
  } catch (error) {
    return handleActionError(error)
  }
}

export const reactivateEmployee = withBusiness(_reactivateEmployee)

/**
 * Buscar funcionários pendentes de verificação
 */
async function _getPendingEmployees(
  { business }: BusinessContext
): Promise<ActionResult<Employee[]>> {
  try {
    const pendingEmployees = await prisma.employeeProfile.findMany({
      where: {
        businessId: business.id,
        user: {
          emailVerified: false,
          isActive: false
        }
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
      },
      orderBy: { createdAt: 'desc' }
    })

    return createSuccessResult(pendingEmployees as Employee[])
  } catch (error) {
    return handleActionError(error)
  }
}

export const getPendingEmployees = withBusiness(_getPendingEmployees)

/**
 * Verificar status de mudança de senha do funcionário
 */
export async function getPasswordChangeStatus(): Promise<ActionResult<{
  requiresPasswordChange: boolean
  isEmployee: boolean
  isEmailVerified: boolean
  userName: string | null
  userEmail: string
}>> {
  try {
    const session = await auth.api.getSession({
      headers: new Headers()
    })

    if (!session?.user) {
      return {
        success: false,
        error: 'Não autenticado',
        code: 'UNAUTHORIZED'
      }
    }

    const user = session.user

    // Verificar se é funcionário
    const employeeProfile = await prisma.employeeProfile.findFirst({
      where: { userId: user.id },
      include: { user: true }
    })

    if (!employeeProfile) {
      return createSuccessResult({
        requiresPasswordChange: false,
        isEmployee: false,
        isEmailVerified: true,
        userName: user.name,
        userEmail: user.email
      })
    }

    // Verificar se precisa trocar senha
    const requiresPasswordChange = 
      !employeeProfile.user.emailVerified || 
      Boolean(employeeProfile.notes && employeeProfile.notes.includes('TempPass123!'))

    return createSuccessResult({
      requiresPasswordChange,
      isEmployee: true,
      isEmailVerified: employeeProfile.user.emailVerified,
      userName: employeeProfile.user.name,
      userEmail: employeeProfile.user.email
    })
  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Alterar senha do funcionário
 */
export async function changeEmployeePassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult<{ success: boolean; message: string }>> {
  try {
    if (!currentPassword || !newPassword) {
      return {
        success: false,
        error: 'Senha atual e nova senha são obrigatórias',
        code: 'MISSING_PASSWORDS'
      }
    }

    if (newPassword.length < 8) {
      return {
        success: false,
        error: 'Nova senha deve ter pelo menos 8 caracteres',
        code: 'PASSWORD_TOO_SHORT'
      }
    }

    const session = await auth.api.getSession({
      headers: new Headers()
    })

    if (!session?.user) {
      return {
        success: false,
        error: 'Não autenticado',
        code: 'UNAUTHORIZED'
      }
    }

    // Verificar senha atual e trocar por nova usando BetterAuth
    try {
      const changeResult = await auth.api.changePassword({
        body: {
          currentPassword,
          newPassword
        },
        headers: new Headers()
      })

      if (!changeResult.user) {
        return {
          success: false,
          error: 'Senha atual incorreta',
          code: 'CURRENT_PASSWORD_INCORRECT'
        }
      }

      // Atualizar notes do funcionário para remover referência à senha padrão
      await prisma.employeeProfile.updateMany({
        where: { userId: session.user.id },
        data: {
          notes: null // Remove a referência à senha padrão
        }
      })

      // Marcar email como verificado e usuário como ativo
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          emailVerified: true,
          isActive: true
        }
      })

      revalidatePath('/dashboard')
      revalidatePath('/login')

      return createSuccessResult({
        success: true,
        message: 'Senha alterada com sucesso'
      })

    } catch (authError) {
      console.error('Erro ao alterar senha via BetterAuth:', authError)
      return {
        success: false,
        error: 'Erro ao alterar senha. Verifique a senha atual.',
        code: 'PASSWORD_CHANGE_FAILED'
      }
    }

  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Reenviar OTP de verificação para funcionário
 */
export async function resendEmployeeVerificationOTP(
  email: string
): Promise<ActionResult<{ success: boolean; message: string }>> {
  try {
    if (!email) {
      return {
        success: false,
        error: 'Email é obrigatório',
        code: 'EMAIL_REQUIRED'
      }
    }

    // Verificar se o usuário existe e é funcionário
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        employeeProfiles: true
      }
    })

    if (!user) {
      return {
        success: false,
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      }
    }

    if (user.employeeProfiles.length === 0) {
      return {
        success: false,
        error: 'Usuário não é funcionário',
        code: 'NOT_EMPLOYEE'
      }
    }

    if (user.emailVerified) {
      return {
        success: false,
        error: 'Email já foi verificado',
        code: 'EMAIL_ALREADY_VERIFIED'
      }
    }

    // Enviar OTP de verificação usando Better Auth
    try {
      await auth.api.sendVerificationOTP({
        body: {
          email: email,
          type: "email-verification"
        }
      })

      return createSuccessResult({
        success: true,
        message: 'OTP de verificação reenviado com sucesso'
      })
    } catch (error) {
      console.error('Erro ao reenviar OTP:', error)
      return {
        success: false,
        error: 'Erro ao reenviar OTP de verificação',
        code: 'OTP_SEND_FAILED'
      }
    }
  } catch (error) {
    return handleActionError(error)
  }
}