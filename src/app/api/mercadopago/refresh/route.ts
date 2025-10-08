import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session?.user) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })

    const business = await prisma.business.findFirst({ where: { ownerId: session.user.id } })
    if (!business) return NextResponse.json({ success: false, error: 'Negócio não encontrado' }, { status: 404 })

    const refreshToken = business.mercadoPagoRefreshToken || null
    if (!refreshToken) return NextResponse.json({ success: false, error: 'Refresh token não encontrado' }, { status: 400 })

    const res = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MERCADOPAGO_CLIENT_ID || '',
        client_secret: process.env.MERCADOPAGO_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    })

    if (!res.ok) {
      const txt = await res.text()
      console.error('MP refresh error', txt)
      return NextResponse.json({ success: false, error: 'Erro ao renovar token' }, { status: 500 })
    }

    const json = await res.json()
    const expiresIn = json.expires_in ? parseInt(String(json.expires_in), 10) : undefined
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined

    await prisma.business.update({
      where: { id: business.id },
      data: {
        mercadoPagoAccessToken: json.access_token || null,
        mercadoPagoPublicKey: json.public_key || null,
        mercadoPagoConfigured: true,
      }
    })

    if (json.refresh_token || expiresAt) {
      await prisma.business.update({
        where: { id: business.id },
        data: {
          mercadoPagoRefreshToken: json.refresh_token || null,
          mercadoPagoExpiresAt: expiresAt || null
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao refresh token Mercado Pago', error)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
