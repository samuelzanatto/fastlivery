/**
 * API Route para verificação de permissões client-side
 * 
 * Endpoint usado pelos hooks React para verificar permissões
 * de forma segura no servidor.
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkUserPermissions } from '@/lib/auth/permissions'
import type { ResourcePermissions } from '@/lib/auth/permissions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { permissions } = body as { permissions: ResourcePermissions }

    if (!permissions || typeof permissions !== 'object') {
      return NextResponse.json(
        { error: 'Permissões não especificadas ou inválidas' },
        { status: 400 }
      )
    }

    // Verificar permissões usando o sistema centralizado
    const result = await checkUserPermissions(permissions, {
      headers: request.headers
    })

    return NextResponse.json({
      hasPermission: result.hasPermission,
      details: result.details,
      ...(result.error && { error: result.error })
    })

  } catch (error) {
    console.error('Erro na verificação de permissões:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        hasPermission: false
      },
      { status: 500 }
    )
  }
}

// Método GET para verificação simples de autenticação
export async function GET(request: NextRequest) {
  try {
    const result = await checkUserPermissions({}, {
      headers: request.headers
    })

    return NextResponse.json({
      isAuthenticated: !!result.details.userId,
      userId: result.details.userId,
      role: result.details.role,
      organizationId: result.details.organizationId
    })

  } catch (error) {
    console.error('Erro na verificação de autenticação:', error)
    
    return NextResponse.json(
      { 
        isAuthenticated: false,
        error: 'Erro interno do servidor'
      },
      { status: 500 }
    )
  }
}