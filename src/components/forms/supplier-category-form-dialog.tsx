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

import { Save } from 'lucide-react'
import { notify } from '@/lib/notifications/notify'
import { createSupplierCategory, updateSupplierCategory } from '@/actions/supplier-categories/supplier-categories'

const supplierCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  isActive: z.boolean(),
  order: z.number().min(0),
})

type SupplierCategoryFormData = z.infer<typeof supplierCategorySchema>

interface SupplierCategory {
  id: string
  name: string
  description?: string | null
  parentId?: string | null
  isActive?: boolean
  order?: number
}

interface SupplierCategoryFormDialogProps {
  trigger?: React.ReactNode
  category?: SupplierCategory | null
  categories?: SupplierCategory[]
  onSuccess?: () => void
  children?: React.ReactNode
}

export function SupplierCategoryFormDialog({
  category,
  categories = [],
  onSuccess,
  children
}: SupplierCategoryFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'main' | 'sub'>('main')

  const isEditing = !!category

  const form = useForm<SupplierCategoryFormData>({
    resolver: zodResolver(supplierCategorySchema),
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
    }
  }

  const onSubmit = async (data: SupplierCategoryFormData) => {
    try {
      setLoading(true)

      // Se não está em modo de edição e está na tab 'main', força parentId como null
      if (!isEditing && activeTab === 'main') {
        data.parentId = null
      }

      const payload = {
        name: data.name,
        description: data.description || undefined,
        parentId: data.parentId || undefined,
        order: data.order,
        isActive: data.isActive
      }

      let result
      if (isEditing && category) {
        result = await updateSupplierCategory(category.id, payload)
      } else {
        result = await createSupplierCategory(payload)
      }

      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar categoria')
      }

      notify('success', isEditing ? 'Categoria atualizada!' : 'Categoria criada!')
      setOpen(false)
      form.reset()
      onSuccess?.()
    } catch (error) {
      console.error('Erro ao salvar categoria:', error)
      notify('error', error instanceof Error ? error.message : 'Erro ao salvar categoria')
    } finally {
      setLoading(false)
    }
  }

  const renderCategoryForm = (isSubcategory: boolean = false) => (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome da Categoria</FormLabel>
            <FormControl>
              <Input
                placeholder="Digite o nome da categoria"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descrição (Opcional)</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Descreva o que engloba esta categoria"
                rows={3}
                {...field}
                value={field.value || ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {isSubcategory && (
        <FormField
          control={form.control}
          name="parentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria Principal</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria principal" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableParentCategories.map((parentCat) => (
                    <SelectItem key={parentCat.id} value={parentCat.id}>
                      {parentCat.name}
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
        name="order"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Ordem de Exibição</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="0"
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="isActive"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Ativa</FormLabel>
              <div className="text-sm text-gray-600">
                Categorias inativas não aparecerão no catálogo
              </div>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </>
  )

  const renderFormButtons = () => (
    <div className="flex justify-end gap-3 pt-6">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(false)}
        disabled={loading}
      >
        Cancelar
      </Button>
      <Button type="submit" disabled={loading}>
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Salvando...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            {isEditing ? 'Atualizar' : 'Criar'} Categoria
          </div>
        )}
      </Button>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
          </DialogTitle>
        </DialogHeader>

        {!isEditing ? (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'main' | 'sub')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="main">Categoria Principal</TabsTrigger>
              <TabsTrigger value="sub">Subcategoria</TabsTrigger>
            </TabsList>
            
            <TabsContent value="main" className="mt-6">
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Categoria Principal</h3>
                  <p className="text-sm text-blue-700">
                    Crie uma categoria principal que pode conter subcategorias. 
                    Por exemplo: &quot;Ingredientes&quot;, &quot;Embalagens&quot;, &quot;Equipamentos&quot;.
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
                    Por exemplo: &quot;Temperos&quot; dentro de &quot;Ingredientes&quot;.
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
        ) : (
          // Modo de edição - formulário simples sem tabs
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {renderCategoryForm(!!category?.parentId)}
              {renderFormButtons()}
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}