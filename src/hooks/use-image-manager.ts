'use client'

import { useState, useCallback } from 'react'
import { ImageType } from '@/lib/image-types'

interface ImageRecord {
  id: string
  filename: string
  originalName: string
  url: string
  thumbnailUrl?: string
  size: number
  type: ImageType
  entityId: string
  category?: string
  metadata: {
    width: number
    height: number
    format: string
    mimeType: string
  }
  createdAt: string
  updatedAt: string
}

interface UseImageManagerOptions {
  entityId: string
  imageType?: ImageType
  onUploadComplete?: (images: ImageRecord[]) => void
  onUploadError?: (error: string) => void
  onDeleteComplete?: (imageId: string) => void
  onDeleteError?: (error: string) => void
}

export function useImageManager({
  entityId,
  imageType,
  onUploadComplete,
  onUploadError,
  onDeleteComplete,
  onDeleteError
}: UseImageManagerOptions) {
  const [images, setImages] = useState<ImageRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Carregar imagens
  const fetchImages = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ entityId })
      if (imageType) params.append('imageType', imageType)

      const response = await fetch(`/api/upload/images?${params}`)
      if (response.ok) {
        const data = await response.json()
        setImages(data)
        return data
      } else {
        throw new Error('Erro ao carregar imagens')
      }
    } catch (error) {
      console.error('Erro ao carregar imagens:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [entityId, imageType])

  // Upload de uma imagem
  const uploadImage = useCallback(async (
    file: File, 
    options?: { 
      category?: string 
      imageType?: ImageType 
    }
  ) => {
    try {
      setUploading(true)
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('entityId', entityId)
      formData.append('imageType', options?.imageType || imageType || 'general')
      if (options?.category) formData.append('category', options.category)

      const response = await fetch('/api/upload/images', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro no upload')
      }

      const uploadedImage = await response.json()
      
      // Atualizar lista de imagens
      setImages(prev => [uploadedImage, ...prev])
      onUploadComplete?.([uploadedImage])
      
      return uploadedImage
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro no upload'
      console.error('Erro no upload:', error)
      onUploadError?.(errorMessage)
      throw error
    } finally {
      setUploading(false)
    }
  }, [entityId, imageType, onUploadComplete, onUploadError])

  // Upload de múltiplas imagens
  const uploadMultipleImages = useCallback(async (
    files: File[], 
    options?: { 
      category?: string 
      imageType?: ImageType 
    }
  ) => {
    try {
      setUploading(true)
      
      const uploadPromises = files.map(file => uploadImage(file, options))
      const results = await Promise.allSettled(uploadPromises)
      
      const successful = results
        .filter((result): result is PromiseFulfilledResult<ImageRecord> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value)

      const failed = results
        .filter((result): result is PromiseRejectedResult => 
          result.status === 'rejected'
        )

      if (failed.length > 0) {
        const errors = failed.map(f => f.reason?.message || 'Erro desconhecido').join(', ')
        onUploadError?.(`Alguns uploads falharam: ${errors}`)
      }

      if (successful.length > 0) {
        onUploadComplete?.(successful)
      }

      return { successful, failed: failed.length }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro no upload múltiplo'
      console.error('Erro no upload múltiplo:', error)
      onUploadError?.(errorMessage)
      throw error
    } finally {
      setUploading(false)
    }
  }, [uploadImage, onUploadComplete, onUploadError])

  // Deletar imagem
  const deleteImage = useCallback(async (imageId: string) => {
    try {
      const response = await fetch(`/api/upload/images?imageId=${imageId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao deletar')
      }

      // Remover da lista
      setImages(prev => prev.filter(img => img.id !== imageId))
      onDeleteComplete?.(imageId)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao deletar'
      console.error('Erro ao deletar imagem:', error)
      onDeleteError?.(errorMessage)
      throw error
    }
  }, [onDeleteComplete, onDeleteError])

  // Obter imagem por ID
  const getImageById = useCallback((imageId: string) => {
    return images.find(img => img.id === imageId)
  }, [images])

  // Obter imagens por categoria
  const getImagesByCategory = useCallback((category: string) => {
    return images.filter(img => img.category === category)
  }, [images])

  // Obter primeira imagem (útil para avatars, logos, etc.)
  const getFirstImage = useCallback(() => {
    return images[0] || null
  }, [images])

  // Obter URL da primeira imagem
  const getFirstImageUrl = useCallback(() => {
    const first = getFirstImage()
    return first ? first.url : null
  }, [getFirstImage])

  // Obter URL do thumbnail da primeira imagem
  const getFirstImageThumbnail = useCallback(() => {
    const first = getFirstImage()
    return first ? (first.thumbnailUrl || first.url) : null
  }, [getFirstImage])

  // Limpar todas as imagens do estado
  const clearImages = useCallback(() => {
    setImages([])
  }, [])

  // Refresh - buscar novamente
  const refresh = useCallback(() => {
    return fetchImages()
  }, [fetchImages])

  return {
    // Estado
    images,
    loading,
    uploading,
    
    // Ações principais
    fetchImages,
    uploadImage,
    uploadMultipleImages,
    deleteImage,
    
    // Utilitários
    getImageById,
    getImagesByCategory,
    getFirstImage,
    getFirstImageUrl,
    getFirstImageThumbnail,
    clearImages,
    refresh
  }
}
