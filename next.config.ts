import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Desabilitar React Strict Mode temporariamente para debug de layout stability
  reactStrictMode: process.env.NODE_ENV === 'production',

  // Desabilitar source maps em produção por segurança
  productionBrowserSourceMaps: false,

  // Configuração do Turbopack para Next.js 16
  turbopack: {
    // Configurações específicas para Supabase
    resolveAlias: {
      // Mapear módulos que não funcionam bem com Turbopack
    }
  },

  // Configuração experimental para melhorar cache do router
  experimental: {
    // Configurar client-side router cache stale times
    staleTimes: {
      dynamic: 30, // 30 segundos para rotas dinâmicas
      static: 300, // 5 minutos para rotas estáticas  
    }
  },

  // Configuração para permitir recursos do Mercado Pago
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://secure.mlstatic.com https://http2.mlstatic.com https://*.mercadopago.com https://*.mercadolivre.com https://analytics.mercadolibre.com https://fonts.googleapis.com https://*.mercadolibre.com",
              "style-src 'self' 'unsafe-inline' https://sdk.mercadopago.com https://secure.mlstatic.com https://http2.mlstatic.com https://*.mercadopago.com https://fonts.googleapis.com https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: https://secure.mlstatic.com https://http2.mlstatic.com https://*.mercadopago.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://images.unsplash.com https://*.mercadolibre.com",
              "font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com https://secure.mlstatic.com https://http2.mlstatic.com https://*.mercadopago.com",
              "connect-src 'self' https://api.mercadopago.com https://*.mercadopago.com https://sdk.mercadopago.com https://secure.mlstatic.com https://http2.mlstatic.com https://analytics.mercadolibre.com https://api.mercadolibre.com https://api.mercadolibre.com/tracks https://*.mercadolibre.com https://*.supabase.co wss://*.supabase.co https://viacep.com.br",
              "frame-src 'self' https://*.mercadopago.com https://secure.mlstatic.com https://http2.mlstatic.com https://*.mercadolibre.com",
              "form-action 'self' https://*.mercadopago.com https://*.mercadolibre.com",
              "object-src 'none'",
              "base-uri 'self'"
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      },
      // Headers específicos para o Service Worker (PWA)
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          }
        ]
      },
      // Headers para manifest dinâmico
      {
        source: '/:slug/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          }
        ]
      }
    ]
  },

  // Otimizar carregamento de assets
  poweredByHeader: false,
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https', 
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'http2.mlstatic.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'secure.mlstatic.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.mercadopago.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '*',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.1.106',
        port: '*',
        pathname: '/**',
      }
    ]
  }
}

export default nextConfig
