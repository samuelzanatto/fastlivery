import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import { randomUUID, createHmac } from 'crypto'

// Gera a URL de autorização do Mercado Pago para o lojista conectar a conta
export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session?.user) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })

    const business = await prisma.business.findFirst({ where: { ownerId: session.user.id } })
    if (!business) return NextResponse.json({ success: false, error: 'Negócio não encontrado' }, { status: 404 })

    const clientId = process.env.MERCADOPAGO_CLIENT_ID
    if (!clientId) return NextResponse.json({ success: false, error: 'MERCADOPAGO_CLIENT_ID não configurado' }, { status: 500 })

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadopago/callback`

    const minimalMode = process.env.MERCADOPAGO_OAUTH_MINIMAL === 'true' || new URL(req.url).searchParams.get('minimal') === '1'

    let state = business.id // fallback minimal
    if (!minimalMode) {
      const statePayload = {
        businessId: business.id,
        nonce: randomUUID()
      }
      const stateJson = JSON.stringify(statePayload)
      const encoded = Buffer.from(stateJson).toString('base64url')
      const stateSecret = process.env.MERCADOPAGO_STATE_SECRET || ''
      state = encoded
      if (stateSecret) {
        const sig = createHmac('sha256', stateSecret).update(stateJson).digest('base64url')
        state = `${encoded}.${sig}`
      }
    }

    // Escolhe host por país; use NEXT_PUBLIC_MERCADOPAGO_COUNTRY (ex: br, ar)
    const country = process.env.NEXT_PUBLIC_MERCADOPAGO_COUNTRY || 'br'
    const hostByCountry: Record<string,string> = {
      br: 'https://auth.mercadopago.com.br/authorization',
      ar: 'https://auth.mercadopago.com.ar/authorization',
      mx: 'https://auth.mercadopago.com.mx/authorization',
      cl: 'https://auth.mercadopago.com.cl/authorization',
      co: 'https://auth.mercadopago.com.co/authorization',
      pe: 'https://auth.mercadopago.com.pe/authorization',
      uy: 'https://auth.mercadopago.com.uy/authorization'
    }

    const host = hostByCountry[country] ?? hostByCountry['br']

    // Parâmetros opcionais
    const scopes = process.env.MERCADOPAGO_OAUTH_SCOPES // ex: "read write" ou "offline_access payments" (confirme nomenclatura suportada pela app)
    const testFlow = process.env.MERCADOPAGO_TEST_FLOW === 'true'

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      state
    })
    if (scopes) params.set('scope', scopes)
    if (testFlow) params.set('test_flow', 'true')

    // Removido platform_id=mp (não é obrigatório e pode gerar 400 se reservado a integrações específicas)
    const url = `${host}?${params.toString()}`

  return NextResponse.json({ success: true, url, state, minimal: minimalMode })
  } catch (error) {
    console.error('Erro gerar connect url:', error)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
