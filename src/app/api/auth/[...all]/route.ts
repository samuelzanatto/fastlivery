import { auth } from "@/lib/auth/auth"
import { toNextJsHandler } from "better-auth/next-js"
import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, createRateLimitHeaders } from "@/lib/security/rate-limit"

const handler = toNextJsHandler(auth.handler)

const ALLOWED_ORIGINS = [
  // URLs de desenvolvimento
  ...(process.env.NODE_ENV === 'development' ? [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://192.168.1.106:3000'
  ] : []),
  // URLs de produção e staging
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NGROK_URL
].filter(Boolean)

function corsHeaders(origin: string | null) {
  const headers: Record<string,string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cookie, Set-Cookie',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin'
  }
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

// Rotas que precisam de rate limiting mais rigoroso
const AUTH_SENSITIVE_PATHS = [
  '/sign-in/email',
  '/sign-up/email', 
  '/send-verification-otp',
  '/verify-email',
  '/reset-password'
]

async function withCors(request: NextRequest, exec: () => Promise<Response>) {
  const origin = request.headers.get('origin')
  
  // Verificar se é uma rota sensível de auth que precisa de rate limiting
  const pathname = new URL(request.url).pathname
  const authPath = pathname.replace('/api/auth', '')
  const isAuthSensitive = AUTH_SENSITIVE_PATHS.some(path => authPath.startsWith(path))
  
  if (isAuthSensitive && request.method === 'POST') {
    const rateLimitResult = checkRateLimit(request, 'auth')
    
    if (!rateLimitResult.allowed) {
      console.warn(`[RATE-LIMIT] Auth blocked for ${authPath} - IP: ${
        request.headers.get('x-real-ip') || 
        request.headers.get('x-forwarded-for') || 
        'unknown'
      }`)
      
      const rateLimitHeaders = createRateLimitHeaders(rateLimitResult)
      const corsHdrs = corsHeaders(origin)
      
      return new NextResponse(
        JSON.stringify({ 
          error: 'Muitas tentativas de autenticação. Tente novamente em alguns minutos.',
          code: 'RATE_LIMIT_EXCEEDED'
        }),
        { 
          status: 429,
          headers: { ...corsHdrs, ...rateLimitHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
  }
  
  const base = await exec()
  const response = base instanceof NextResponse ? base : new NextResponse(base.body, { status: base.status, headers: base.headers })
  const headers = corsHeaders(origin)
  Object.entries(headers).forEach(([k,v]) => response.headers.set(k,v))
  return response
}

export async function GET(request: NextRequest) {
  return withCors(request, () => handler.GET(request))
}

export async function POST(request: NextRequest) {
  return withCors(request, () => handler.POST(request))
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}
