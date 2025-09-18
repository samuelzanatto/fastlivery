'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ImageUpload } from '@/components/ui/image-upload'
import { ImageGallery } from '@/components/ui/image-gallery'
import { useImageManager } from '@/hooks/use-image-manager'
import { ImageType } from '@/lib/image-types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, ImageIcon, Loader2 } from 'lucide-react'

// Definir interface local para imagem compatível com ambos os componentes
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

interface ImageUploadDialogProps {
  entityId: string
  imageType: ImageType
  category?: string
  maxFiles?: number
  onImageSelect?: (image: ImageRecord) => void
  onImagesSelect?: (images: ImageRecord[]) => void
  children?: React.ReactNode
  title?: string
  description?: string
  multiSelect?: boolean
  showGallery?: boolean
}

export function ImageUploadDialog({
  entityId,
  imageType,
  category,
  maxFiles = 5,
  onImageSelect,
  onImagesSelect,
  children,
  title = 'Gerenciar Imagens',
  description = 'Faça upload ou selecione imagens existentes',
  multiSelect = false,
  showGallery = true
}: ImageUploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedImages, setSelectedImages] = useState<ImageRecord[]>([])
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery'>('upload')

  const {
    images,
    deleteImage,
    fetchImages,
    loading
  } = useImageManager({
    entityId,
    imageType,
    onUploadComplete: (_uploadedImages) => {
      // Atualizar a galeria após upload
      fetchImages()
      if (showGallery) {
        setActiveTab('gallery')
      }
    }
  })

  const handleImageSelect = useCallback((image: ImageRecord) => {
    if (multiSelect) {
      setSelectedImages(prev => {
        const isSelected = prev.find(img => img.id === image.id)
        if (isSelected) {
          return prev.filter(img => img.id !== image.id)
        } else {
          return [...prev, image]
        }
      })
    } else {
      onImageSelect?.(image)
      setOpen(false)
    }
  }, [multiSelect, onImageSelect])

  const handleConfirmSelection = useCallback(() => {
    if (multiSelect && selectedImages.length > 0) {
      onImagesSelect?.(selectedImages)
      setOpen(false)
      setSelectedImages([])
    }
  }, [multiSelect, selectedImages, onImagesSelect])

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSelectedImages([])
    }
    if (newOpen) {
      fetchImages()
    }
  }, [fetchImages])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <ImageIcon className="h-4 w-4 mr-2" />
            Selecionar Imagem
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab as 'upload' | 'gallery')} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
              {showGallery && (
                <TabsTrigger value="gallery" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Galeria ({images.length})
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="upload" className="flex-1 overflow-auto">
              <div className="py-4">
                <ImageUpload
                  entityId={entityId}
                  imageType={imageType}
                  category={category}
                  maxFiles={maxFiles}
                  className="h-64"
                  onUploadComplete={(uploadedImages) => {
                    // Atualizar a galeria após upload
                    fetchImages()
                    if (showGallery && uploadedImages.length > 0) {
                      setActiveTab('gallery')
                    }
                  }}
                />
              </div>
            </TabsContent>
            
            {showGallery && (
              <TabsContent value="gallery" className="flex-1 overflow-auto">
                <div className="py-4">
                  {loading ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Carregando imagens...</span>
                    </div>
                  ) : images.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <ImageIcon className="h-12 w-12 mb-2" />
                      <p>Nenhuma imagem encontrada</p>
                      <p className="text-sm">Faça upload de algumas imagens primeiro</p>
                    </div>
                  ) : (
                    <ImageGallery
                      entityId={entityId}
                      imageType={imageType}
                      onImageDeleted={deleteImage}
                      onImageSelected={handleImageSelect}
                      selectable={multiSelect}
                    />
                  )}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {multiSelect && selectedImages.length > 0 && (
          <div className="border-t pt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedImages.length} imagem{selectedImages.length !== 1 ? 'ns' : ''} selecionada{selectedImages.length !== 1 ? 's' : ''}
            </span>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setSelectedImages([])}
              >
                Limpar Seleção
              </Button>
              <Button onClick={handleConfirmSelection}>
                Confirmar Seleção
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
