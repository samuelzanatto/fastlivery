import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'

export async function GET() {
  try {
    const businesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({ businesses })
  } catch (error) {
    console.error('Erro ao buscar empresas:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
