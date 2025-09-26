import { NextRequest, NextResponse } from 'next/server'

// GET /api/v2/profile - Obter meu perfil (placeholder)
export async function GET(_request: NextRequest) {
  try {
    // TODO: Implementar quando Server Actions de perfil estiverem disponíveis
    return NextResponse.json(
      { message: 'Endpoint de perfil não implementado ainda' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Erro na API híbrida de perfil (GET):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PATCH /api/v2/profile - Atualizar meu perfil (placeholder)
export async function PATCH(_request: NextRequest) {
  try {
    // TODO: Implementar quando Server Actions de perfil estiverem disponíveis
    return NextResponse.json(
      { message: 'Endpoint de perfil não implementado ainda' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Erro na API híbrida de perfil (PATCH):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}