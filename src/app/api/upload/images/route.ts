import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { ImageService } from '@/lib/services/image-service'
import { ImageType } from '@/lib/services/image-types'
import { prisma } from '@/lib/database/prisma'

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
  if (imageType === ImageType.USER_AVATAR) {
      try {
        const existingImages = await prisma.image.findMany({
          where: { entityId, type: imageType }
        })
        
        for (const existingImage of existingImages) {
          await imageService.deleteImage(existingImage.url)
          await prisma.image.delete({ where: { id: existingImage.id } })
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

    // Salvar no banco de dados
    const crypto = await import('crypto')
    await prisma.image.create({
      data: {
        id: crypto.randomUUID(),
        filename: uploadedImage.filename,
        originalName: uploadedImage.originalName,
        url: uploadedImage.url,
        thumbnailUrl: uploadedImage.thumbnailUrl,
        size: uploadedImage.size,
        type: uploadedImage.type,
        entityId: uploadedImage.entityId,
        category: uploadedImage.category,
        hash: crypto.randomBytes(16).toString('hex'),
        metadata: uploadedImage.metadata as object,
        updatedAt: new Date()
      }
    })

    // Se for avatar de usuário, atualizar campo image do usuário
    if (imageType === ImageType.USER_AVATAR) {
      try {
        await prisma.user.update({
          where: { id: entityId },
          data: { image: uploadedImage.url }
        })
      } catch (error) {
        console.error('Erro ao atualizar campo image do usuário:', error)
      }
    }

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
    const images = await prisma.image.findMany({
      where: {
        entityId,
        ...(imageType && { type: imageType })
      },
      orderBy: { createdAt: 'desc' }
    })

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
    const image = await prisma.image.findUnique({
      where: { id: imageId }
    })

    if (!image) {
      return NextResponse.json(
        { error: 'Imagem não encontrada' },
        { status: 404 }
      )
    }

    // Deletar do Supabase Storage
    const imageService = ImageService.getInstance()
    await imageService.deleteImage(image.url)

    // Deletar do banco
    await prisma.image.delete({
      where: { id: imageId }
    })

    // Se era um avatar de usuário, limpar o campo image do usuário
    if (image.type === ImageType.USER_AVATAR) {
      try {
        await prisma.user.update({
          where: { id: image.entityId },
          data: { image: null }
        })
      } catch (error) {
        console.error('Erro ao limpar campo image do usuário:', error)
      }
    }

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
