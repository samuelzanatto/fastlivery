import { NextRequest, NextResponse } from "next/server"

// Categorias de roles (Inlined to avoid imports from Node/React files)
const PLATFORM_ROLES = new Set(['platformAdmin', 'platformSupport'])
const BUSINESS_ROLES = new Set([
    'businessOwner', 'businessAdmin', 'businessManager', 'businessStaff'
])
const CUSTOMER_ROLE = 'customer'

// Define protected routes that require BUSINESS_ADMIN authentication
const adminRoutes = [
    '/admin/dashboard', // Explicitly include admin dashboard
    '/dashboard',
    '/analytics',
    '/products',
    '/orders',
    '/customers',
    '/settings',
    '/tables',
    '/users', // Gestão de funcionários
    '/permissions', // Gestão de permissões
    '/categories',
    '/additionals'
]

// Define protected routes that require CUSTOMER authentication  
const customerRoutes = ['/conta', '/enderecos', '/pedidos', '/favoritos']

// Define auth routes (should redirect appropriately if already authenticated)
const authRoutes = ['/login', '/register', '/signin', '/customer-login']

// Define public routes that should never be treated as business slugs
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

// Simple CORS header builder
function buildCorsHeaders(origin: string | null) {
    const headers: Record<string, string> = {
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cookie, Set-Cookie',
        'Access-Control-Allow-Credentials': 'true',
        'Vary': 'Origin',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    }
    if (origin) headers['Access-Control-Allow-Origin'] = origin
    return headers
}

export default async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    const origin = request.headers.get('origin')

    // Log all main navigations for debugging the loop
    if (!pathname.startsWith('/_next/') &&
        !pathname.includes('.') &&
        !pathname.startsWith('/api/') &&
        !request.headers.get('purpose')) {
        console.log(`[PROXY] Request: ${pathname} | Origin: ${origin} | Referer: ${request.headers.get('referer')}`)
    }

    if (request.method === 'OPTIONS') {
        return new NextResponse(null, { status: 204, headers: buildCorsHeaders(origin) })
    }

    // Edge Session Presence Check
    // Ao invés de fazer um fetch `get-session` e bater no banco de dados durante o Edge 
    // (o que causa loops no Vercel por conta de headers, fetch constraints e latency),
    // o Middleware atua apenas verificando a presença do cookie de sessão.
    // A VERIFICAÇÃO REAL DE SEGURANÇA E ROLES ocorre nas Layouts ou Server Components!
    const hasSecureToken = request.cookies.has('__Secure-better-auth.session_token')
    const hasToken = request.cookies.has('better-auth.session_token')
    const isAuthenticated = hasSecureToken || hasToken
    
    // Como não obtemos os dados reais neste fetch no Edge, definimos o usuário como nulo aqui.
    // A validação de role fica a cargo do React / Layouts.
    const user = null
    console.log(`[PROXY DEBUG] Auth status final: isAuthenticated=${isAuthenticated} (verificado via cookie)`)

    // Check route types
    const isAdminRoute = pathname.startsWith('/admin') || adminRoutes.some(route => pathname.startsWith(route))
    const isCustomerRoute = customerRoutes.some(route => pathname.startsWith(route))
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
    const isPossibleBusinessSlug = couldBeBusinessSlug(pathname)

    // Skip auth check for public admin routes (login)
    // Redirecionamentos de login para dashboard são feitos pelo cliente/layout.
    if (pathname === '/admin/login') {
        if (isAuthenticated) {
            console.log(`[PROXY] Authenticated access to login, letting layout handle redirect...`)
            // Retorna sem redirect para que o Next.js lide com o App Router
        }
    } else if (isAdminRoute) {
        // Handle protected admin routes
        if (!isAuthenticated) {
            console.log(`[PROXY] Unauthenticated access to admin route ${pathname}, redirecting to login`)
            const loginUrl = new URL('/admin/login', request.url)
            loginUrl.searchParams.set('callbackUrl', pathname)
            return NextResponse.redirect(loginUrl)
        }
        // Validação de Role substituída pelo AdminLayout para evitar chamadas de DB no Vercel Edge.
    }

    // Handle customer routes
    if (isCustomerRoute) {
        if (!isAuthenticated) {
            const loginUrl = new URL('/customer-login', request.url)
            loginUrl.searchParams.set('callbackUrl', pathname)
            return NextResponse.redirect(loginUrl)
        }
        // Validação de Role do cliente também deixada para a camada App Router.
    }

    // Handle auth routes - redirect se a pessoa estiver acessando páginas genéricas `/login`
    if (isAuthRoute && isAuthenticated && pathname !== '/admin/login') {
        // Sem como saber a role no Edge, os layouts do Next.js devem validar
        // e redirecionar pra /dashboard ou / a depender da role na hidratação.
        console.log(`[PROXY] Authenticated access to ${pathname}, leaving redirect to the React application`)
    }

    if (pathname === '/signup' || pathname === '/register' || pathname === '/signin') {
        return NextResponse.redirect(new URL('/customer-login', request.url))
    }

    const response = NextResponse.next()
    if (isPossibleBusinessSlug) {
        response.headers.set('x-business-slug', pathname.substring(1))
    }
    const corsHeaders = buildCorsHeaders(origin)
    Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v))
    return response
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|public|icon-192x192.png|icon-512x512.png).*)',
    ]
}
