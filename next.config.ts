import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Desabilitar React Strict Mode temporariamente para debug de layout stability
  reactStrictMode: process.env.NODE_ENV === 'production',

  // Desabilitar source maps em produção por segurança
  productionBrowserSourceMaps: false,

  // Configuração experimental para melhorar cache do router
  experimental: {
    // Configurar client-side router cache stale times
    staleTimes: {
      dynamic: 30, // 30 segundos para rotas dinâmicas
      static: 300, // 5 minutos para rotas estáticas  
    }
  },

  // Configurações para reduzir Fast Refresh excessivo em desenvolvimento
  ...(process.env.NODE_ENV === 'development' && {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webpack: (config: Record<string, any>, { dev }: { dev: boolean }) => {
      if (dev) {
        // Reduzir sensibilidade do Fast Refresh
        config.watchOptions = {
          poll: 1000, // Poll a cada 1 segundo ao invés de filesystem events
          aggregateTimeout: 300, // Aguardar 300ms antes de rebuild
          ignored: /node_modules/
        }
      }
      return config
    }
  }),

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
      }
    ]
  },

  // Otimizar carregamento de assets
  poweredByHeader: false,
  
  images: {
    domains: ['localhost', '192.168.1.106', 'your-domain.com', 'secure.mlstatic.com', 'http2.mlstatic.com'],
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
      }
    ]
  }
}

export default nextConfig
