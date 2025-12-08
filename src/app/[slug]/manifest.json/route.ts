import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'

// Gera manifest.json dinâmico para cada restaurante
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Buscar dados do restaurante
    const business = await prisma.business.findFirst({
      where: { slug },
      select: {
        id: true,
        name: true,
        avatar: true,
        description: true,
      }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      )
    }

    // Cores padrão
    const themeColor = '#f97316' // orange-500
    const backgroundColor = '#ffffff'

    // Construir manifest
    const manifest = {
      name: business.name,
      short_name: business.name.length > 12 
        ? business.name.substring(0, 12) + '...' 
        : business.name,
      description: business.description || `Faça seu pedido no ${business.name}`,
      
      // Importante: start_url e scope são específicos do restaurante
      start_url: `/${slug}`,
      scope: `/${slug}`,
      id: `/${slug}`,
      
      display: 'standalone',
      orientation: 'portrait',
      
      theme_color: themeColor,
      background_color: backgroundColor,
      
      // Ícones - usar avatar do restaurante ou fallback
      icons: business.avatar ? [
        {
          src: business.avatar,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: business.avatar,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: business.avatar,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable'
        }
      ] : [
        // Ícones fallback
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        }
      ],
      
      // Categorias para app stores
      categories: ['food', 'shopping', 'lifestyle'],
      
      // Atalhos rápidos
      shortcuts: [
        {
          name: 'Ver Cardápio',
          short_name: 'Cardápio',
          description: 'Acesse o cardápio completo',
          url: `/${slug}`,
          icons: [{ src: '/icons/menu-icon.png', sizes: '96x96' }]
        },
        {
          name: 'Meus Pedidos',
          short_name: 'Pedidos',
          description: 'Acompanhe seus pedidos',
          url: `/pedidos`,
          icons: [{ src: '/icons/orders-icon.png', sizes: '96x96' }]
        }
      ],
      
      // Screenshots para instalação rica
      screenshots: [
        {
          src: business.avatar || '/screenshots/menu.png',
          sizes: '540x720',
          type: 'image/png',
          form_factor: 'narrow',
          label: 'Cardápio do restaurante'
        }
      ],
      
      // Relacionado ao app nativo (se tiver no futuro)
      related_applications: [],
      prefer_related_applications: false,
      
      // Protocolo de compartilhamento
      share_target: {
        action: `/${slug}`,
        method: 'GET',
        params: {
          title: 'title',
          text: 'text',
          url: 'url'
        }
      }
    }

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400', // Cache 1h client, 1d CDN
      }
    })
  } catch (error) {
    console.error('Erro ao gerar manifest:', error)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}
