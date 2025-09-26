'use server'

import { prisma } from '@/lib/database/prisma'
import { revalidatePath } from 'next/cache'
import {
  ActionResult,
  createSuccessResult,
  handleActionError
} from '@/lib/actions/auth-helpers'
import { 
  validateData,
  validateId 
} from '@/lib/actions/validation-helpers'
import { z } from 'zod'
import type { Role, Permission } from '@prisma/client'

// Type for role with permissions
export type RoleWithPermissions = Role & {
  permissions?: Permission[]
}

export interface RoleCreateInput {
  name: string
  description?: string
  isActive?: boolean
  permissions?: Array<{
    resource: string
    action: string
    conditions?: Record<string, unknown>
  }>
}

export interface RoleUpdateInput {
  name?: string
  description?: string
  isActive?: boolean
  permissions?: Array<{
    resource: string
    action: string
    conditions?: Record<string, unknown>
  }>
}

const PermissionSchema = z.object({
  resource: z.string().min(1, 'Recurso é obrigatório'),
  action: z.string().min(1, 'Ação é obrigatória'),
  conditions: z.record(z.string(), z.unknown()).optional()
})

const RoleSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  description: z.string().max(500, 'Descrição muito longa').optional(),
  isActive: z.boolean().optional(),
  permissions: z.array(PermissionSchema).optional()
})

const RoleUpdateSchema = RoleSchema.partial()

/**
 * Get all roles for a business
 */
export async function getRoles(
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<ActionResult<{ roles: RoleWithPermissions[], total: number, totalPages: number }>> {
  try {
    const { business } = await import('@/lib/actions/auth-helpers').then(m => m.getAuthenticatedUserBusiness())
    
    const skip = (page - 1) * limit
    
    const where = {
      businessId: business.id,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } }
        ]
      })
    }

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        skip,
        take: limit,
        include: {
          permissions: true,
          _count: {
            select: {
              employees: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.role.count({ where })
    ])

    return createSuccessResult({
      roles: roles as RoleWithPermissions[],
      total,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Get a single role by ID
 */
export async function getRole(
  id: string
): Promise<ActionResult<RoleWithPermissions>> {
  try {
    const { business } = await import('@/lib/actions/auth-helpers').then(m => m.getAuthenticatedUserBusiness())
    const validatedId = validateId(id)
    
    const role = await prisma.role.findFirst({
      where: {
        id: validatedId,
        businessId: business.id
      },
      include: {
        permissions: true
      }
    })

    if (!role) {
      return {
        success: false,
        error: 'Função não encontrada'
      }
    }

    return createSuccessResult(role as RoleWithPermissions)
  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Create a new role
 */
export async function createRole(
  data: RoleCreateInput
): Promise<ActionResult<RoleWithPermissions>> {
  try {
    const { business } = await import('@/lib/actions/auth-helpers').then(m => m.getAuthenticatedUserBusiness())
    const validatedData = validateData(RoleSchema, data)

    // Check if role name already exists
    const existingRole = await prisma.role.findFirst({
      where: {
        businessId: business.id,
        name: validatedData.name
      }
    })

    if (existingRole) {
      return {
        success: false,
        error: 'Já existe uma função com este nome'
      }
    }

    const role = await prisma.role.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        isActive: validatedData.isActive ?? true,
        businessId: business.id,
        permissions: validatedData.permissions ? {
          create: validatedData.permissions.map(permission => ({
            resource: permission.resource,
            action: permission.action,
            conditions: (permission.conditions as object) || null
          }))
        } : undefined
      },
      include: {
        permissions: true
      }
    })

    revalidatePath('/permissions')
    return createSuccessResult(role as RoleWithPermissions)
  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Update an existing role
 */
export async function updateRole(
  id: string,
  data: RoleUpdateInput
): Promise<ActionResult<RoleWithPermissions>> {
  try {
    const { business } = await import('@/lib/actions/auth-helpers').then(m => m.getAuthenticatedUserBusiness())
    const validatedId = validateId(id)
    const validatedData = validateData(RoleUpdateSchema, data)

    // Check if role exists and belongs to business
    const existingRole = await prisma.role.findFirst({
      where: {
        id: validatedId,
        businessId: business.id
      }
    })

    if (!existingRole) {
      return {
        success: false,
        error: 'Função não encontrada'
      }
    }

    // Check if name is being changed and already exists
    if (validatedData.name && validatedData.name !== existingRole.name) {
      const nameConflict = await prisma.role.findFirst({
        where: {
          businessId: business.id,
          name: validatedData.name,
          id: { not: validatedId }
        }
      })

      if (nameConflict) {
        return {
          success: false,
          error: 'Já existe uma função com este nome'
        }
      }
    }

    // Handle permissions update if provided
    let permissionsUpdate = undefined
    if (validatedData.permissions) {
      permissionsUpdate = {
        deleteMany: {}, // Remove all existing permissions
        create: validatedData.permissions.map(permission => ({
          resource: permission.resource,
          action: permission.action,
          conditions: (permission.conditions as object) || null
        }))
      }
    }

    const role = await prisma.role.update({
      where: { id: validatedId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
        ...(permissionsUpdate && { permissions: permissionsUpdate })
      },
      include: {
        permissions: true
      }
    })

    revalidatePath('/permissions')
    return createSuccessResult(role as RoleWithPermissions)
  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Delete a role
 */
export async function deleteRole(
  id: string
): Promise<ActionResult<boolean>> {
  try {
    const { business } = await import('@/lib/actions/auth-helpers').then(m => m.getAuthenticatedUserBusiness())
    const validatedId = validateId(id)

    // Check if role exists and belongs to business
    const existingRole = await prisma.role.findFirst({
      where: {
        id: validatedId,
        businessId: business.id
      },
      include: {
        _count: {
          select: {
            employees: true
          }
        }
      }
    })

    if (!existingRole) {
      return {
        success: false,
        error: 'Função não encontrada'
      }
    }

    // Check if role is being used by employees
    if (existingRole._count.employees > 0) {
      return {
        success: false,
        error: 'Não é possível excluir uma função que está sendo usada por funcionários'
      }
    }

    await prisma.role.delete({
      where: { id: validatedId }
    })

    revalidatePath('/permissions')
    return createSuccessResult(true)
  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Get available permissions resources and actions
 */
export async function getPermissionResources(): Promise<ActionResult<Array<{ resource: string; actions: string[] }>>> {
  try {
    // Define available resources and their actions
    const resources = [
      {
        resource: 'orders',
        actions: ['view', 'create', 'update', 'delete', 'manage']
      },
      {
        resource: 'products',
        actions: ['view', 'create', 'update', 'delete', 'manage']
      },
      {
        resource: 'categories',
        actions: ['view', 'create', 'update', 'delete', 'manage']
      },
      {
        resource: 'tables',
        actions: ['view', 'create', 'update', 'delete', 'manage']
      },
      {
        resource: 'employees',
        actions: ['view', 'create', 'update', 'delete', 'manage']
      },
      {
        resource: 'customers',
        actions: ['view', 'create', 'update', 'delete', 'manage']
      },
      {
        resource: 'payments',
        actions: ['view', 'process', 'refund', 'manage']
      },
      {
        resource: 'reports',
        actions: ['view', 'export', 'manage']
      },
      {
        resource: 'settings',
        actions: ['view', 'update', 'manage']
      }
    ]

    return createSuccessResult(resources)
  } catch (error) {
    return handleActionError(error)
  }
}