import { NextRequest, NextResponse } from "next/server"
import { auth } from '@/lib/auth/auth'
import { checkRoleAccess, hasRouteAccess } from '@/lib/security/permission-cache'
import { getAllowedOrigins } from '@/lib/utils/urls'

// Categorias de roles
const PLATFORM_ROLES = new Set(['platformAdmin','platformSupport'])
const BUSINESS_ROLES = new Set([
  'businessOwner','businessAdmin','businessManager','businessStaff'
])
const CUSTOMER_ROLE = 'customer'

// Define protected routes that require BUSINESS_ADMIN authentication
const adminRoutes = [
  '/dashboard',
  '/supplier-dashboard',
  '/supplier-products',
  '/supplier-orders',
  '/supplier-partnerships', 
  '/supplier-clients',
  '/supplier-analytics',
  '/supplier-billing',
  '/supplier-subscription-manage',
  '/supplier-settings',
  '/supplier-support',
  '/partnership-requests',
  '/supplier-subscription',
  '/analytics',
  '/products',
  '/orders',
  '/customers',
  '/settings',
  '/tables',
  '/users', // Gestão de funcionários
  '/permissions', // Gestão de permissões
  '/test-payment',
  '/checkout',
  '/categories',
  '/additionals',
  '/marketplace'
]

// Define protected routes that require CUSTOMER authentication  
const customerRoutes = ['/conta', '/enderecos', '/pedidos', '/favoritos']

// Define auth routes (should redirect appropriately if already authenticated)
const authRoutes = ['/login', '/register', '/signup', '/signin', '/customer-login', '/customer-signup']// Define public routes that should never be treated as business slugs
const publicRoutes = ['/payment', '/api', '/auth', '/about', '/contact', '/terms', '/privacy', '/test-subscription']

// Function to check if a slug could be a business slug
function couldBeBusinessSlug(pathname: string): boolean {
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

const ALLOWED_ORIGINS = getAllowedOrigins()

function buildCorsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ''
  const headers: Record<string,string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cookie, Set-Cookie',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
    // Enhanced security headers
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://secure.mlstatic.com https://*.mercadopago.com https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://sdk.mercadopago.com https://secure.mlstatic.com https://*.mercadopago.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://api.mercadopago.com https://*.mercadopago.com https://sdk.mercadopago.com https://api.stripe.com wss: ws:",
      "frame-src 'self' https://*.mercadopago.com https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  }
  if (allowOrigin) headers['Access-Control-Allow-Origin'] = allowOrigin
  return headers
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin')

  // Log apenas navegações importantes em desenvolvimento
  if (process.env.NODE_ENV === 'development' && 
      !pathname.startsWith('/_next/') && 
      !pathname.includes('.') &&
      !request.headers.get('purpose')) {
    console.log(`[MIDDLEWARE] ${pathname}`)
  }

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
  const isPossibleBusinessSlug = couldBeBusinessSlug(pathname)

  // Handle admin (business or platform) routes
  if (isAdminRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url) // Corrigido: usar /login para admin
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    // Redirecionar fornecedores do /dashboard para /supplier-dashboard
    if (pathname === '/dashboard' && user?.role === 'supplierOwner') {
      return NextResponse.redirect(new URL('/supplier-dashboard', request.url))
    }
    
    const role = user?.role
    // Usar sistema otimizado de verificação de permissões
    const roleAccess = checkRoleAccess(role || undefined)
    const hasSpecificRouteAccess = hasRouteAccess(role || undefined, pathname)
    
    if (!roleAccess.hasAdminRoutes || !hasSpecificRouteAccess) {
      // Security log - use console.warn as secureLogger not available in middleware context
      console.warn(`[SECURITY] Unauthorized admin route access`, {
        pathname,
        role,
        hasUser: !!user?.id,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      })
      return NextResponse.redirect(new URL('/login?error=access_denied', request.url))
    }

    // Check if user/business is active
    if (!user?.isActive) {
      return NextResponse.redirect(new URL('/checkout/public', request.url))
    }
  }
  
  // Handle customer routes (somente customer simples)
  if (isCustomerRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/customer-login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
    if (user?.role !== CUSTOMER_ROLE) {
      return NextResponse.redirect(new URL('/customer-login?error=not_customer', request.url))
    }
  }
  
  // Handle auth routes - redirect if already authenticated
  if (isAuthRoute && isAuthenticated) {
    if (user?.role === 'supplierOwner') {
      return NextResponse.redirect(new URL('/supplier-dashboard', request.url))
    } else if (user?.role && (PLATFORM_ROLES.has(user.role) || BUSINESS_ROLES.has(user.role))) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else if (user?.role === CUSTOMER_ROLE) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }
  
  // Legacy redirects
  // /login é a rota correta para admin - removido o redirect
  
  if (pathname === '/signup' || pathname === '/register' || pathname === '/signin') {
    return NextResponse.redirect(new URL('/customer-signup', request.url))
  }
  
  // For possible business slugs, add a header to help the page identify it's a business route
  const response = NextResponse.next()
  if (isPossibleBusinessSlug) {
    response.headers.set('x-business-slug', pathname.substring(1))
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