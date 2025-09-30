'use server'

import { revalidatePath } from 'next/cache'
import {
  ActionResult,
  createSuccessResult,
  handleActionError,
  withAuth,
  getAuthenticatedUser
} from '@/lib/actions/auth-helpers'
import { ImageService } from '@/lib/services/image-service'
import { ImageType } from '@/lib/services/image-types'
import { prisma } from '@/lib/database/prisma'

export interface UploadedImage {
  id: string
  url: string
  filename: string
  originalName: string
  size: number
  thumbnailUrl?: string
}

export interface UploadImageInput {
  file: File
  entityId: string
  imageType: ImageType
  category?: string
}

/**
 * Upload de imagem com validação de autenticação
 */
async function _uploadImage(input: UploadImageInput): Promise<ActionResult<UploadedImage>> {
  try {
    await getAuthenticatedUser()

    const { file, entityId, imageType, category } = input

    if (!file) {
      return {
        success: false,
        error: 'Nenhum arquivo enviado',
        code: 'FILE_REQUIRED'
      }
    }

    if (!entityId) {
      return {
        success: false,
        error: 'ID da entidade é obrigatório',
        code: 'ENTITY_ID_REQUIRED'
      }
    }

    if (!imageType || !Object.values(ImageType).includes(imageType)) {
      return {
        success: false,
        error: 'Tipo de imagem inválido',
        code: 'INVALID_IMAGE_TYPE'
      }
    }

    // Upload usando o serviço de imagens
    const imageService = ImageService.getInstance()
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

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/settings')

    return createSuccessResult(uploadedImage)
  } catch (error) {
    return handleActionError(error)
  }
}

export const uploadImage = withAuth(_uploadImage)

/**
 * Upload de avatar com remoção automática de avatares anteriores
 */
async function _uploadUserAvatar(input: {
  file: File
  entityId: string
}): Promise<ActionResult<UploadedImage>> {
  try {
    await getAuthenticatedUser()

    const { file, entityId } = input

    if (!file) {
      return {
        success: false,
        error: 'Nenhum arquivo enviado',
        code: 'FILE_REQUIRED'
      }
    }

    const imageService = ImageService.getInstance()
    
    // Para avatares de usuário, deletar imagens antigas automaticamente
    try {
      const existingImages = await prisma.image.findMany({
        where: { entityId, type: ImageType.USER_AVATAR }
      })
      
      // Não limpar o user.image antes do upload para evitar estado inconsistente
      
      for (const existingImage of existingImages) {
        try {
          await imageService.deleteImage(existingImage.url)
          await prisma.image.delete({ where: { id: existingImage.id } })
        } catch (error) {
          console.error('Erro ao deletar avatar antigo:', error)
        }
      }
    } catch (error) {
      console.error('Erro ao deletar avatares antigos:', error)
      // Não bloquear o upload se der erro ao deletar imagens antigas
    }
    
    const uploadedImage = await imageService.uploadImage(file, {
      type: ImageType.USER_AVATAR,
      entityId
    })

    // Salvar novo avatar
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

    // Para avatares de usuário, atualizar também o campo image do usuário
    if (uploadedImage.type === ImageType.USER_AVATAR) {
      console.log('[uploadImage] Atualizando user.image para usuário:', entityId, 'com URL:', uploadedImage.url)
      await prisma.user.update({
        where: { id: entityId },
        data: { image: uploadedImage.url }
      })
      console.log('[uploadImage] user.image atualizado com sucesso')
    }

    revalidatePath('/dashboard/settings')
    revalidatePath('/conta')
    revalidatePath('/settings')
    revalidatePath('/', 'layout')

    return createSuccessResult(uploadedImage)
  } catch (error) {
    return handleActionError(error)
  }
}

export const uploadUserAvatar = withAuth(_uploadUserAvatar)

/**
 * Listar imagens por entidade
 */
async function _getImagesByEntity(
  entityId: string,
  imageType?: ImageType
): Promise<ActionResult<UploadedImage[]>> {
  try {
    await getAuthenticatedUser()

    if (!entityId) {
      return {
        success: false,
        error: 'ID da entidade é obrigatório',
        code: 'ENTITY_ID_REQUIRED'
      }
    }

    const images = await prisma.image.findMany({
      where: {
        entityId,
        ...(imageType && { type: imageType })
      },
      orderBy: { createdAt: 'desc' }
    })

    const mappedImages: UploadedImage[] = images.map(image => ({
      id: image.id,
      url: image.url,
      thumbnailUrl: image.thumbnailUrl || undefined,
      filename: image.filename,
      originalName: image.originalName,
      size: image.size
    }))

    return createSuccessResult(mappedImages)
  } catch (error) {
    return handleActionError(error)
  }
}

export const getImagesByEntity = withAuth(_getImagesByEntity)

/**
 * Deletar imagem
 */
async function _deleteImage(imageId: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    await getAuthenticatedUser()

    if (!imageId) {
      return {
        success: false,
        error: 'ID da imagem é obrigatório',
        code: 'IMAGE_ID_REQUIRED'
      }
    }

    const image = await prisma.image.findUnique({
      where: { id: imageId }
    })

    if (!image) {
      return {
        success: false,
        error: 'Imagem não encontrada',
        code: 'IMAGE_NOT_FOUND'
      }
    }

    // Deletar do Supabase Storage
    const imageService = ImageService.getInstance()
    await imageService.deleteImage(image.url)

    // Para avatares de usuário, limpar também o campo image do usuário
    if (image.type === ImageType.USER_AVATAR) {
      await prisma.user.update({
        where: { id: image.entityId },
        data: { image: null }
      })
    }

    // Deletar do banco
    await prisma.image.delete({
      where: { id: imageId }
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/settings')

    return createSuccessResult({ success: true })
  } catch (error) {
    return handleActionError(error)
  }
}

export const deleteImage = withAuth(_deleteImage)