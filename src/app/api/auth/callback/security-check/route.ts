import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    console.log('[SECURITY] Checking user after OAuth callback:', { 
      id: user.id, 
      email: user.email, 
      userType: user.userType
    })

    // Se for um usuário OAuth (Google) que não tem userType CUSTOMER, corrigir
    const dbUser = await prisma.user.findUnique({ 
      where: { id: user.id },
      include: { accounts: true }
    })

    if (dbUser) {
      const hasOAuthAccount = dbUser.accounts.some(account => 
        account.providerId === 'google'
      )

      if (hasOAuthAccount && dbUser.userType !== 'CUSTOMER') {
        console.warn('[SECURITY] Fixing OAuth user with invalid userType:', {
          userId: dbUser.id,
          email: dbUser.email,
          currentType: dbUser.userType,
          provider: 'google'
        })

        await prisma.user.update({
          where: { id: dbUser.id },
          data: { 
            userType: 'CUSTOMER',
            isActive: true
          }
        })

        return NextResponse.json({ 
          fixed: true, 
          message: 'User type corrected to CUSTOMER' 
        })
      }
    }

    return NextResponse.json({ 
      valid: true, 
      userType: user.userType 
    })
  } catch (error) {
    console.error('[SECURITY] OAuth security check failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
