import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Gera um JWT compatível com Supabase Realtime usando SUPABASE_JWT_SECRET
 * Inclui apenas claims necessárias para policies baseadas em role ou user id.
 * Caso você venha a usar RLS com auth.uid() precisará garantir que o 'sub' aqui
 * corresponda ao id do usuário no Supabase Auth ou adequar policies para custom claim.
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })
    const user = session?.user

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated (no user)' }, { status: 401 })
    }

    const secret = process.env.SUPABASE_JWT_SECRET
    if (!secret) {
      return NextResponse.json({ error: 'SUPABASE_JWT_SECRET not set' }, { status: 500 })
    }

    // Basic claims. 'role' must match an allowed role for realtime (e.g., authenticated)
    const payload = {
      sub: user.id,  // subject = Better Auth user id (ajuste se tiver id diferente no Supabase)
      email: user.email,
      role: 'authenticated',
      // Custom claim namespace (opcional) para futuras policies
      'app_metadata': { better_auth: true }
    }

    // Token curto para minimizar risco de vazamento
    const token = jwt.sign(payload, secret, { expiresIn: '10m' })

    return NextResponse.json({ token, user: { id: user.id, email: user.email } })
  } catch (error) {
    console.error('Erro ao gerar realtime token:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
