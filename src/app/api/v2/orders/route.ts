import { NextRequest, NextResponse } from 'next/server'
import { 
  getOrders, 
  createOrder, 
  updateOrderStatus
} from '@/actions/orders/orders'

// GET /api/v2/orders - Listar pedidos
export async function GET(_request: NextRequest) {
  try {
    const result = await getOrders()

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === 'UNAUTHORIZED' ? 401 : 400 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Erro na API híbrida de pedidos (GET):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/v2/orders - Criar pedido
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const result = await createOrder('', data)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === 'UNAUTHORIZED' ? 401 : 400 }
      )
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error('Erro na API híbrida de pedidos (POST):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PATCH /api/v2/orders - Atualizar status do pedido
export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json()
    const { orderId, status } = data
    
    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'orderId e status são obrigatórios' },
        { status: 400 }
      )
    }
    
    const result = await updateOrderStatus(orderId, status)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === 'UNAUTHORIZED' ? 401 : 400 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Erro na API híbrida de pedidos (PATCH):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}