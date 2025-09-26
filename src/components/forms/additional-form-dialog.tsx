'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Plus, 
  Trash2, 
  Save,
  DollarSign,
  Package
} from 'lucide-react'
import { notify } from '@/lib/notifications/notify'
import { createAdditional, updateAdditional } from '@/actions/additionals'

const additionalItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nome do item é obrigatório'),
  price: z.number().min(0, 'Preço deve ser maior ou igual a 0'),
})

const additionalSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  price: z.number().min(0, 'Preço base deve ser maior ou igual a 0'),
  isRequired: z.boolean(),
  maxOptions: z.number().min(1, 'Deve permitir pelo menos 1 opção'),
  options: z.array(additionalItemSchema).min(1, 'Deve ter pelo menos 1 item'),
})

type AdditionalFormData = z.infer<typeof additionalSchema>

interface AdditionalItem {
  id: string
  name: string
  price: number
}

interface Additional {
  id: string
  name: string
  description?: string | null
  price: number
  isRequired: boolean
  maxOptions: number
  options: AdditionalItem[]
}

interface AdditionalFormDialogProps {
  businessId: string
  additional?: Additional
  onSuccess: () => void
  children?: React.ReactNode
}

export function AdditionalFormDialog({
  businessId: _businessId,
  additional,
  onSuccess,
  children
}: AdditionalFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const isEditing = !!additional

  const form = useForm<AdditionalFormData>({
    resolver: zodResolver(additionalSchema),
    defaultValues: {
      name: additional?.name || '',
      description: additional?.description || '',
      price: additional?.price || 0,
      isRequired: additional?.isRequired ?? false,
      maxOptions: additional?.maxOptions || 1,
      options: additional?.options.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price
      })) || [{ name: '', price: 0 }],
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'options'
  })

  const addNewItem = () => {
    append({ name: '', price: 0 })
  }

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    } else {
  notify('error', 'Deve ter pelo menos um item')
    }
  }

  const onSubmit = async (data: AdditionalFormData) => {
    try {
      setLoading(true)

      // Convert options to items for Server Action
      const formData = {
        name: data.name,
        description: data.description || '',
        price: data.price,
        isRequired: data.isRequired,
        maxOptions: data.maxOptions,
        items: data.options.map(option => ({
          name: option.name,
          price: option.price
        }))
      }

      let result
      if (isEditing) {
        result = await updateAdditional(additional.id, formData)
      } else {
        result = await createAdditional(formData)
      }

      if (result.success) {
        notify('success', isEditing ? 'Adicional atualizado!' : 'Adicional criado!')
        setOpen(false)
        onSuccess()
        form.reset()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Erro ao salvar adicional:', error)
      notify('error', error instanceof Error ? error.message : 'Erro ao salvar adicional')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      form.reset()
    }
  }

  // Reset form when additional prop changes
  useEffect(() => {
    if (additional) {
      form.reset({
        name: additional.name,
        description: additional.description || '',
        price: additional.price,
        isRequired: additional.isRequired,
        maxOptions: additional.maxOptions,
        options: additional.options.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price
        })),
      })
    }
  }, [additional, form])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button className="bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            {isEditing ? 'Editar Adicional' : 'Novo Adicional'}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isEditing ? 'Editar Adicional' : 'Criar Novo Adicional'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informações básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Adicional</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Tamanho, Ingredientes Extras, Bebidas"
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
                    <FormLabel>Preço Base (R$)</FormLabel>
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

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva este grupo de adicionais..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxOptions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Máximo de Opções</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="1"
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isRequired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo do Adicional</FormLabel>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <Label className={field.value ? "text-red-700" : "text-gray-500"}>
                        {field.value ? 'Obrigatório' : 'Opcional'}
                      </Label>
                      <Badge variant={field.value ? "destructive" : "secondary"} className="text-xs">
                        {field.value ? 'Obrigatório' : 'Opcional'}
                      </Badge>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Itens do Adicional */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Itens do Adicional
                  </h3>
                  <p className="text-sm text-gray-600">
                    Configure as opções disponíveis para este adicional
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addNewItem}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {fields.map((field, index) => (
                  <Card key={field.id} className="border-l-4 border-l-orange-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Item {index + 1}
                        </CardTitle>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`options.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome do Item</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ex: Grande, Queijo Extra, Coca-Cola"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`options.${index}.price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preço Adicional (R$)</FormLabel>
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
                    </CardContent>
                  </Card>
                ))}
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
                {isEditing ? 'Atualizar' : 'Criar'} Adicional
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}