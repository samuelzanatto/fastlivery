import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'

// SECURITY: Endpoint para verificar e corrigir usuários OAuth após callback
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 })
    }

    const user = session.user
    console.log('[SECURITY] OAuth callback security check (simplificado):', { id: user.id, email: user.email })
    // Apenas valida a existência da sessão agora
    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('[SECURITY] OAuth security check failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
