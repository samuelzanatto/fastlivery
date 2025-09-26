import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { StripeSyncService } from '@/lib/payments/stripe-sync'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação (apenas admins podem sincronizar)
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Para segurança, você pode adicionar uma verificação adicional aqui
    // como verificar se o usuário é admin ou tem uma role específica

    const { type } = await request.json()
    
    switch (type) {
      case 'products':
        const products = await StripeSyncService.syncProducts()
        return NextResponse.json({ 
          success: true, 
          message: `${products.length} produtos sincronizados`,
          data: products 
        })

      case 'prices':
        const prices = await StripeSyncService.syncPrices()
        return NextResponse.json({ 
          success: true, 
          message: `${prices.length} preços sincronizados`,
          data: prices 
        })

      case 'full':
      default:
        const result = await StripeSyncService.fullSync()
        return NextResponse.json({ 
          success: true, 
          message: `${result.products.length} produtos e ${result.prices.length} preços sincronizados`,
          data: result 
        })
    }
  } catch (error) {
    console.error('Erro na sincronização:', error)
    return NextResponse.json(
      { error: 'Erro interno na sincronização' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Retornar dados locais sincronizados
    const productsWithPrices = await StripeSyncService.getLocalProductsWithPrices()
    
    return NextResponse.json({
      success: true,
      data: productsWithPrices
    })
  } catch (error) {
    console.error('Erro ao buscar dados locais:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados' },
      { status: 500 }
    )
  }
}
