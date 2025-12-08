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

    // Base URL para os ícones dinâmicos
    const iconBaseUrl = `/${slug}/icon`

    // Construir manifest
    const manifest = {
      name: business.name,
      short_name: business.name.length > 12 
        ? business.name.substring(0, 12) 
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
      
      // Ícones - usar API dinâmica que redimensiona o avatar
      icons: [
        {
          src: `${iconBaseUrl}?size=72`,
          sizes: '72x72',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: `${iconBaseUrl}?size=96`,
          sizes: '96x96',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: `${iconBaseUrl}?size=128`,
          sizes: '128x128',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: `${iconBaseUrl}?size=144`,
          sizes: '144x144',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: `${iconBaseUrl}?size=152`,
          sizes: '152x152',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: `${iconBaseUrl}?size=192`,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: `${iconBaseUrl}?size=384`,
          sizes: '384x384',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: `${iconBaseUrl}?size=512`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: `${iconBaseUrl}?size=192`,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: `${iconBaseUrl}?size=512`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
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
