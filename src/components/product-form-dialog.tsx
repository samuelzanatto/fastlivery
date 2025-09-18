'use client'

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ImageUploadDialog } from '@/components/ui/image-upload-dialog'
import { ImageType } from '@/lib/image-types'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProductAdditionalsSelector } from '@/components/product-additionals-selector'
import { Plus, Image as ImageIcon, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  price: z.number().min(0, 'Preço deve ser maior que 0'),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  isAvailable: z.boolean(),
})

type ProductFormData = z.infer<typeof productSchema>

interface ProductImage {
  id: string
  url: string
  thumbnailUrl?: string
  originalName: string
}

interface ProductFormDialogProps {
  restaurantId: string
  categories: Array<{ id: string; name: string }>
  product?: {
    id: string
    name: string
    description?: string
    price: number
    categoryId: string
    isAvailable: boolean
    image?: string
  }
  onSuccess: () => void
  children?: React.ReactNode
}

export function ProductFormDialog({
  restaurantId,
  categories,
  product,
  onSuccess,
  children
}: ProductFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedImages, setSelectedImages] = useState<ProductImage[]>([])
  const [selectedAdditionals, setSelectedAdditionals] = useState<string[]>([])
  const [loadingAdditionals, setLoadingAdditionals] = useState(false)

  const isEditing = !!product

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      price: product?.price || 0,
      categoryId: product?.categoryId || '',
      isAvailable: product?.isAvailable ?? true,
    }
  })

  // Carregar opções do produto quando em modo de edição
  // Caregar adicionais selecionados do produto (se estiver editando)
  const loadProductAdditionals = useCallback(async (productId: string) => {
    if (!productId) return
    
    setLoadingAdditionals(true)
    try {
      const response = await fetch(`/api/products/${productId}/additionals`)
      if (response.ok) {
        const data = await response.json()
        setSelectedAdditionals(data.additionalIds || [])
      }
    } catch (error) {
      console.error('Erro ao carregar adicionais do produto:', error)
      toast.error('Erro ao carregar adicionais do produto')
    } finally {
      setLoadingAdditionals(false)
    }
  }, [])

  // Salvar adicionais selecionados para o produto
  const saveProductAdditionals = useCallback(async (productId: string) => {
    if (!productId) return true
    
    try {
      const response = await fetch(`/api/products/${productId}/additionals`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ additionalIds: selectedAdditionals })
      })

      if (response.ok) {
        toast.success('Adicionais do produto salvos com sucesso')
        return true
      } else {
        const errorData = await response.json()
        console.error('Erro ao salvar adicionais:', errorData)
        toast.error('Erro ao salvar adicionais do produto: ' + (errorData.error || 'Erro desconhecido'))
        return false
      }
    } catch (error) {
      console.error('Erro ao salvar adicionais:', error)
      toast.error('Erro ao salvar adicionais do produto')
      return false
    }
  }, [selectedAdditionals])

  const handleImageSelect = useCallback((image: {
    id: string
    url: string
    thumbnailUrl?: string
    originalName: string
  }) => {
    const productImage: ProductImage = {
      id: image.id,
      url: image.url,
      thumbnailUrl: image.thumbnailUrl,
      originalName: image.originalName
    }
    
    // Para produtos, normalmente usamos apenas uma imagem principal
    setSelectedImages([productImage])
    toast.success('Imagem selecionada')
  }, [])

  const removeImage = useCallback((imageId: string) => {
    setSelectedImages(prev => prev.filter(img => img.id !== imageId))
  }, [])

  const onSubmit = async (data: ProductFormData) => {
    try {
      setLoading(true)

      const payload = {
        ...data,
        restaurantId,
        image: selectedImages[0]?.url || null
      }

      const url = isEditing ? `/api/products/${product.id}` : '/api/products'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao salvar produto')
      }

      const result = await response.json()
      
      const productId = isEditing ? product.id : result.id
      
      // Salvar adicionais selecionados
      let additionalsSaved = true
      if (productId && selectedAdditionals.length > 0) {
        additionalsSaved = await saveProductAdditionals(productId)
      }

      toast.success(isEditing ? 'Produto atualizado!' : 'Produto criado!')
      
      // Só fechar o dialog se os adicionais foram salvos com sucesso ou se não há adicionais
      if (additionalsSaved) {
        setOpen(false)
        onSuccess()
        form.reset()
        setSelectedImages([])
        setSelectedAdditionals([])
      }
    } catch (error) {
      console.error('Erro ao salvar produto:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar produto')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      form.reset()
      setSelectedImages([])
      setSelectedAdditionals([])
    } else if (newOpen && isEditing) {
      // Carregar dados existentes
      if (product?.image) {
        setSelectedImages([{
          id: 'existing',
          url: product.image,
          originalName: 'Imagem atual'
        }])
      }
      
      // Carregar opções do produto
      if (product?.id) {
        loadProductAdditionals(product.id)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button className="bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </Button>
        )}
      </DialogTrigger>
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Produto' : 'Criar Novo Produto'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Layout Principal: Imagem à esquerda, campos à direita */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Imagem do Produto - Lado Esquerdo */}
              <div className="lg:col-span-1">
                <div className="space-y-4">
                  <Label>Imagem do Produto</Label>
                  
                  {selectedImages.length > 0 ? (
                    <div className="space-y-4">
                      {selectedImages.map((image) => (
                        <div key={image.id} className="relative w-32 h-32">
                          <Image
                            src={image.thumbnailUrl || image.url}
                            alt=""
                            fill
                            className="object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                            onClick={() => removeImage(image.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                      <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-4">
                        Nenhuma imagem selecionada
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Adicione uma imagem para representar seu produto
                      </p>
                    </div>
                  )}

                  <ImageUploadDialog
                    entityId={restaurantId}
                    imageType={ImageType.PRODUCT_IMAGE}
                    onImageSelect={handleImageSelect}
                    title="Selecionar Imagem do Produto"
                    description="Escolha uma imagem para representar seu produto"
                  >
                    <Button type="button" variant="outline" className="w-full">
                      <ImageIcon className="h-4 w-4 mr-2" />
                      {selectedImages.length > 0 ? 'Alterar Imagem' : 'Adicionar Imagem'}
                    </Button>
                  </ImageUploadDialog>
                </div>
              </div>

              {/* Campos Básicos - Lado Direito */}
              <div className="lg:col-span-2">
                <div className="space-y-4">
                  {/* Nome e Preço */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Nome do Produto</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ex: Hambúrguer Clássico, Pizza Margherita, Refrigerante"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Categoria e Disponibilidade */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma categoria" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Status */}
                    <FormField
                      control={form.control}
                      name="isAvailable"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status do Produto</FormLabel>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                            <Label className={field.value ? "text-green-700" : "text-gray-500"}>
                              {field.value ? 'Disponível' : 'Indisponível'}
                            </Label>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva os ingredientes, preparo ou características especiais do produto..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Seletor de Adicionais */}
            <div className="space-y-4">
              <div className="border-t pt-6">
                <ProductAdditionalsSelector
                  restaurantId={restaurantId}
                  selectedAdditionals={selectedAdditionals}
                  onSelectionChange={setSelectedAdditionals}
                  disabled={loading || loadingAdditionals}
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white">
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                )}
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Atualizar' : 'Criar'} Produto
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
