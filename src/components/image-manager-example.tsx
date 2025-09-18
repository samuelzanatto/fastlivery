'use client'

import React from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ImageUpload } from '@/components/ui/image-upload'
import { ImageGallery } from '@/components/ui/image-gallery'
import { useImageManager } from '@/hooks/use-image-manager'
import { ImageType } from '@/lib/image-types'
import { toast } from 'sonner'

interface ImageManagerExampleProps {
  userId?: string
  restaurantId?: string
}

export function ImageManagerExample({ userId, restaurantId }: ImageManagerExampleProps) {
  // Exemplo 1: Avatar do usuário
  const userAvatarManager = useImageManager({
    entityId: userId || 'demo-user',
    imageType: ImageType.USER_AVATAR,
    onUploadComplete: (images) => {
      toast.success(`${images.length} avatar(s) enviado(s) com sucesso!`)
    },
    onUploadError: (error) => {
      toast.error(`Erro no upload do avatar: ${error}`)
    },
    onDeleteComplete: () => {
      toast.success('Avatar removido com sucesso!')
    }
  })

  // Exemplo 2: Logo do restaurante
  const restaurantLogoManager = useImageManager({
    entityId: restaurantId || 'demo-restaurant',
    imageType: ImageType.RESTAURANT_LOGO,
    onUploadComplete: (images) => {
      toast.success(`${images.length} logo(s) enviado(s) com sucesso!`)
    },
    onUploadError: (error) => {
      toast.error(`Erro no upload do logo: ${error}`)
    }
  })

  // Exemplo 3: Imagens de produtos
  const productImagesManager = useImageManager({
    entityId: restaurantId || 'demo-restaurant',
    imageType: ImageType.PRODUCT_IMAGE,
    onUploadComplete: (images) => {
      toast.success(`${images.length} imagem(ns) de produto enviada(s)!`)
    },
    onUploadError: (error) => {
      toast.error(`Erro no upload de produtos: ${error}`)
    }
  })

  React.useEffect(() => {
    // Carregar imagens existentes quando o componente monta
    userAvatarManager.fetchImages()
    restaurantLogoManager.fetchImages()
    productImagesManager.fetchImages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Sistema de Gerenciamento de Imagens</h1>
        <p className="text-muted-foreground mt-2">
          Sistema profissional para upload, armazenamento e gestão de imagens
        </p>
      </div>

      <div className="grid gap-8">
        {/* Avatar do Usuário */}
        <Card>
          <CardHeader>
            <CardTitle>Avatar do Usuário</CardTitle>
            <CardDescription>
              Upload de avatar com redimensionamento automático (400x400px)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUpload
              entityId={userId || 'demo-user'}
              imageType={ImageType.USER_AVATAR}
              maxFiles={1}
              accept="image/jpeg,image/png,image/webp"
              onUploadComplete={(_images) => {
                userAvatarManager.fetchImages()
                toast.success('Avatar enviado!')
              }}
            />
            
            <Separator />
            
            <div>
              <h4 className="font-medium mb-2">Avatar atual:</h4>
              <div className="flex items-center gap-4">
                {userAvatarManager.getFirstImageThumbnail() ? (
                  <Image
                    src={userAvatarManager.getFirstImageThumbnail()!}
                    alt="Avatar atual"
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full object-cover border"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    Sem avatar
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  {userAvatarManager.images.length > 0 
                    ? `${userAvatarManager.images.length} imagem(ns) disponível(is)`
                    : 'Nenhuma imagem enviada'
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo do Restaurante */}
        <Card>
          <CardHeader>
            <CardTitle>Logo do Restaurante</CardTitle>
            <CardDescription>
              Upload de logo com suporte a SVG (300x300px máximo)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUpload
              entityId={restaurantId || 'demo-restaurant'}
              imageType={ImageType.RESTAURANT_LOGO}
              maxFiles={1}
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onUploadComplete={() => {
                restaurantLogoManager.fetchImages()
              }}
            />
            
            <Separator />
            
            <ImageGallery
              entityId={restaurantId || 'demo-restaurant'}
              imageType={ImageType.RESTAURANT_LOGO}
              onImageDeleted={() => {
                restaurantLogoManager.fetchImages()
              }}
            />
          </CardContent>
        </Card>

        {/* Imagens de Produtos */}
        <Card>
          <CardHeader>
            <CardTitle>Galeria de Produtos</CardTitle>
            <CardDescription>
              Upload múltiplo de imagens de produtos (800x800px, alta qualidade)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUpload
              entityId={restaurantId || 'demo-restaurant'}
              imageType={ImageType.PRODUCT_IMAGE}
              category="hamburgers"
              maxFiles={10}
              onUploadComplete={() => {
                productImagesManager.fetchImages()
              }}
            />
            
            <Separator />
            
            <ImageGallery
              entityId={restaurantId || 'demo-restaurant'}
              imageType={ImageType.PRODUCT_IMAGE}
              selectable
              onImageDeleted={() => {
                productImagesManager.fetchImages()
              }}
              onImageSelected={(image) => {
                console.log('Imagem selecionada:', image)
              }}
            />
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <Card>
          <CardHeader>
            <CardTitle>Estatísticas</CardTitle>
            <CardDescription>
              Informações sobre o uso do sistema de imagens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {userAvatarManager.images.length}
                </div>
                <div className="text-sm text-muted-foreground">Avatars</div>
              </div>
              
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {restaurantLogoManager.images.length}
                </div>
                <div className="text-sm text-muted-foreground">Logos</div>
              </div>
              
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {productImagesManager.images.length}
                </div>
                <div className="text-sm text-muted-foreground">Produtos</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
