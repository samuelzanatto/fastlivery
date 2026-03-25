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

    // Minimal Session Check via Fetch (Edge Safe)
    // We use the Better Auth API endpoint to validate the session cookie
    let session = null
    try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
        
        // Em Vercel Edge, encaminhar todos os headers é a forma mais segura de garantir
        // que cookies, Host, Origin e User-Agent cheguem idênticos ao servidor auth.
        const res = await fetch(`${appUrl}/api/auth/get-session`, {
            headers: request.headers,
            cache: 'no-cache'
        })
        
        const responseText = await res.text()
        console.log(`[PROXY DEBUG] get-session status=${res.status} | ok=${res.ok} | bodyPrefix=${responseText.substring(0, 100)}...`)
        
        if (res.ok) {
            try {
                const data = JSON.parse(responseText)
                // Better Auth retorna { session: null, user: null } quando não autenticado
                if (data && data.session) {
                    session = data
                } else {
                    console.log('[PROXY DEBUG] get-session retornou data válida porém sem session:', data)
                }
            } catch (e) {
                console.error('[PROXY DEBUG] Falha ao parsear JSON:', e)
            }
        }
    } catch (error) {
        // Fail silently on auth check error
        console.error('[PROXY DEBUG] Falha catastrófica no fetch:', error)
    }

    const isAuthenticated = !!session
    const user = session?.user
    console.log(`[PROXY DEBUG] Auth status final: isAuthenticated=${isAuthenticated}, userRole=${user?.role}`)

    // Check route types
    const isAdminRoute = pathname.startsWith('/admin') || adminRoutes.some(route => pathname.startsWith(route))
    const isCustomerRoute = customerRoutes.some(route => pathname.startsWith(route))
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
    const isPossibleBusinessSlug = couldBeBusinessSlug(pathname)

    // Skip auth check for public admin routes (login)
    if (pathname === '/admin/login') {
        // If logged in as admin, redirect to dashboard
        if (isAuthenticated) {
            const role = user?.role
            const isPlatform = role && (['platformAdmin', 'platformSupport'].includes(role))
            if (isPlatform) {
                console.log(`[PROXY] Redirecting authenticated admin from login to dashboard`)
                return NextResponse.redirect(new URL('/admin/dashboard', request.url))
            }
        }
    } else if (isAdminRoute) {
        // Handle protected admin routes
        if (!isAuthenticated) {
            console.log(`[PROXY] Unauthenticated access to admin route ${pathname}, redirecting to login`)
            const loginUrl = new URL('/admin/login', request.url)
            loginUrl.searchParams.set('callbackUrl', pathname)
            return NextResponse.redirect(loginUrl)
        }

        // Simple Role Check (replaces permission-cache for Edge safety)
        const role = user?.role
        const isBusiness = role && (['businessOwner', 'businessAdmin', 'businessManager', 'businessStaff'].includes(role))
        const isPlatform = role && (['platformAdmin', 'platformSupport'].includes(role))

        if (!isBusiness && !isPlatform) {
            console.warn(`[SECURITY] Unauthorized admin route access: ${role}`)
            return NextResponse.redirect(new URL('/admin/login?error=access_denied', request.url))
        }

        // Check if user/business is active
        if (user && 'isActive' in user && !user.isActive) {
            console.log(`[PROXY] Inactive user accessing admin route, redirecting to home`)
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    // Handle customer routes
    if (isCustomerRoute) {
        if (!isAuthenticated) {
            const loginUrl = new URL('/customer-login', request.url)
            loginUrl.searchParams.set('callbackUrl', pathname)
            return NextResponse.redirect(loginUrl)
        }
        // Strict customer role check might be too aggressive if admins want to see customer pages?
        // For now, keep as is
        if (user?.role !== CUSTOMER_ROLE) {
            // Allow admins to view customer pages if needed? No, redirect them to dashboard
            // Or just let them fall through if they shouldn't be here.
            // The original code redirected non-customers:
            return NextResponse.redirect(new URL('/customer-login?error=not_customer', request.url))
        }
    }

    // Handle auth routes - redirect if already authenticated
    if (isAuthRoute && isAuthenticated) {
        if (user?.role && (PLATFORM_ROLES.has(user.role) || BUSINESS_ROLES.has(user.role))) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        } else if (user?.role === CUSTOMER_ROLE) {
            return NextResponse.redirect(new URL('/', request.url))
        }
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
