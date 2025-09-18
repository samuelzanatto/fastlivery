import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const restaurants = await prisma.restaurant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        mercadoPagoConfigured: true,
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({ restaurants })
  } catch (error) {
    console.error('Erro ao buscar restaurantes:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
