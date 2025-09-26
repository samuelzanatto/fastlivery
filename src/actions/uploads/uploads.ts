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

export interface UploadedImage {
  id: string
  url: string
  filename: string
  size: number
  type: ImageType
  entityId: string
  category?: string
  metadata: {
    width: number
    height: number
    format: string
    mimeType: string
    originalSize?: number
  }
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
      const existingImages = await imageService.getImagesByEntity(entityId, ImageType.USER_AVATAR)
      for (const existingImage of existingImages) {
        await imageService.deleteImage(existingImage.id)
      }
    } catch (error) {
      console.error('Erro ao deletar avatares antigos:', error)
      // Não bloquear o upload se der erro ao deletar imagens antigas
    }
    
    const uploadedImage = await imageService.uploadImage(file, {
      type: ImageType.USER_AVATAR,
      entityId
    })

    revalidatePath('/dashboard/settings')

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

    const imageService = ImageService.getInstance()
    const images = await imageService.getImagesByEntity(entityId, imageType)

    return createSuccessResult(images)
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

    const imageService = ImageService.getInstance()
    await imageService.deleteImage(imageId)

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/settings')

    return createSuccessResult({ success: true })
  } catch (error) {
    return handleActionError(error)
  }
}

export const deleteImage = withAuth(_deleteImage)