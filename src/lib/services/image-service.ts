import { supabaseAdmin } from '@/lib/supabase'
import sharp from 'sharp'
import crypto from 'crypto'
import { ImageUploadOptions, ImageRecord, ImageType, ImageMetadata } from './image-types'

// Configurações dos tipos de imagens
const IMAGE_CONFIGS = {
  [ImageType.USER_AVATAR]: {
    maxWidth: 200,
    maxHeight: 200,
    quality: 90,
    generateThumbnail: true,
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    bucket: 'user-avatars'
  },
  [ImageType.BUSINESS_LOGO]: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 95,
    generateThumbnail: true,
    allowedFormats: ['jpg', 'jpeg', 'png', 'svg', 'webp'],
    bucket: 'business-assets'
  },
  [ImageType.BUSINESS_BANNER]: {
    maxWidth: 1200,
    maxHeight: 600,
    quality: 90,
    generateThumbnail: true,
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    bucket: 'business-assets'
  },
  [ImageType.PRODUCT_IMAGE]: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 90,
    generateThumbnail: true,
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    bucket: 'product-images'
  },
  [ImageType.CATEGORY_IMAGE]: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 90,
    generateThumbnail: true,
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    bucket: 'product-images'
  },
  [ImageType.GENERAL]: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 85,
    generateThumbnail: false,
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    bucket: 'fastlivery-images'
  }
}

export class ImageService {
  private static instance: ImageService
  private supabase = supabaseAdmin

  private constructor() {
    // Usando instância centralizada do supabaseAdmin
  }

  public static getInstance(): ImageService {
    if (!ImageService.instance) {
      ImageService.instance = new ImageService()
    }
    return ImageService.instance
  }

