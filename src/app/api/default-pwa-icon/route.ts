import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

// Force Node.js runtime for Sharp operations
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const size = parseInt(searchParams.get('size') || '192')

  // Validar tamanho
  const validSizes = [72, 96, 128, 144, 152, 192, 384, 512]
  if (!validSizes.includes(size)) {
    return NextResponse.json(
      { error: 'Invalid size. Valid sizes: ' + validSizes.join(', ') },
      { status: 400 }
    )
  }

  try {
    // Gerar ícone padrão ZapLivery
    const backgroundColor = '#1f2937' // gray-800
    const accentColor = '#3b82f6'     // blue-500

    // Criar SVG do ícone padrão
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${backgroundColor};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${accentColor};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${size}" height="${size}" fill="url(#grad1)" rx="${size * 0.2}"/>
        
        <!-- Ícone de delivery/comida -->
        <g transform="translate(${size * 0.25}, ${size * 0.25})">
          <!-- Prato -->
          <circle cx="${size * 0.25}" cy="${size * 0.3}" r="${size * 0.15}" fill="none" stroke="white" stroke-width="${size * 0.02}"/>
          
          <!-- Garfo e faca -->
          <line x1="${size * 0.1}" y1="${size * 0.15}" x2="${size * 0.1}" y2="${size * 0.45}" stroke="white" stroke-width="${size * 0.02}"/>
          <line x1="${size * 0.08}" y1="${size * 0.18}" x2="${size * 0.12}" y2="${size * 0.18}" stroke="white" stroke-width="${size * 0.015}"/>
          <line x1="${size * 0.08}" y1="${size * 0.22}" x2="${size * 0.12}" y2="${size * 0.22}" stroke="white" stroke-width="${size * 0.015}"/>
          
          <line x1="${size * 0.4}" y1="${size * 0.15}" x2="${size * 0.4}" y2="${size * 0.45}" stroke="white" stroke-width="${size * 0.02}"/>
          <path d="M ${size * 0.38} ${size * 0.15} Q ${size * 0.4} ${size * 0.12} ${size * 0.42} ${size * 0.15}" stroke="white" stroke-width="${size * 0.015}" fill="none"/>
        </g>
      </svg>
    `

    // Converter SVG para PNG
    const imageBuffer = await sharp(Buffer.from(svg))
      .png({
        quality: 90,
        compressionLevel: 6
      })
      .toBuffer()

    return new Response(new Uint8Array(imageBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'ETag': `"default-icon-${size}"`
      }
    })

  } catch (error) {
    console.error('Error generating default icon:', error)
    return NextResponse.json(
      { error: 'Failed to generate icon' },
      { status: 500 }
    )
  }
}