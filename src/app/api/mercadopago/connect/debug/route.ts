import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'

// Rota de debug para investigar erro 400 na autorização OAuth do Mercado Pago
// NÃO deixar em produção permanente (remover ou proteger depois).
export async function GET(req: Request) {
  const diagnostics: Record<string, unknown> = { step: 'start' }
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session?.user) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })

    diagnostics.sessionUser = session.user.id

    const business = await prisma.business.findFirst({ where: { ownerId: session.user.id } })
    if (!business) return NextResponse.json({ success: false, error: 'Negócio não encontrado' }, { status: 404 })
    diagnostics.businessId = business.id

    const clientId = process.env.MERCADOPAGO_CLIENT_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadopago/callback`

    if (!clientId) return NextResponse.json({ success: false, error: 'MERCADOPAGO_CLIENT_ID ausente' }, { status: 500 })
    if (!process.env.NEXT_PUBLIC_APP_URL) diagnostics.warnAppUrl = 'NEXT_PUBLIC_APP_URL ausente'

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

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      state: business.id // debug: estado simples
    })

    if (process.env.MERCADOPAGO_OAUTH_SCOPES) params.set('scope', process.env.MERCADOPAGO_OAUTH_SCOPES)
    if (process.env.MERCADOPAGO_TEST_FLOW === 'true') params.set('test_flow', 'true')

    const url = `${host}?${params.toString()}`
    diagnostics.authorizationUrl = url

    // Heurísticas de possíveis problemas
    const issues: string[] = []
    if (!redirectUri.startsWith('https://')) issues.push('redirect_uri não HTTPS (pode rejeitar em produção)')
    if (redirectUri.includes('ngrok-free.app')) issues.push('Usando ngrok ephemeral (garantir que URI cadastrada seja idêntica)')
    if (clientId.trim() === '') issues.push('client_id vazio')
    diagnostics.potentialIssues = issues

    return NextResponse.json({ success: true, diagnostics })
  } catch (e) {
    diagnostics.error = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, diagnostics }, { status: 500 })
  }
}