  // Método principal para upload de imagens
  async uploadImage(file: File, options: ImageUploadOptions): Promise<ImageRecord> {
    try {
      // Validar arquivo
      await this.validateFile(file, options)

      // Processar e fazer upload da imagem
      const { processedBuffer, metadata, thumbnailBuffer } = await this.processImage(file, options)
      
      // Fazer upload para o Supabase Storage
      const { url, thumbnailUrl } = await this.uploadToStorage(
        processedBuffer, 
        thumbnailBuffer,
        file.name, 
        options
      )
      
      // Criar record para retornar
      const imageRecord: ImageRecord = {
        id: crypto.randomUUID(),
        filename: this.generateFilename(file.name),
        originalName: file.name,
        url,
        thumbnailUrl,
        size: processedBuffer.length,
        type: options.type,
        entityId: options.entityId,
        category: options.category,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      return imageRecord
    } catch (error) {
      console.error('Erro no upload da imagem:', error)
      throw error
    }
  }

  // Validar arquivo
  private async validateFile(file: File, options: ImageUploadOptions): Promise<void> {
    const config = { ...IMAGE_CONFIGS[options.type], ...options }
    
    // Verificar tamanho do arquivo (5MB padrão)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error(`Arquivo muito grande. Tamanho máximo: ${maxSize / 1024 / 1024}MB`)
    }

    // Verificar tipo do arquivo
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !config.allowedFormats.includes(extension)) {
      throw new Error(`Formato não suportado. Formatos permitidos: ${config.allowedFormats.join(', ')}`)
    }
  }

  // Processar imagem (redimensionar, otimizar)
  private async processImage(
    file: File, 
    options: ImageUploadOptions
  ): Promise<{
    processedBuffer: Buffer
    metadata: ImageMetadata
    thumbnailBuffer?: Buffer
  }> {
    const config = { ...IMAGE_CONFIGS[options.type], ...options }
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Para SVG, não processamos
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension === 'svg') {
      return {
        processedBuffer: buffer,
        metadata: {
          width: 0,
          height: 0,
          format: 'svg',
          mimeType: 'image/svg+xml',
          originalSize: buffer.length
        }
      }
    }

    // Usar Sharp para processar
    let sharpInstance = sharp(buffer)
    const imageMetadata = await sharpInstance.metadata()

    // Redimensionar se necessário
    if (config.maxWidth || config.maxHeight) {
      sharpInstance = sharpInstance.resize(config.maxWidth, config.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
    }

    // Aplicar qualidade e converter para formato otimizado
    const processedBuffer = await sharpInstance
      .jpeg({ quality: config.quality, progressive: true })
      .toBuffer()

    // Gerar thumbnail se necessário
    let thumbnailBuffer: Buffer | undefined
    if (config.generateThumbnail) {
      thumbnailBuffer = await sharp(buffer)
        .resize(150, 150, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer()
    }

    const metadata: ImageMetadata = {
      width: imageMetadata.width || 0,
      height: imageMetadata.height || 0,
      format: 'jpeg',
      mimeType: 'image/jpeg',
      originalSize: buffer.length
    }

    return { processedBuffer, metadata, thumbnailBuffer }
  }

  // Upload para Supabase Storage
  private async uploadToStorage(
    processedBuffer: Buffer,
    thumbnailBuffer: Buffer | undefined,
    originalFilename: string,
    options: ImageUploadOptions
  ): Promise<{ url: string; thumbnailUrl?: string }> {
    const config = IMAGE_CONFIGS[options.type]
    const filename = this.generateFilename(originalFilename)
    const filePath = this.generateStoragePath(options, filename)

    // Upload da imagem principal
    const { error: uploadError } = await this.supabase.storage
      .from(config.bucket)
      .upload(filePath, processedBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '31536000', // 1 ano
        upsert: false
      })

    if (uploadError) {
      console.error('Erro no upload:', uploadError)
      throw new Error(`Erro no upload: ${uploadError.message}`)
    }

    // Obter URL pública
    const { data: urlData } = this.supabase.storage
      .from(config.bucket)
      .getPublicUrl(filePath)

    let thumbnailUrl: string | undefined
    
    // Upload do thumbnail se existir
    if (thumbnailBuffer) {
      const thumbnailPath = this.generateStoragePath(options, `thumb_${filename}`)
      
      const { error: thumbError } = await this.supabase.storage
        .from(config.bucket)
        .upload(thumbnailPath, thumbnailBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '31536000'
        })

      if (!thumbError) {
        const { data: thumbUrlData } = this.supabase.storage
          .from(config.bucket)
          .getPublicUrl(thumbnailPath)
        
        thumbnailUrl = thumbUrlData.publicUrl
      }
    }

    return {
      url: urlData.publicUrl,
      thumbnailUrl
    }
  }

  // Gerar caminho no storage baseado no tipo de imagem
  private generateStoragePath(options: ImageUploadOptions, filename: string): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')

    switch (options.type) {
      case ImageType.USER_AVATAR:
        return `${options.entityId}/${filename}`
      
      case ImageType.BUSINESS_LOGO:
      case ImageType.BUSINESS_BANNER:
        return `${options.entityId}/${options.type}/${filename}`
      
      case ImageType.PRODUCT_IMAGE:
      case ImageType.CATEGORY_IMAGE:
        return `${options.entityId}/${filename}`
      
      default:
        return `${year}/${month}/${options.entityId}/${filename}`
    }
  }

  // Gerar nome único do arquivo
  private generateFilename(originalName: string): string {
    const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg'
    const hash = crypto.randomBytes(16).toString('hex')
    return `${hash}.${extension}`
  }

  // Deletar imagem
  async deleteImage(imageUrl: string, bucket?: string): Promise<void> {
    try {
      // Extrair informações da URL
      const url = new URL(imageUrl)
      const pathSegments = url.pathname.split('/')
      
      // Encontrar o bucket e o path
      let bucketName = bucket
      let filePath = ''
      
      if (!bucketName) {
        // Tentar inferir o bucket da URL
        for (const [, config] of Object.entries(IMAGE_CONFIGS)) {
          if (imageUrl.includes(config.bucket)) {
            bucketName = config.bucket
            break
          }
        }
      }

      if (!bucketName) {
        throw new Error('Não foi possível determinar o bucket')
      }

      // Extrair o path do arquivo
      const bucketIndex = pathSegments.findIndex(segment => segment === bucketName)
      if (bucketIndex !== -1) {
        filePath = pathSegments.slice(bucketIndex + 1).join('/')
      } else {
        // Fallback: usar os últimos segmentos
        filePath = pathSegments.slice(-3).join('/')
      }

      // Deletar do Supabase Storage
      const { error } = await this.supabase.storage
        .from(bucketName)
        .remove([filePath])

      if (error) {
        console.error('Erro ao deletar do storage:', error)
        throw new Error(`Erro ao deletar arquivo: ${error.message}`)
      }

    } catch (error) {
      console.error('Erro ao deletar imagem:', error)
      throw error
    }
  }

  // Obter URL assinada (para buckets privados)
  async getSignedUrl(filePath: string, bucket: string, expiresIn = 3600): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn)

      if (error) {
        throw new Error(`Erro ao gerar URL assinada: ${error.message}`)
      }

      return data.signedUrl
    } catch (error) {
      console.error('Erro ao gerar URL assinada:', error)
      throw error
    }
  }

  // Listar arquivos em um bucket
  async listFiles(bucket: string, path?: string): Promise<Array<{
    name: string
    id?: string
    updated_at?: string
    created_at?: string
    metadata?: Record<string, unknown>
  }>> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .list(path, {
          limit: 100,
          offset: 0
        })

      if (error) {
        throw new Error(`Erro ao listar arquivos: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Erro ao listar arquivos:', error)
      throw error
    }
  }
}