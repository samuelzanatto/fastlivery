import { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { ReactNode } from 'react'
import { prisma } from '@/lib/prisma'
import PWAWrapper from '@/components/pwa-wrapper'
import PWADebugPanel from '@/components/pwa-debug-panel'

interface LayoutProps {
  children: ReactNode
  params: Promise<{ slug: string }>
}

// Gerar viewport dinâmico para PWA
export async function generateViewport({ params }: { params: Promise<{ slug: string }> }): Promise<Viewport> {
  const resolvedParams = await params
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug: resolvedParams.slug }
  })

  const themeColor = restaurant ? '#1f2937' : '#1f2937'

  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
    themeColor,
    colorScheme: 'light',
  }
}

// Gerar metadata dinâmico para PWA
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug: resolvedParams.slug }
  })

  if (!restaurant) {
    return {
      title: 'Restaurante não encontrado'
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const themeColor = '#1f2937'

  return {
    title: restaurant.name,
    description: restaurant.description || `${restaurant.name} - Delivery e Takeout`,
    manifest: `/api/${resolvedParams.slug}/manifest.json`,
    
    // PWA Meta Tags
    applicationName: restaurant.name,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: restaurant.name,
      startupImage: restaurant.banner ? [
        {
          url: restaurant.banner,
          media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)'
        }
      ] : undefined
    },

    // Icons
    icons: {
      icon: [
        {
          url: restaurant.avatar ? `/api/${resolvedParams.slug}/pwa-icon?size=32` : '/favicon.ico',
          sizes: '32x32',
          type: 'image/png'
        },
        {
          url: restaurant.avatar ? `/api/${resolvedParams.slug}/pwa-icon?size=192` : '/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        }
      ],
      apple: [
        {
          url: restaurant.avatar ? `/api/${resolvedParams.slug}/pwa-icon?size=180` : '/apple-touch-icon.png',
          sizes: '180x180',
          type: 'image/png'
        }
      ],
      other: [
        {
          rel: 'mask-icon',
          url: restaurant.avatar ? `/api/${resolvedParams.slug}/pwa-icon?size=192` : '/safari-pinned-tab.svg',
          color: themeColor
        }
      ]
    },

    // Open Graph
    openGraph: {
      title: restaurant.name,
      description: restaurant.description || `${restaurant.name} - Delivery e Takeout`,
      type: 'website',
      locale: 'pt_BR',
      url: `${baseUrl}/${resolvedParams.slug}`,
      siteName: restaurant.name,
      images: restaurant.banner ? [
        {
          url: restaurant.banner,
          width: 1200,
          height: 630,
          alt: `${restaurant.name} banner`
        }
      ] : undefined
    },

    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title: restaurant.name,
      description: restaurant.description || `${restaurant.name} - Delivery e Takeout`,
      images: restaurant.banner ? [restaurant.banner] : undefined
    },

    // Additional meta tags
    other: {
      'mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'black-translucent',
      'apple-mobile-web-app-title': restaurant.name,
      'format-detection': 'telephone=no',
      'msapplication-TileColor': themeColor,
      'msapplication-TileImage': restaurant.avatar ? `/api/${resolvedParams.slug}/pwa-icon?size=144` : '/ms-icon-144x144.png',
      'msapplication-config': '/browserconfig.xml',
      'msapplication-navbutton-color': themeColor,
      'application-name': restaurant.name,
      'background-color': '#ffffff',
      'display': 'standalone',
      'orientation': 'portrait-primary',
      'theme-color': themeColor,
      // PWA specific
      'mobile-web-app-title': restaurant.name
    }
  }
}

export default async function RestaurantLayout({ children, params }: LayoutProps) {
  const resolvedParams = await params
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug: resolvedParams.slug }
  })

  if (!restaurant) {
    notFound()
  }

  const iconUrl = restaurant.avatar ? `/api/${resolvedParams.slug}/pwa-icon?size=192` : undefined

  return (
    <>
      {/* Layout content */}
      <div className="min-h-screen bg-gray-50">
        {children}
        
        {/* PWA Install Prompt */}
        <PWAWrapper
          restaurantName={restaurant.name}
          restaurantSlug={resolvedParams.slug}
          iconUrl={iconUrl}
        />
        
        {/* PWA Debug Panel (desenvolvimento) */}
        {process.env.NODE_ENV === 'development' && (
          <PWADebugPanel restaurantSlug={resolvedParams.slug} />
        )}
      </div>
    </>
  )
}