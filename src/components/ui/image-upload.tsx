'use client'

import React, { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Upload, X, FileImage, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ImageType } from '@/lib/image-types'

interface ImageUploadProps {
  entityId: string
  imageType: ImageType
  category?: string
  maxFiles?: number
  onUploadComplete?: (images: UploadedImage[]) => void
  onUploadError?: (error: string) => void
  accept?: string
  className?: string
  disabled?: boolean
  showPreview?: boolean
}

interface UploadedImage {
  id: string
  url: string
  thumbnailUrl?: string
  filename: string
  originalName: string
  size: number
}

interface UploadProgress {
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
  uploadedImage?: UploadedImage
}

export function ImageUpload({
  entityId,
  imageType,
  category,
  maxFiles = 5,
  onUploadComplete,
  onUploadError,
  accept = 'image/*',
  className,
  disabled = false,
  showPreview = true
}: ImageUploadProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('entityId', entityId)
    formData.append('imageType', imageType)
    if (category) formData.append('category', category)

    try {
      const response = await fetch('/api/upload/images', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro no upload')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Erro no upload:', error)
      throw error
    }
  }, [entityId, imageType, category])

  const handleFiles = useCallback(async (files: FileList) => {
    if (disabled) return

    const fileArray = Array.from(files).slice(0, maxFiles)
    
    // Inicializar progress para todos os arquivos
    const newUploads: UploadProgress[] = fileArray.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const
    }))

    setUploads(prev => [...prev, ...newUploads])

    // Upload de cada arquivo
    const uploadPromises = fileArray.map(async (file) => {
      try {
        // Simular progresso (já que fetch não suporta progress nativo)
        const progressInterval = setInterval(() => {
          setUploads(prev => prev.map((upload) => 
            upload.file === file ? { ...upload, progress: Math.min(upload.progress + 10, 90) } : upload
          ))
        }, 100)

        const result = await uploadFile(file)
        clearInterval(progressInterval)

        // Atualizar com sucesso
        setUploads(prev => prev.map(upload => 
          upload.file === file 
            ? { 
                ...upload, 
                progress: 100, 
                status: 'success' as const, 
                uploadedImage: result 
              }
            : upload
        ))

        return result
      } catch (error) {
        // Atualizar com erro
        setUploads(prev => prev.map(upload => 
          upload.file === file 
            ? { 
                ...upload, 
                status: 'error' as const, 
                error: error instanceof Error ? error.message : 'Erro desconhecido' 
              }
            : upload
        ))

        onUploadError?.(error instanceof Error ? error.message : 'Erro no upload')
        throw error
      }
    })

    try {
      const results = await Promise.allSettled(uploadPromises)
      const successfulUploads = results
        .filter((result): result is PromiseFulfilledResult<UploadedImage> => result.status === 'fulfilled')
        .map(result => result.value)

      if (successfulUploads.length > 0) {
        onUploadComplete?.(successfulUploads)
      }
    } catch (error) {
      console.error('Erro geral no upload:', error)
    }
  }, [disabled, maxFiles, uploadFile, onUploadComplete, onUploadError])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (disabled || !e.dataTransfer.files.length) return
    handleFiles(e.dataTransfer.files)
  }, [disabled, handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragOver(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleClick = useCallback(() => {
    if (!disabled) fileInputRef.current?.click()
  }, [disabled])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  const removeUpload = useCallback((file: File) => {
    setUploads(prev => prev.filter(upload => upload.file !== file))
  }, [])

  const clearAll = useCallback(() => {
    setUploads([])
  }, [])

  return (
    <div className={cn('w-full', className)}>
      {/* Drop Zone */}
      <Card
        className={cn(
          'border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors cursor-pointer',
          isDragOver && 'border-primary bg-primary/5',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-muted">
            <Upload className="w-6 h-6 text-muted-foreground" />
          </div>
          
          <h3 className="mb-2 text-sm font-medium">
            Clique para enviar ou arraste arquivos aqui
          </h3>
          
          <p className="text-xs text-muted-foreground">
            Suporta: JPG, PNG, WEBP (máx. 10MB cada)
          </p>
          
          <p className="text-xs text-muted-foreground mt-1">
            Máximo de {maxFiles} arquivo{maxFiles > 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Input escondido */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={maxFiles > 1}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Lista de uploads */}
      {uploads.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Enviando arquivos ({uploads.length})
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-6 text-xs"
            >
              Limpar
            </Button>
          </div>

          {uploads.map((upload) => (
            <UploadItem
              key={upload.file.name + upload.file.size}
              upload={upload}
              showPreview={showPreview}
              onRemove={() => removeUpload(upload.file)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface UploadItemProps {
  upload: UploadProgress
  showPreview: boolean
  onRemove: () => void
}

function UploadItem({ upload, showPreview, onRemove }: UploadItemProps) {
  const [previewUrl, setPreviewUrl] = useState<string>()

  React.useEffect(() => {
    if (showPreview && upload.file.type.startsWith('image/')) {
      const url = URL.createObjectURL(upload.file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [upload.file, showPreview])

  const getStatusIcon = () => {
    switch (upload.status) {
      case 'uploading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getProgressColor = () => {
    switch (upload.status) {
      case 'uploading':
        return 'bg-blue-500'
      case 'success':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
    }
  }

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Preview ou ícone */}
          <div className="flex-shrink-0">
            {showPreview && previewUrl ? (
              <Image
                src={previewUrl}
                alt={upload.file.name}
                width={40}
                height={40}
                className="w-10 h-10 object-cover rounded"
              />
            ) : (
              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                <FileImage className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Info do arquivo */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{upload.file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(upload.file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            
            {upload.status === 'error' && upload.error && (
              <p className="text-xs text-red-500 mt-1">{upload.error}</p>
            )}

            {/* Barra de progresso */}
            {upload.status === 'uploading' && (
              <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                <div 
                  className={`h-1.5 rounded-full transition-all ${getProgressColor()}`}
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
            )}
          </div>

          {/* Status e ações */}
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
