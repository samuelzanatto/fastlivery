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
    const uploadedImage = await imageService.uploadImage(file, {
      type: imageType,
      entityId,
      category
    })

    return NextResponse.json({
      message: 'Upload realizado com sucesso',
      ...uploadedImage
    }, { status: 201 })

  } catch (error) {
    console.error('Erro no upload:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
