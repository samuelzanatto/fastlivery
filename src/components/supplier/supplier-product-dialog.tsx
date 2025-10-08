"use client"
import { useState, useCallback } from 'react'
import { createSupplierService } from '@/actions/supplier-services/supplier-services'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { notify } from '@/lib/notifications/notify'
import { CategorySelector } from './category-selector'

interface SupplierProductDialogProps {
  onCreated?: () => void
  trigger?: React.ReactNode
}

export function SupplierProductDialog({ onCreated, trigger }: SupplierProductDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    subCategory: '',
    categoryId: null as string | null,
    subCategoryId: null as string | null,
    unitType: 'unidade',
    pricePerUnit: '',
    priceType: 'fixed',
    trackStock: true,
    stockQuantity: 0,
    lowStockThreshold: 0,
    allowBackorder: false,
    images: [] as string[]
  })

  const handleChange = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }))
  }

  const handleCategoryChange = useCallback((categoryId: string, categoryName: string) => {
    setForm(f => ({ 
      ...f, 
      categoryId: categoryId || null,
      category: categoryName,
      subCategory: '', // Reset subcategoria quando categoria muda
      subCategoryId: null, // Reset ID da subcategoria também
    }))
  }, [])

  const handleSubCategoryChange = useCallback((subCategoryId: string | null, subCategoryName: string | null) => {
    setForm(f => ({ 
      ...f, 
      subCategoryId: subCategoryId,
      subCategory: subCategoryName || ''
    }))
  }, [])

  const handleSubmit = async () => {
    if (!form.name || !form.category || !form.unitType) {
      notify('error', 'Campos obrigatórios', { description: 'Preencha nome, categoria e unidade.' })
      return
    }
    setLoading(true)
    try {
      const result = await createSupplierService({
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category,
        subCategory: form.subCategory.trim() || null,
        categoryId: form.categoryId,
        unitType: form.unitType,
        minQuantity: null, // Será implementado futuramente
        maxQuantity: null, // Será implementado futuramente
        pricePerUnit: form.pricePerUnit ? Number(form.pricePerUnit) : null,
        priceType: form.priceType as 'fixed' | 'negotiable' | 'quote',
        images: form.images,
        specifications: {},
        isActive: true,
        trackStock: form.trackStock,
        stockQuantity: form.stockQuantity,
        reservedQuantity: 0,
        lowStockThreshold: form.lowStockThreshold,
        allowBackorder: form.allowBackorder
      })
      if (!result.success) throw new Error(result.error)
      notify('success', 'Produto criado', { description: 'O produto foi adicionado ao catálogo.' })
      setOpen(false)
      setForm({ 
        name: '', 
        description: '', 
        category: '', 
        subCategory: '', 
        categoryId: null,
        subCategoryId: null,
        unitType: 'unidade', 
        pricePerUnit: '', 
        priceType: 'fixed', 
        trackStock: true, 
        stockQuantity: 0, 
        lowStockThreshold: 0, 
        allowBackorder: false, 
        images: [] 
      })
      onCreated?.()
    } catch (e) {
      notify('error', 'Erro ao criar', { description: e instanceof Error ? e.message : 'Falha desconhecida' })
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formDataData = new FormData()
    formDataData.append('file', file)
    try {
      const res = await fetch('/api/supplier-services/upload', { method: 'POST', body: formDataData })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Falha no upload')
      setForm(f => ({ ...f, images: [...f.images, json.url] }))
      notify('success', 'Imagem enviada')
    } catch (err) {
      notify('error', 'Erro no upload', { description: err instanceof Error ? err.message : 'Falha desconhecida' })
    } finally {
      e.target.value = ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="default">Novo Produto</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Produto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome *</label>
            <Input value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="Ex: Tomate Italiano" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição</label>
            <Textarea value={form.description} onChange={e => handleChange('description', e.target.value)} rows={3} />
          </div>
          <CategorySelector
            categoryId={form.categoryId}
            subCategoryId={form.subCategoryId}
            onCategoryChange={handleCategoryChange}
            onSubCategoryChange={handleSubCategoryChange}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Unidade *</label>
              <Input value={form.unitType} onChange={e => handleChange('unitType', e.target.value)} placeholder="Ex: kg, unidade" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Preço Unitário</label>
              <Input type="number" value={form.pricePerUnit} onChange={e => handleChange('pricePerUnit', e.target.value)} placeholder="Ex: 12.50" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Preço</label>
            <select
              className="border rounded-md h-9 px-2 text-sm"
              value={form.priceType}
              onChange={e => handleChange('priceType', e.target.value)}
            >
              <option value="fixed">Fixo</option>
              <option value="negotiable">Negociável</option>
              <option value="quote">Sob Cotação</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <input type="checkbox" checked={form.trackStock} onChange={e => setForm(f => ({ ...f, trackStock: e.target.checked }))} /> Controlar Estoque
              </label>
              {form.trackStock && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estoque Inicial</label>
                  <Input type="number" value={form.stockQuantity} onChange={e => setForm(f => ({ ...f, stockQuantity: Number(e.target.value) }))} />
                </div>
              )}
            </div>
            {form.trackStock && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Alerta Baixo</label>
                <Input type="number" value={form.lowStockThreshold} onChange={e => setForm(f => ({ ...f, lowStockThreshold: Number(e.target.value) }))} />
                <label className="text-xs flex items-center gap-1 mt-1">
                  <input type="checkbox" checked={form.allowBackorder} onChange={e => setForm(f => ({ ...f, allowBackorder: e.target.checked }))} /> Backorder
                </label>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Imagens</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            {form.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.images.map((img, idx) => (
                  <div key={idx} className="relative w-16 h-16 border rounded overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="img" className="object-cover w-full h-full" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancelar</Button>
          </DialogClose>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
