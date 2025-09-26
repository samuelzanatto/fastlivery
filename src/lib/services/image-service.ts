// Este arquivo deve ser usado apenas no servidor (API Routes)
import { prisma } from '@/lib/database/prisma'
import { writeFile, mkdir, unlink, access } from 'fs/promises'
import { join, extname } from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import { ImageType } from './image-types'
import type { ImageUploadOptions, ImageRecord, ImageMetadata } from './image-types'

// Configurações padrão por tipo de imagem
const IMAGE_CONFIGS = {
  [ImageType.USER_AVATAR]: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 85,
    generateThumbnail: true,
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp']
  },
  [ImageType.BUSINESS_LOGO]: {
    maxWidth: 300,
    maxHeight: 300,
    quality: 90,
    generateThumbnail: true,
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'svg']
  },
  [ImageType.BUSINESS_BANNER]: {
    maxWidth: 1200,
    maxHeight: 400,
    quality: 80,
    generateThumbnail: true,
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp']
  },
  [ImageType.PRODUCT_IMAGE]: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 85,
    generateThumbnail: true,
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp']
  },
  [ImageType.CATEGORY_IMAGE]: {
    maxWidth: 600,
    maxHeight: 400,
    quality: 80,
    generateThumbnail: true,
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp']
  },
  [ImageType.GENERAL]: {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 80,
    generateThumbnail: false,
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp']
  }
}

export class ImageService {
  private static instance: ImageService
  private uploadPath: string

