import type { Metadata, Viewport } from 'next'

// Viewport padrão para todas as páginas
export const defaultViewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1f2937',
  viewportFit: 'cover',
}

// Função para gerar metadata sem themeColor
export function generatePageMetadata(
  title: string,
  description?: string,
  path?: string
): Metadata {
  const baseTitle = 'FastLivery - Sistema de Delivery Inteligente'
  const finalTitle = title === baseTitle ? title : `${title} | FastLivery`
  const finalDescription = description || 'Automatize seu delivery com IA e maximize seus resultados'

  return {
    title: finalTitle,
    description: finalDescription,
    openGraph: {
      type: 'website',
      siteName: 'FastLivery',
      title: finalTitle,
      description: finalDescription,
      ...(path && { url: path }),
    },
    twitter: {
      card: 'summary',
      title: finalTitle,
      description: finalDescription,
    },
  }
}