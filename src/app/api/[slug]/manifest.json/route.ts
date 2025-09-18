import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Buscar restaurante pelo slug
    const restaurant = await prisma.restaurant.findFirst({
      where: { slug }
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    // Configurar URLs baseadas no ambiente
    // IMPORTANTE: start_url deve estar dentro do scope para evitar warning
    const startUrl = `/${slug}/`
    const scope = `/${slug}/`

    // Cores padrão ou personalizadas
    const themeColor = '#1f2937' // Tailwind gray-800
    const backgroundColor = '#ffffff'

    // Gerar manifest PWA dinâmico
    const manifest = {
      id: scope,
      name: restaurant.name,
      short_name: restaurant.name.length > 12 
        ? restaurant.name.substring(0, 12) + '...' 
        : restaurant.name,
      description: restaurant.description || `${restaurant.name} - Delivery e Takeout`,
      start_url: startUrl,
      scope: scope,
      display: 'standalone',
      display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
      orientation: 'portrait-primary',
      theme_color: themeColor,
      background_color: backgroundColor,
      lang: 'pt-BR',
      dir: 'ltr',
      
      // Ícones PWA - usar logo do restaurante se disponível
      icons: [
        {
          src: restaurant.avatar 
            ? `/api/${slug}/pwa-icon?size=72` 
            : '/api/default-pwa-icon?size=72',
          sizes: '72x72',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: restaurant.avatar 
            ? `/api/${slug}/pwa-icon?size=96` 
            : '/api/default-pwa-icon?size=96',
          sizes: '96x96',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: restaurant.avatar 
            ? `/api/${slug}/pwa-icon?size=128` 
            : '/api/default-pwa-icon?size=128',
          sizes: '128x128',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: restaurant.avatar 
            ? `/api/${slug}/pwa-icon?size=144` 
            : '/api/default-pwa-icon?size=144',
          sizes: '144x144',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: restaurant.avatar 
            ? `/api/${slug}/pwa-icon?size=152` 
            : '/api/default-pwa-icon?size=152',
          sizes: '152x152',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: restaurant.avatar 
            ? `/api/${slug}/pwa-icon?size=192` 
            : '/api/default-pwa-icon?size=192',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: restaurant.avatar 
            ? `/api/${slug}/pwa-icon?size=384` 
            : '/api/default-pwa-icon?size=384',
          sizes: '384x384',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: restaurant.avatar 
            ? `/api/${slug}/pwa-icon?size=512` 
            : '/api/default-pwa-icon?size=512',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ],

      // Screenshots para app store
      screenshots: [
        {
          src: restaurant.banner || '/images/pwa-screenshot.png',
          sizes: '1280x720',
          type: 'image/png',
          form_factor: 'wide'
        }
      ],

      // Atalhos no menu do app
      shortcuts: [
        {
          name: 'Cardápio',
          short_name: 'Menu',
          description: 'Ver cardápio completo',
          url: `/${slug}/cardapio`,
          icons: [
            {
              src: '/icons/menu-shortcut.png',
              sizes: '192x192',
              type: 'image/png'
            }
          ]
        },
        {
          name: 'Fazer Pedido',
          short_name: 'Pedido',
          description: 'Realizar novo pedido',
          url: `/${slug}`,
          icons: [
            {
              src: '/icons/order-shortcut.png',
              sizes: '192x192',
              type: 'image/png'
            }
          ]
        }
      ],

      // Categorias para app store
      categories: ['food', 'lifestyle', 'shopping'],

      // Configurações de captura de URL
      capture_links: 'existing-client-navigate',

      // PWA Features
      features: [
        'fast',
        'installable',
        'offline',
        'responsive'
      ],

      // Relacionados (para detecção de app já instalado)
      related_applications: [],
      prefer_related_applications: false,

      // Edge cases
      edge_side_panel: {
        preferred_width: 400
      }
    }

    // Headers para cache e tipo de conteúdo
    const response = NextResponse.json(manifest)
    
    response.headers.set('Content-Type', 'application/manifest+json')
    response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
    response.headers.set('Access-Control-Allow-Origin', '*')

    return response

  } catch (error) {
    console.error('Error generating PWA manifest:', error)
    return NextResponse.json(
      { error: 'Failed to generate manifest' },
      { status: 500 }
    )
  }
}