  private constructor() {
    this.uploadPath = join(process.cwd(), 'public', 'uploads')
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

      // Verificar se já existe uma imagem igual (evitar duplicatas)
      const existingImage = await this.checkForDuplicate(file, options)
      if (existingImage) {
        return existingImage
      }

      // Gerar estrutura de diretórios
      const uploadStructure = this.generateUploadPath(options)
      
      // Processar e salvar imagem
      const processedFile = await this.processImage(file, options, uploadStructure)
      
      // Salvar no banco de dados
      const imageRecord = await this.saveToDatabase(processedFile, options)

      return imageRecord
    } catch (error) {
      console.error('Erro no upload da imagem:', error)
      throw error
    }
  }

  // Validar arquivo
  private async validateFile(file: File, options: ImageUploadOptions): Promise<void> {
    const config = { ...IMAGE_CONFIGS[options.type], ...options }

    // Validar tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Arquivo muito grande. Máximo de 10MB permitido.')
    }

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      throw new Error('Apenas arquivos de imagem são permitidos.')
    }

    // Validar formato específico
    const extension = extname(file.name).toLowerCase().replace('.', '')
    if (!config.allowedFormats.includes(extension)) {
      throw new Error(`Formato não permitido. Permitidos: ${config.allowedFormats.join(', ')}`)
    }
  }

  // Verificar duplicatas baseadas no hash do arquivo
  private async checkForDuplicate(file: File, options: ImageUploadOptions): Promise<ImageRecord | null> {
    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      const crypto = await import('crypto')
      const hash = crypto.createHash('md5').update(buffer).digest('hex')

      // Procurar por imagem com mesmo hash e tipo
      const existing = await prisma.image.findFirst({
        where: {
          hash,
          type: options.type,
          entityId: options.entityId
        }
      })

      if (existing) {
        return {
          id: existing.id,
          filename: existing.filename,
          originalName: existing.originalName,
          url: existing.url,
          thumbnailUrl: existing.thumbnailUrl || undefined,
          size: existing.size,
          type: existing.type as ImageType,
          entityId: existing.entityId,
          category: existing.category || undefined,
          metadata: existing.metadata as unknown as ImageMetadata,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt
        }
      }

      return null
    } catch (error) {
      // Se der erro no check de duplicata, continua com upload
      console.warn('Erro ao verificar duplicata:', error)
      return null
    }
  }

  // Gerar estrutura de diretórios organizada
  private generateUploadPath(options: ImageUploadOptions): { 
    directory: string, 
    relativePath: string 
  } {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    
    const relativePath = join(
      options.type,
      year.toString(),
      month,
      options.entityId
    )

    const directory = join(this.uploadPath, relativePath)
    
    return { directory, relativePath }
  }

  // Processar imagem (redimensionar, otimizar)
  private async processImage(
    file: File, 
    options: ImageUploadOptions, 
    uploadStructure: { directory: string, relativePath: string }
  ) {
    const config = { ...IMAGE_CONFIGS[options.type], ...options }
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Criar diretório se não existir
    await mkdir(uploadStructure.directory, { recursive: true })

    // Gerar nome único
    const extension = extname(file.name).toLowerCase()
    const filename = `${uuidv4()}${extension}`
    const filepath = join(uploadStructure.directory, filename)
    
    let processedBuffer = buffer
    let metadata: ImageMetadata

    // Processar com Sharp se não for SVG
    if (extension !== '.svg') {
      const sharpInstance = sharp(buffer)
      await sharpInstance.metadata()

      // Redimensionar se necessário
      if (config.maxWidth || config.maxHeight) {
        sharpInstance.resize(config.maxWidth, config.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
      }

      // Otimizar qualidade
      if (extension === '.jpg' || extension === '.jpeg') {
        sharpInstance.jpeg({ quality: config.quality })
      } else if (extension === '.png') {
        sharpInstance.png({ quality: config.quality })
      } else if (extension === '.webp') {
        sharpInstance.webp({ quality: config.quality })
      }

      processedBuffer = Buffer.from(await sharpInstance.toBuffer())
      const processedInfo = await sharp(processedBuffer).metadata()

      metadata = {
        width: processedInfo.width || 0,
        height: processedInfo.height || 0,
        format: processedInfo.format || 'unknown',
        mimeType: file.type,
        originalSize: buffer.length
      }
    } else {
      // Para SVGs, apenas salvar sem processar
      metadata = {
        width: 0,
        height: 0,
        format: 'svg',
        mimeType: file.type,
        originalSize: buffer.length
      }
    }

    // Salvar arquivo principal
    await writeFile(filepath, processedBuffer)

    let thumbnailPath: string | undefined
    
    // Gerar thumbnail se necessário
    if (config.generateThumbnail && extension !== '.svg') {
      const thumbnailFilename = `${uuidv4()}_thumb${extension}`
      thumbnailPath = join(uploadStructure.directory, thumbnailFilename)
      
      await sharp(processedBuffer)
        .resize(150, 150, { fit: 'cover' })
        .toFile(thumbnailPath)
    }

    const url = `/uploads/${uploadStructure.relativePath}/${filename}`.replace(/\\/g, '/')
    const thumbnailUrl = thumbnailPath 
      ? `/uploads/${uploadStructure.relativePath}/${thumbnailPath.split(/[/\\]/).pop()}`.replace(/\\/g, '/')
      : undefined

    return {
      filename,
      originalName: file.name,
      url,
      thumbnailUrl,
      size: processedBuffer.length,
      metadata,
      filepath
    }
  }

  // Salvar no banco de dados
  private async saveToDatabase(
    processedFile: {
      filename: string
      originalName: string
      url: string
      thumbnailUrl?: string
      size: number
      metadata: ImageMetadata
      filepath: string
    }, 
    options: ImageUploadOptions
  ): Promise<ImageRecord> {
    const crypto = await import('crypto')
    const buffer = await import('fs').then(fs => fs.readFileSync(processedFile.filepath))
    const hash = crypto.createHash('md5').update(buffer).digest('hex')

    const imageRecord = await prisma.image.create({
      data: {
        id: crypto.createHash('sha256').update(`${Date.now()}-${Math.random()}`).digest('hex').substring(0, 25),
        filename: processedFile.filename,
        originalName: processedFile.originalName,
        url: processedFile.url,
        thumbnailUrl: processedFile.thumbnailUrl,
        size: processedFile.size,
        type: options.type,
        entityId: options.entityId,
        category: options.category,
        metadata: processedFile.metadata as unknown as object,
        hash,
        updatedAt: new Date()
      }
    })

    return {
      id: imageRecord.id,
      filename: imageRecord.filename,
      originalName: imageRecord.originalName,
      url: imageRecord.url,
      thumbnailUrl: imageRecord.thumbnailUrl || undefined,
      size: imageRecord.size,
      type: imageRecord.type as ImageType,
      entityId: imageRecord.entityId,
      category: imageRecord.category || undefined,
      metadata: imageRecord.metadata as unknown as ImageMetadata,
      createdAt: imageRecord.createdAt,
      updatedAt: imageRecord.updatedAt
    }
  }

  // Deletar imagem
  async deleteImage(imageId: string): Promise<void> {
    try {
      const image = await prisma.image.findUnique({
        where: { id: imageId }
      })

      if (!image) {
        throw new Error('Imagem não encontrada')
      }

      // Deletar arquivos do sistema
      const fullPath = join(process.cwd(), 'public', image.url)
      try {
        await access(fullPath)
        await unlink(fullPath)
      } catch {
        console.warn(`Arquivo não encontrado: ${fullPath}`)
      }

      // Deletar thumbnail se existir
      if (image.thumbnailUrl) {
        const thumbnailPath = join(process.cwd(), 'public', image.thumbnailUrl)
        try {
          await access(thumbnailPath)
          await unlink(thumbnailPath)
        } catch {
          console.warn(`Thumbnail não encontrado: ${thumbnailPath}`)
        }
      }

      // Deletar do banco
      await prisma.image.delete({
        where: { id: imageId }
      })

    } catch (error) {
      console.error('Erro ao deletar imagem:', error)
      throw error
    }
  }

  // Listar imagens por entidade
  async getImagesByEntity(entityId: string, type?: ImageType): Promise<ImageRecord[]> {
    const whereClause: { entityId: string; type?: ImageType } = { entityId }
    if (type) whereClause.type = type

    const images = await prisma.image.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    })

    return images.map((image) => ({
      id: image.id,
      filename: image.filename,
      originalName: image.originalName,
      url: image.url,
      thumbnailUrl: image.thumbnailUrl || undefined,
      size: image.size,
      type: image.type as ImageType,
      entityId: image.entityId,
      category: image.category || undefined,
      metadata: image.metadata as unknown as ImageMetadata,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt
    }))
  }

  // Limpar imagens órfãs (sem referência na entidade)
  async cleanupOrphanedImages(): Promise<void> {
    // Esta função pode ser executada como job cron
    console.log('Limpeza de imagens órfãs iniciada...')
    // Implementar lógica de limpeza baseada nas entidades do sistema
  }

  // Obter estatísticas de uso
  async getStorageStats(): Promise<{
    totalImages: number,
    totalSize: number,
    sizeByType: Record<string, number>
  }> {
    const stats = await prisma.image.groupBy({
      by: ['type'],
      _sum: { size: true },
      _count: true
    })

    const totalImages = stats.reduce((acc: number, stat) => acc + stat._count, 0)
    const totalSize = stats.reduce((acc: number, stat) => acc + (stat._sum.size || 0), 0)
    const sizeByType: Record<string, number> = {}

    stats.forEach((stat) => {
      sizeByType[stat.type] = stat._sum.size || 0
    })

    return { totalImages, totalSize, sizeByType }
  }
}
