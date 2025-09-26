'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Trash2, Download, Eye, MoreVertical, Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { notify } from '@/lib/notifications/notify'
import { cn } from '@/lib/utils'
import { ImageType } from '@/lib/services/image-types'

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

interface ImageGalleryProps {
  entityId: string
  imageType?: ImageType
  className?: string
  onImageDeleted?: (imageId: string) => void
  onImageSelected?: (image: ImageRecord) => void
  selectable?: boolean
}

export function ImageGallery({
  entityId,
  imageType,
  className,
  onImageDeleted,
  onImageSelected,
  selectable = false
}: ImageGalleryProps) {
  const [images, setImages] = useState<ImageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<ImageRecord | null>(null)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams({ entityId })
        if (imageType) params.append('imageType', imageType)

        const response = await fetch(`/api/upload/images?${params}`)
        if (response.ok) {
          const data = await response.json()
          setImages(data)
        } else {
          console.error('Erro ao carregar imagens')
        }
      } catch (error) {
        console.error('Erro ao carregar imagens:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchImages()
  }, [entityId, imageType])

  const handleDelete = async (image: ImageRecord) => {
    try {
      const response = await fetch(`/api/upload/images?imageId=${image.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setImages(prev => prev.filter(img => img.id !== image.id))
        onImageDeleted?.(image.id)
  notify('success', 'Imagem deletada com sucesso')
      } else {
        const error = await response.json()
  notify('error', error.error || 'Erro ao deletar imagem')
      }
    } catch (error) {
      console.error('Erro ao deletar imagem:', error)
  notify('error', 'Erro ao deletar imagem')
    } finally {
      setDeleteDialogOpen(false)
      setImageToDelete(null)
    }
  }

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(`${window.location.origin}${url}`)
  notify('success', 'URL copiada para a área de transferência')
  }

  const handleDownload = (image: ImageRecord) => {
    const link = document.createElement('a')
    link.href = image.url
    link.download = image.originalName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImageSelect = (image: ImageRecord) => {
    if (selectable) {
      const newSelected = new Set(selectedImages)
      if (newSelected.has(image.id)) {
        newSelected.delete(image.id)
      } else {
        newSelected.add(image.id)
      }
      setSelectedImages(newSelected)
    }
    // Sempre chama onImageSelected, independente do modo selectable
    onImageSelected?.(image)
  }

  if (loading) {
    return (
      <div className={cn('grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3', className)}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="text-muted-foreground">
          <Eye className="w-12 h-12 mx-auto mb-4" />
          <p>Nenhuma imagem encontrada</p>
          <p className="text-sm mt-1">Faça upload de imagens para vê-las aqui</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={cn('grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3', className)}>
        {images.map((image) => (
          <div 
            key={image.id}
            className={cn(
              'relative aspect-square rounded-lg overflow-hidden transition-all hover:scale-[1.05] cursor-pointer',
              selectedImages.has(image.id) && 'ring-2 ring-primary'
            )}
            onClick={() => handleImageSelect(image)}
          >
            <Image
              src={image.thumbnailUrl || image.url}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
            />
            
            {/* Menu de ações */}
            <div className="absolute top-1 right-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="h-5 w-5 p-0 rounded-full opacity-80 hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleCopyUrl(image.url)}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar URL
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload(image)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => window.open(image.url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir em nova aba
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      setImageToDelete(image)
                      setDeleteDialogOpen(true)
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Deletar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {/* Dialog de confirmação de delete */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar a imagem &ldquo;{imageToDelete?.originalName}&rdquo;? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => imageToDelete && handleDelete(imageToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
