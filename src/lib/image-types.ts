// Tipos compartilhados entre cliente e servidor
export interface ImageUploadOptions {
  type: ImageType
  entityId: string
  category?: string
  maxWidth?: number
  maxHeight?: number
  quality?: number
  generateThumbnail?: boolean
  allowedFormats?: string[]
}

export interface ImageRecord {
  id: string
  filename: string
  originalName: string
  url: string
  thumbnailUrl?: string
  size: number
  type: ImageType
  entityId: string
  category?: string
  metadata: ImageMetadata
  createdAt: Date
  updatedAt: Date
}

export interface ImageMetadata {
  width: number
  height: number
  format: string
  mimeType: string
  originalSize?: number
}

export enum ImageType {
  USER_AVATAR = 'user_avatar',
  RESTAURANT_LOGO = 'restaurant_logo',
  RESTAURANT_BANNER = 'restaurant_banner',
  PRODUCT_IMAGE = 'product_image',
  CATEGORY_IMAGE = 'category_image',
  GENERAL = 'general'
}
