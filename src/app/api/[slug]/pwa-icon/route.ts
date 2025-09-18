import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join } from 'path'

// Force Node.js runtime for Sharp and file system operations
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const size = parseInt(searchParams.get('size') || '192')
    const { slug } = await params

    // Validar tamanho
    const validSizes = [72, 96, 128, 144, 152, 192, 384, 512]
    if (!validSizes.includes(size)) {
      return NextResponse.json(
        { error: 'Invalid size. Valid sizes: ' + validSizes.join(', ') },
        { status: 400 }
      )
    }

    // Buscar restaurante
    const restaurant = await prisma.restaurant.findFirst({
      where: { slug }
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    let imageBuffer: Buffer

    if (restaurant.avatar) {
      try {
        // Tentar ler logo do restaurante
        const logoPath = join(process.cwd(), 'public', restaurant.avatar)
        const logoBuffer = readFileSync(logoPath)
        
        // Processar imagem com Sharp
        imageBuffer = await sharp(logoBuffer)
          .resize(size, size, {
            fit: 'cover',
            position: 'center',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .png({
            quality: 90,
            compressionLevel: 6
          })
          .toBuffer()

      } catch (error) {
        console.error('Error processing restaurant logo:', error)
        // Fallback para ícone padrão
        imageBuffer = await generateDefaultIcon(size, restaurant.name)
      }
    } else {
      // Gerar ícone padrão com iniciais do restaurante
      imageBuffer = await generateDefaultIcon(size, restaurant.name)
    }

    // Headers para cache agressivo
    const response = new NextResponse(new Uint8Array(imageBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'ETag': `"${slug}-${size}-${restaurant.updatedAt.getTime()}"`
      }
    })

    return response

  } catch (error) {
    console.error('Error generating PWA icon:', error)
    return NextResponse.json(
      { error: 'Failed to generate icon' },
      { status: 500 }
    )
  }
}

// Gerar ícone padrão com iniciais
async function generateDefaultIcon(size: number, restaurantName: string): Promise<Buffer> {
  // Extrair iniciais (máximo 2 caracteres)
  const initials = restaurantName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2)

  // Cores baseadas no hash do nome para consistência
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', 
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
  ]
  const colorIndex = Math.abs(hashString(restaurantName)) % colors.length
  const backgroundColor = colors[colorIndex]

  // Criar SVG do ícone
  const fontSize = Math.floor(size * 0.4)
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${backgroundColor}" rx="${size * 0.2}"/>
      <text 
        x="50%" 
        y="50%" 
        dominant-baseline="middle" 
        text-anchor="middle" 
        fill="white" 
        font-family="system-ui, -apple-system, sans-serif" 
        font-weight="600" 
        font-size="${fontSize}px"
      >
        ${initials}
      </text>
    </svg>
  `

  // Converter SVG para PNG
  return await sharp(Buffer.from(svg))
    .png({
      quality: 90,
      compressionLevel: 6
    })
    .toBuffer()
}

// Hash simples para gerar cores consistentes
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash
}