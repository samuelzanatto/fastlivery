import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import jwt from 'jsonwebtoken'

/**
 * API para gerar tokens JWT compatíveis com Supabase
 * Permite que sessões Better Auth funcionem com Supabase Realtime
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação Better Auth
    const session = await auth.api.getSession({ 
      headers: request.headers 
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Obter secret do Supabase JWT
    const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET
    if (!supabaseJwtSecret) {
      console.error('[supabase-token] SUPABASE_JWT_SECRET não configurado')
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      )
    }

    // Mapear roles do Better Auth para roles do Supabase
    const mapToSupabaseRole = (betterAuthRole?: string | null): string => {
      // Supabase reconhece apenas: 'anon', 'authenticated', 'service_role'
      // Todos os usuários autenticados devem usar 'authenticated'
      return betterAuthRole ? 'authenticated' : 'authenticated'
    }

    // Criar payload JWT compatível com Supabase
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      aud: 'authenticated',
      exp: now + (60 * 60), // 1 hora
      iat: now,
      iss: 'fastlivery-better-auth',
      sub: session.user.id,
      email: session.user.email,
      role: mapToSupabaseRole(session.user.role), // Sempre 'authenticated'
      user_metadata: {
        name: session.user.name,
        email: session.user.email,
        role: session.user.role, // Manter role original do Better Auth
        better_auth_role: session.user.role // Para referência
      },
      app_metadata: {
        provider: 'better-auth',
        providers: ['better-auth'],
        better_auth_role: session.user.role
      }
    }

    // Gerar token JWT
    const token = jwt.sign(payload, supabaseJwtSecret, {
      algorithm: 'HS256'
    })

    return NextResponse.json({ 
      token,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role
      }
    })

  } catch (error) {
    console.error('[supabase-token] Erro ao gerar token:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}