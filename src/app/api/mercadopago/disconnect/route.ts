import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session?.user) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })

    const business = await prisma.business.findFirst({ where: { ownerId: session.user.id } })
    if (!business) return NextResponse.json({ success: false, error: 'Negócio não encontrado' }, { status: 404 })

    await prisma.business.update({
      where: { id: business.id },
      data: {
        mercadoPagoAccessToken: null,
        mercadoPagoConfigured: false,
        mercadoPagoPublicKey: null,
        mercadoPagoRefreshToken: null,
        mercadoPagoExpiresAt: null
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao desconectar Mercado Pago', error)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
