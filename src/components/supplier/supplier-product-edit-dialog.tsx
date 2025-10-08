"use client"
import { useState, useEffect, useCallback } from 'react'
import { updateSupplierService, getSupplierService } from '@/actions/supplier-services/supplier-services'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { notify } from '@/lib/notifications/notify'
import { CategorySelector } from './category-selector'

interface SupplierProductEditDialogProps {
  productId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
}

export function SupplierProductEditDialog({ 
  productId, 
  open, 
  onOpenChange, 
  onUpdated 
}: SupplierProductEditDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingProduct, setLoadingProduct] = useState(false)
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
    images: [] as string[],
    isActive: true
  })

  const handleChange = (field: string, value: string | number | boolean) => {
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

  const loadProduct = useCallback(async () => {
    if (!productId) return
    
    setLoadingProduct(true)
    try {
      const result = await getSupplierService(productId)
      
      if (!result.success) {
        throw new Error(result.error)
      }

      const product = result.data
      if (!product) {
        throw new Error('Produto não encontrado')
      }

      setForm({
        name: product.name,
        description: product.description || '',
        category: product.category,
        subCategory: product.subCategory || '',
        categoryId: product.categoryId,
        subCategoryId: null, // Não temos subcategoryId no banco ainda
        unitType: product.unitType,
        pricePerUnit: product.pricePerUnit?.toString() || '',
        priceType: product.priceType,
        trackStock: product.trackStock,
        stockQuantity: product.stockQuantity,
        lowStockThreshold: product.lowStockThreshold,
        allowBackorder: product.allowBackorder,
        images: Array.isArray(product.images) ? product.images as string[] : [],
        isActive: product.isActive
      })
    } catch (error) {
      console.error('Erro ao carregar produto:', error)
      notify('error', 'Erro ao carregar produto', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      })
      onOpenChange(false)
    } finally {
      setLoadingProduct(false)
    }
  }, [productId, onOpenChange])

  // Carregar dados do produto quando o diálogo abrir
  useEffect(() => {
    if (open && productId) {
      loadProduct()
    } else if (!open) {
      // Reset form quando fechar
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
        images: [],
        isActive: true
      })
    }
  }, [open, productId, loadProduct])

  const handleSubmit = async () => {
    if (!productId || !form.name || !form.category || !form.unitType) {
      notify('error', 'Campos obrigatórios', { description: 'Preencha nome, categoria e unidade.' })
      return
    }
    
    setLoading(true)
    try {
      const result = await updateSupplierService(productId, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category,
        subCategory: form.subCategory.trim() || null,
        categoryId: form.categoryId,
        unitType: form.unitType,
        pricePerUnit: form.pricePerUnit ? Number(form.pricePerUnit) : null,
        priceType: form.priceType as 'fixed' | 'negotiable' | 'quote',
        images: form.images,
        specifications: {},
        trackStock: form.trackStock,
        stockQuantity: form.stockQuantity,
        lowStockThreshold: form.lowStockThreshold,
        allowBackorder: form.allowBackorder,
        isActive: form.isActive
      })
      
      if (!result.success) throw new Error(result.error)
      
      notify('success', 'Produto atualizado', { description: 'As alterações foram salvas com sucesso.' })
      onOpenChange(false)
      onUpdated?.()
    } catch (e) {
      notify('error', 'Erro ao atualizar', { description: e instanceof Error ? e.message : 'Falha desconhecida' })
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

  const removeImage = (index: number) => {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== index) }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
        </DialogHeader>
        
        {loadingProduct ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-slate-600">Carregando produto...</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome *</label>
              <Input 
                value={form.name} 
                onChange={e => handleChange('name', e.target.value)} 
                placeholder="Ex: Tomate Italiano" 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea 
                value={form.description} 
                onChange={e => handleChange('description', e.target.value)} 
                rows={3} 
              />
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
                <Input 
                  value={form.unitType} 
                  onChange={e => handleChange('unitType', e.target.value)} 
                  placeholder="Ex: kg, unidade" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Preço Unitário</label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={form.pricePerUnit} 
                  onChange={e => handleChange('pricePerUnit', e.target.value)} 
                  placeholder="Ex: 12.50" 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Preço</label>
              <select
                className="w-full border rounded-md h-9 px-2 text-sm bg-white"
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
                  <input 
                    type="checkbox" 
                    checked={form.trackStock} 
                    onChange={e => handleChange('trackStock', e.target.checked)} 
                  /> 
                  Controlar Estoque
                </label>
                {form.trackStock && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estoque Atual</label>
                    <Input 
                      type="number" 
                      value={form.stockQuantity} 
                      onChange={e => handleChange('stockQuantity', Number(e.target.value))} 
                    />
                  </div>
                )}
              </div>
              {form.trackStock && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Alerta Baixo</label>
                  <Input 
                    type="number" 
                    value={form.lowStockThreshold} 
                    onChange={e => handleChange('lowStockThreshold', Number(e.target.value))} 
                  />
                  <label className="text-xs flex items-center gap-1 mt-1">
                    <input 
                      type="checkbox" 
                      checked={form.allowBackorder} 
                      onChange={e => handleChange('allowBackorder', e.target.checked)} 
                    /> 
                    Backorder
                  </label>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={form.isActive} 
                  onChange={e => handleChange('isActive', e.target.checked)} 
                /> 
                Produto Ativo
              </label>
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
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancelar</Button>
          </DialogClose>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || loadingProduct}
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}