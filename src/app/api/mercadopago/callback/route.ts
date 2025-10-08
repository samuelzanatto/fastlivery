import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import { createHmac } from 'crypto'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    if (!code) return NextResponse.json({ success: false, error: 'Missing code' }, { status: 400 })

    // Decode state to get businessId (supports HMAC-signed state)
    let businessId: string | null = null
    try {
      if (state) {
        // If state contains signature (encoded.sig), split
        const parts = state.split('.')
        const encoded = parts[0]
        const signature = parts[1]
        const decodedJson = Buffer.from(encoded, 'base64url').toString('utf-8')

        // If signature present, verify using MERCADOPAGO_STATE_SECRET
        if (signature) {
          const stateSecret = process.env.MERCADOPAGO_STATE_SECRET || ''
          if (!stateSecret) {
            console.warn('State signature present but MERCADOPAGO_STATE_SECRET not configured')
          } else {
            const expected = createHmac('sha256', stateSecret).update(decodedJson).digest('base64url')
            if (expected !== signature) {
              console.error('Invalid state signature')
              return NextResponse.json({ success: false, error: 'Invalid state signature' }, { status: 400 })
            }
          }
        }

        const decoded = JSON.parse(decodedJson)
        businessId = decoded.businessId
      }
    } catch (e) {
      console.warn('State decode/verify falhou', e)
    }

    // Prefer session owner if available
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session?.user && !businessId) {
      // Não temos como associar; pedir login
      return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL))
    }

    // Trocar code por token no Mercado Pago
    const tokenRes = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MERCADOPAGO_CLIENT_ID || '',
        client_secret: process.env.MERCADOPAGO_CLIENT_SECRET || '',
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadopago/callback`
      })
    })

    if (!tokenRes.ok) {
      const txt = await tokenRes.text()
      console.error('MP token error', txt)
      return NextResponse.json({ success: false, error: 'Erro ao obter token do Mercado Pago' }, { status: 500 })
    }

    const tokenJson = await tokenRes.json()
    // tokenJson contains access_token and possibly refresh_token

    // Associate with business: either session user owner or businessId from state
    const ownerId = session?.user?.id
    const business = await prisma.business.findFirst({ where: ownerId ? { ownerId } : { id: businessId || undefined } })
    if (!business) {
      console.error('Business not found to associate Mercado Pago token')
      return NextResponse.json({ success: false, error: 'Negócio não encontrado' }, { status: 404 })
    }

    const expiresIn = tokenJson.expires_in ? parseInt(String(tokenJson.expires_in), 10) : undefined
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined

    // Atualiza campos que existem no client Prisma
    await prisma.business.update({
      where: { id: business.id },
      data: {
        mercadoPagoAccessToken: tokenJson.access_token || null,
        mercadoPagoConfigured: true,
        mercadoPagoPublicKey: tokenJson.public_key || null
      }
    })

    // Salva refresh token e expiresAt utilizando o Prisma Client (fields adicionados no schema)
    if (tokenJson.refresh_token || expiresAt) {
      await prisma.business.update({
        where: { id: business.id },
        data: {
          mercadoPagoRefreshToken: tokenJson.refresh_token || null,
          mercadoPagoExpiresAt: expiresAt || null
        }
      })
    }

    // Redirect back to settings page with success
    const redirectUrl = new URL('/dashboard/settings', process.env.NEXT_PUBLIC_APP_URL)
    redirectUrl.searchParams.set('mp', 'connected')
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Erro no callback Mercado Pago:', error)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
