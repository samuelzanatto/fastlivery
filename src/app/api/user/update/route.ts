import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest) {
  try {
    // Verificar autenticação
    const sessionResponse = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!sessionResponse?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const data = await request.json()
    const { name, phone, image } = data

    // Atualizar usuário
    const updatedUser = await prisma.user.update({
      where: { id: sessionResponse.user.id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(image && { image })
      }
    })

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      image: updatedUser.image
    })
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
