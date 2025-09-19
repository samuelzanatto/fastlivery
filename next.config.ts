import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  
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
              "connect-src 'self' https://api.mercadopago.com https://*.mercadopago.com https://sdk.mercadopago.com https://secure.mlstatic.com https://http2.mlstatic.com https://analytics.mercadolibre.com https://api.mercadolibre.com https://api.mercadolibre.com/tracks https://*.mercadolibre.com wss://localhost:* ws://localhost:*",
              "frame-src 'self' https://*.mercadopago.com https://secure.mlstatic.com https://http2.mlstatic.com https://*.mercadolibre.com",
              "form-action 'self' https://*.mercadopago.com https://*.mercadolibre.com",
              "object-src 'none'",
              "base-uri 'self'"
            ].join('; ')
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
