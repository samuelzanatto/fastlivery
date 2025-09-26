'use client'

import { useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Plus, Save } from 'lucide-react'
import { notify } from '@/lib/notifications/notify'
import { createCategory, updateCategory } from '@/actions/categories/categories'

const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  isActive: z.boolean(),
  order: z.number().min(0),
})

type CategoryFormData = z.infer<typeof categorySchema>

interface CategoryImage {
  id: string
  url: string
  thumbnailUrl?: string
  originalName: string
}

interface Category {
  id: string
  name: string
  description?: string | null
  parentId?: string | null
  isActive?: boolean
  order?: number
  image?: string
  imageUrl?: string | null
}

interface CategoryFormDialogProps {
  trigger?: React.ReactNode
  category?: Category | null
  businessId?: string
  categories?: Category[]
  onSuccess?: () => void
  children?: React.ReactNode
}

export function CategoryFormDialog({
  category,
  categories = [],
  onSuccess,
  children
}: CategoryFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [_selectedImages, setSelectedImages] = useState<CategoryImage[]>([])
  const [activeTab, setActiveTab] = useState<'main' | 'sub'>('main')

  const isEditing = !!category

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      description: category?.description || '',
      parentId: category?.parentId || null,
      isActive: category?.isActive ?? true,
      order: category?.order || 0,
    }
  })

  // Filtrar categorias principais (sem pai) disponíveis para ser pai
  const availableParentCategories = categories.filter(cat => 
    !cat.parentId && // Só categorias principais podem ser pais
    cat.id !== category?.id // Não pode ser pai de si mesmo
  )

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setOpen(true)
    } else if (!loading) {
      setOpen(false)
      form.reset()
      setSelectedImages([])
    }
  }

  const onSubmit = async (data: CategoryFormData) => {
    try {
      setLoading(true)

      // Se não está em modo de edição e está na tab 'main', força parentId como null
      if (!isEditing && activeTab === 'main') {
        data.parentId = null
      }

      const payload = {
        name: data.name,
        description: data.description || undefined,
        order: data.order,
        isActive: data.isActive
      }

      let result
      if (isEditing && category) {
        result = await updateCategory(category.id, payload)
      } else {
        result = await createCategory(payload)
      }

      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar categoria')
      }

      notify('success', isEditing ? 'Categoria atualizada!' : 'Categoria criada!')
      setOpen(false)
      form.reset()
      setSelectedImages([])
      onSuccess?.()
    } catch (error) {
      console.error('Erro ao salvar categoria:', error)
      notify('error', error instanceof Error ? error.message : 'Erro ao salvar categoria')
    } finally {
      setLoading(false)
    }
  }

  // Função para renderizar o formulário de categoria
  const renderCategoryForm = (isSubcategory = false) => {
    return (
      <>
        {/* Campos do formulário */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Nome da Categoria</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ex: Pizzas, Hambúrguers, Bebidas"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Seletor de categoria pai - apenas para subcategorias */}
          {isSubcategory && (
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Categoria Principal</FormLabel>
                  <Select value={field.value || undefined} onValueChange={(value) => field.onChange(value || null)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria pai" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableParentCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Descrição (Opcional)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Descreva sua categoria..."
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="order"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ordem de Exibição</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status */}
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <div>
                    <FormLabel>Status da Categoria</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Controle se a categoria está ativa no cardápio
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <Label className={field.value ? "text-green-700" : "text-gray-500"}>
                      {field.value ? 'Ativa' : 'Inativa'}
                    </Label>
                  </div>
                </div>
              </FormItem>
            )}
          />
        </div>
      </>
    )
  }

  // Função para renderizar os botões do formulário
  const renderFormButtons = () => {
    const isCurrentlySubcategory = !isEditing && activeTab === 'sub'
    
    return (
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
          {isEditing 
            ? 'Atualizar Categoria' 
            : isCurrentlySubcategory 
              ? 'Criar Subcategoria' 
              : 'Criar Categoria Principal'
          }
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button className="bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Categoria' : 'Gerenciar Categorias'}
          </DialogTitle>
        </DialogHeader>

        {isEditing ? (
          // Modo de edição - formulário simples
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {renderCategoryForm(!!category?.parentId)}
              {renderFormButtons()}
            </form>
          </Form>
        ) : (
          // Modo de criação - com tabs
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'main' | 'sub')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="main" className="flex items-center gap-2">
                <span>📁</span>
                Categoria Principal
              </TabsTrigger>
              <TabsTrigger 
                value="sub" 
                className="flex items-center gap-2"
                disabled={availableParentCategories.length === 0}
              >
                <span>📂</span>
                Subcategoria
              </TabsTrigger>
            </TabsList>

            <TabsContent value="main" className="mt-6">
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Categoria Principal</h3>
                  <p className="text-sm text-blue-700">
                    Crie uma categoria independente que pode servir como categoria pai para outras subcategorias.
                  </p>
                </div>
              </div>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {renderCategoryForm(false)}
                  {renderFormButtons()}
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="sub" className="mt-6">
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h3 className="font-semibold text-orange-900 mb-2">Subcategoria</h3>
                  <p className="text-sm text-orange-700">
                    Crie uma subcategoria que pertence a uma categoria principal existente.
                  </p>
                </div>
              </div>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {renderCategoryForm(true)}
                  {renderFormButtons()}
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}