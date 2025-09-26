import { NextRequest, NextResponse } from 'next/server'
import { getProducts, createProduct } from '@/actions/products/products'

/**
 * API Híbrida - Produtos
 * Wrapper que chama as Server Actions para compatibilidade com apps nativos
 */

// GET /api/v2/products - Listar produtos
export async function GET(_request: NextRequest) {
  try {
    // As Server Actions já lidam com autenticação e contexto internamente
    const result = await getProducts()

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === 'UNAUTHORIZED' ? 401 : 400 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Erro na API híbrida de produtos (GET):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/v2/products - Criar produto
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const result = await createProduct('', data)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === 'UNAUTHORIZED' ? 401 : 400 }
      )
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error('Erro na API híbrida de produtos (POST):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}