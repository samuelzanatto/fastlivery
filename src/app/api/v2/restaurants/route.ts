import { NextRequest, NextResponse } from 'next/server'
import {
  getMyBusiness,
  updateMyBusiness,
  createBusiness
} from '@/actions/business/businesses'

// GET /api/v2/restaurants/me - Obter meu negócio
export async function GET(_request: NextRequest) {
  try {
    const result = await getMyBusiness()

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === 'UNAUTHORIZED' ? 401 : 400 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Erro na API híbrida de negócio (GET):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/v2/restaurants - Criar negócio
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const result = await createBusiness(data)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === 'UNAUTHORIZED' ? 401 : 400 }
      )
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error('Erro na API híbrida de negócio (POST):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PATCH /api/v2/restaurants/me - Atualizar meu negócio
export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json()
    
    const result = await updateMyBusiness(data)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === 'UNAUTHORIZED' ? 401 : 400 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Erro na API híbrida de negócio (PATCH):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
