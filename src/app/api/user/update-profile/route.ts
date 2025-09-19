import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { phone, userType, emailVerified } = body

    console.log('[UPDATE_PROFILE] Updating profile for user:', session.user.id)
    console.log('[UPDATE_PROFILE] Data to update:', { phone, userType, emailVerified })

    // Atualizar dados do usuário
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        phone,
        userType: userType || 'CUSTOMER',
        ...(emailVerified !== undefined && { emailVerified })
      }
    })

    console.log('[UPDATE_PROFILE] User updated successfully:', {
      id: updatedUser.id,
      email: updatedUser.email,
      emailVerified: updatedUser.emailVerified
    })

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        userType: updatedUser.userType
      }
    })
  } catch (error) {
    console.error('[UPDATE_PROFILE] Failed to update profile:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
