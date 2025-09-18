import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ImageService, ImageType } from '@/lib/image-service'

// Force Node.js runtime for file system operations
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const sessionResponse = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!sessionResponse?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const entityId = formData.get('entityId') as string
    const imageType = formData.get('imageType') as ImageType
    const category = formData.get('category') as string | undefined

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    if (!entityId) {
      return NextResponse.json(
        { error: 'ID da entidade é obrigatório' },
        { status: 400 }
      )
    }

    if (!imageType || !Object.values(ImageType).includes(imageType)) {
      return NextResponse.json(
        { error: 'Tipo de imagem inválido' },
        { status: 400 }
      )
    }

    // Upload usando o serviço de imagens
    const imageService = ImageService.getInstance()
    
    // Para avatares de usuário, deletar imagens antigas automaticamente
    if (imageType === 'user_avatar') {
      try {
        const existingImages = await imageService.getImagesByEntity(entityId, imageType)
        for (const existingImage of existingImages) {
          await imageService.deleteImage(existingImage.id)
        }
      } catch (error) {
        console.error('Erro ao deletar avatares antigos:', error)
        // Não bloquear o upload se der erro ao deletar imagens antigas
      }
    }
    
    const uploadedImage = await imageService.uploadImage(file, {
      type: imageType,
      entityId,
      category
    })

    return NextResponse.json(uploadedImage, { status: 201 })

  } catch (error) {
    console.error('Erro no upload:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const sessionResponse = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!sessionResponse?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const entityId = searchParams.get('entityId')
    const imageType = searchParams.get('imageType') as ImageType | null

    if (!entityId) {
      return NextResponse.json(
        { error: 'ID da entidade é obrigatório' },
        { status: 400 }
      )
    }

    // Listar imagens
    const imageService = ImageService.getInstance()
    const images = await imageService.getImagesByEntity(
      entityId, 
      imageType || undefined
    )

    return NextResponse.json(images)

  } catch (error) {
    console.error('Erro ao buscar imagens:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticação
    const sessionResponse = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!sessionResponse?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')

    if (!imageId) {
      return NextResponse.json(
        { error: 'ID da imagem é obrigatório' },
        { status: 400 }
      )
    }

    // Deletar imagem
    const imageService = ImageService.getInstance()
    await imageService.deleteImage(imageId)

    return NextResponse.json({ 
      message: 'Imagem deletada com sucesso' 
    })

  } catch (error) {
    console.error('Erro ao deletar imagem:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
