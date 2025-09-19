import { NextRequest, NextResponse } from "next/server"
import { auth } from '@/lib/auth'

// Define protected routes that require RESTAURANT_ADMIN authentication
const adminRoutes = [
  '/dashboard',
  '/analytics',
  '/products',
  '/orders',
  '/customers',
  '/settings',
  '/tables',
  '/waiter-orders', // Adicionada para alinhar proteção e evitar ser tratada como slug
  '/users', // Gestão de funcionários
  '/permissions', // Gestão de permissões
  '/test-payment',
  '/checkout'
]

// Define protected routes that require CUSTOMER authentication  
const customerRoutes = ['/conta', '/enderecos', '/pedidos', '/favoritos']

// Define auth routes (should redirect appropriately if already authenticated)
const authRoutes = ['/login', '/register', '/signup', '/signin', '/customer-login', '/customer-signup']// Define public routes that should never be treated as restaurant slugs
const publicRoutes = ['/payment', '/api', '/auth', '/about', '/contact', '/terms', '/privacy', '/test-subscription']

// Function to check if a slug could be a restaurant slug
function couldBeRestaurantSlug(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean)
  
  // Must be exactly one segment (e.g., /pizzaria-do-joao)
  if (segments.length !== 1) return false
  
  // Must not be a known public route
  if (publicRoutes.some(route => pathname.startsWith(route))) return false
  
  // Must not be a known protected route
  if ([...adminRoutes, ...customerRoutes].some(route => pathname.startsWith(route))) return false
  
  // Must not be an auth route
  if (authRoutes.some(route => pathname.startsWith(route))) return false
  
  // Basic slug validation (letters, numbers, hyphens, minimum length)
  const slug = segments[0]
  const slugPattern = /^[a-z0-9\-]+$/i
  return slugPattern.test(slug) && slug.length >= 3
}

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://192.168.1.106:3000',
  'https://sdk.mercadopago.com',
  'https://api.mercadopago.com',
  'https://secure.mlstatic.com',
  process.env.NEXT_PUBLIC_APP_URL || ''
].filter(Boolean)

function buildCorsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ''
  const headers: Record<string,string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cookie, Set-Cookie',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
    // Headers específicos para Mercado Pago
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://secure.mlstatic.com https://*.mercadopago.com",
      "style-src 'self' 'unsafe-inline' https://sdk.mercadopago.com https://secure.mlstatic.com https://*.mercadopago.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://api.mercadopago.com https://*.mercadopago.com https://sdk.mercadopago.com wss: ws:",
      "frame-src 'self' https://*.mercadopago.com",
    ].join('; ')
  }
  if (allowOrigin) headers['Access-Control-Allow-Origin'] = allowOrigin
  return headers
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin')

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: buildCorsHeaders(origin) })
  }
  
  // Get session using Better Auth
  let session = null
  try {
    session = await auth.api.getSession({
      headers: request.headers,
    })
  } catch (error) {
    // Session verification failed
    console.error('Session verification failed:', error)
  }
  
  const isAuthenticated = !!session
  const user = session?.user
  
  // Check route types
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))
  const isCustomerRoute = customerRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  const isPossibleRestaurantSlug = couldBeRestaurantSlug(pathname)
  
  // Handle admin routes
  if (isAdminRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url) // Corrigido: usar /login para admin
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    // CRITICAL SECURITY: Check if user is admin or employee (NOT customer)
    if (user?.userType === 'CUSTOMER' || !['ADMIN', 'EMPLOYEE'].includes(user?.userType || '')) {
      console.warn(`[SECURITY] Customer or invalid user type "${user?.userType}" tried to access admin route: ${pathname}`, {
        userId: user?.id,
        email: user?.email,
        userType: user?.userType,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent')
      })
      return NextResponse.redirect(new URL('/login?error=access_denied', request.url))
    }
    
    // Check if user/restaurant is active
    if (!user?.isActive) {
      return NextResponse.redirect(new URL('/checkout/public', request.url))
    }
  }
  
  // Handle customer routes
  if (isCustomerRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/customer-login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    // Check if user is customer
    if (user?.userType !== 'CUSTOMER') {
      return NextResponse.redirect(new URL('/customer-login?error=not_customer', request.url))
    }
  }
  
  // Handle auth routes - redirect if already authenticated
  if (isAuthRoute && isAuthenticated) {
    if (['ADMIN', 'EMPLOYEE'].includes(user?.userType || '')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else if (user?.userType === 'CUSTOMER') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }
  
  // Legacy redirects
  // /login é a rota correta para admin - removido o redirect
  
  if (pathname === '/signup' || pathname === '/register' || pathname === '/signin') {
    return NextResponse.redirect(new URL('/customer-signup', request.url))
  }
  
  // For possible restaurant slugs, add a header to help the page identify it's a restaurant route
  const response = NextResponse.next()
  if (isPossibleRestaurantSlug) {
    response.headers.set('x-restaurant-slug', pathname.substring(1))
  }
  const corsHeaders = buildCorsHeaders(origin)
  Object.entries(corsHeaders).forEach(([k,v]) => response.headers.set(k,v))
  return response
}

// Configure which routes the middleware should run on  
export const config = {
  runtime: 'nodejs', // Force Node.js runtime for better-auth and other dependencies
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public|icon-192x192.png|icon-512x512.png).*)',
  ],
}