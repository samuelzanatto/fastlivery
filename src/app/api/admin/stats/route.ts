import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'

export async function GET() {
  try {
    const headersList = await headers()
    const session = await auth.api.getSession({ headers: headersList })

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin da plataforma
    const role = session.user.role
    if (role !== 'platformAdmin' && role !== 'platformSupport') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar estatísticas
    const [
      totalBusinesses,
      activeBusinesses,
      totalUsers,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { isActive: true } }),
      prisma.user.count(),
    ])

    // Calcular crescimento (placeholder - implementar lógica real depois)
    const businessGrowth = 0
    const userGrowth = 0
    const monthlyRevenue = 0

    return NextResponse.json({
      totalBusinesses,
      activeBusinesses,
      totalUsers,
      businessGrowth,
      userGrowth,
      monthlyRevenue,
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
