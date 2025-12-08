import { NextRequest, NextResponse } from 'next/server'
import { 
  getEmployees, 
  createEmployee, 
  updateEmployee 
} from '@/actions/employees/employees'

// GET /api/v2/employees - Listar funcionários
export async function GET(_request: NextRequest) {
  try {
    const result = await getEmployees()

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === 'UNAUTHORIZED' ? 401 : 400 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Erro na API híbrida de funcionários (GET):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/v2/employees - Criar funcionário
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // createEmployee agora usa withBusiness internamente
    const result = await createEmployee(data)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === 'UNAUTHORIZED' ? 401 : 400 }
      )
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error('Erro na API híbrida de funcionários (POST):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PATCH /api/v2/employees - Atualizar funcionário
export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json()
    const { employeeId, ...updateData } = data
    
    if (!employeeId) {
      return NextResponse.json(
        { error: 'employeeId é obrigatório' },
        { status: 400 }
      )
    }
    
    const result = await updateEmployee(employeeId, updateData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === 'UNAUTHORIZED' ? 401 : 400 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Erro na API híbrida de funcionários (PATCH):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}