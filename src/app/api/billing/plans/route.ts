import { NextRequest, NextResponse } from 'next/server'
import { getBillingPlans } from '@/actions/subscription/subscription'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const companyType = searchParams.get('type') as 'delivery_company' | 'supplier' | null

    const result = await getBillingPlans(companyType || undefined)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Erro ao buscar planos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}