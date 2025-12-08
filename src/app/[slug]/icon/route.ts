import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import sharp from 'sharp'

// Gera ícone PWA a partir do avatar do negócio
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const size = parseInt(searchParams.get('size') || '192')

    // Validar tamanho
    const validSizes = [32, 72, 96, 128, 144, 152, 180, 192, 384, 512]
    const finalSize = validSizes.includes(size) ? size : 192

    // Buscar dados do negócio
    const business = await prisma.business.findFirst({
      where: { slug },
      select: {
        avatar: true,
        name: true,
      }
    })

    if (!business?.avatar) {
      // Redirecionar para ícone padrão
      return NextResponse.redirect(new URL(`/icons/icon-${finalSize}x${finalSize}.png`, request.url))
    }

    // Baixar imagem do avatar
    const response = await fetch(business.avatar)
    
    if (!response.ok) {
      return NextResponse.redirect(new URL(`/icons/icon-${finalSize}x${finalSize}.png`, request.url))
    }

    const imageBuffer = await response.arrayBuffer()

    // Redimensionar com sharp
    const resizedImage = await sharp(Buffer.from(imageBuffer))
      .resize(finalSize, finalSize, {
        fit: 'cover',
        position: 'center',
      })
      .png()
      .toBuffer()

    return new NextResponse(new Uint8Array(resizedImage), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800', // Cache 1 dia client, 1 semana CDN
      }
    })
  } catch (error) {
    console.error('Erro ao gerar ícone PWA:', error)
    // Fallback para ícone padrão
    return NextResponse.redirect(new URL('/icons/icon-192x192.png', request.url))
  }
}
