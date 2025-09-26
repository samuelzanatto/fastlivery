import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'

export async function POST(request: NextRequest) {
  try {
    const { userId, phone } = await request.json()
    
    console.log('[customer-update-profile] Atualizando perfil:', { userId, phone })

    if (!userId) {
      return NextResponse.json({ error: 'User ID é obrigatório' }, { status: 400 })
    }

    // Atualizar dados adicionais do usuário
    const updateData: { phone?: string } = {}
    if (phone) updateData.phone = phone

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    })

    console.log('[customer-update-profile] Perfil atualizado com sucesso:', userId)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Perfil atualizado com sucesso' 
    })

  } catch (error) {
    console.error('[customer-update-profile] Erro:', error)
    
    return NextResponse.json({ 
      error: 'Erro interno ao atualizar perfil',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}