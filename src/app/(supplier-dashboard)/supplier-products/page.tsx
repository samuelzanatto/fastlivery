'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DashboardHeader, DashboardHeaderButton } from "@/components/ui/dashboard-header"
import { Plus, Package2, Edit3, Eye, MoreVertical, TrendingUp } from "lucide-react"
import { SupplierProductDialog } from '@/components/supplier/supplier-product-dialog'
import { SupplierProductEditDialog } from '@/components/supplier/supplier-product-edit-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useSession } from '@/lib/auth/auth-client'
import { useRouter } from 'next/navigation'
import { notify } from '@/lib/notifications/notify'
import { getSupplierServices, manualAdjustStock } from '@/actions/supplier-services/supplier-services'
import type { SupplierService } from '@/actions/supplier-services/supplier-services'
// Hook realtime desabilitado temporariamente
// import { useSupplierServices } from '@/hooks/realtime'

export default function SupplierProducts() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<SupplierService[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [adjustingId, setAdjustingId] = useState<string | null>(null)
  const [adjustDelta, setAdjustDelta] = useState<number>(0)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login')
    }
  }, [session, isPending, router])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getSupplierServices({})
      
      if (result.success) {
        const productsList = result.data || []
        setProducts(productsList)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
      notify('error', 'Erro ao carregar produtos', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (session) loadProducts() }, [session, loadProducts])
  useEffect(() => { if (products.length && !supplierId) setSupplierId(products[0].supplierId) }, [products, supplierId])

  // Hook realtime desabilitado temporariamente
  /*
  useSupplierServices({
    enabled: !!supplierId,
    supplierId: supplierId || undefined,
    onInsert: (s) => setProducts(prev => { if (prev.find(p => p.id === s.id)) return prev; const list = [s, ...prev]; recomputeStats(list); return list }),
    onUpdate: (s) => setProducts(prev => { const list = prev.map(p => p.id === s.id ? s : p); recomputeStats(list); return list }),
    onDelete: (id) => setProducts(prev => { const list = prev.filter(p => p.id !== id); recomputeStats(list); return list })
  })
  */

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isPending) {
    return null
  }

  if (!session) {
    return null
  }

  const getStatusBadge = (product: SupplierService) => {
    if (!product.isActive) return <Badge variant="outline" className="text-red-600 border-red-600">Inativo</Badge>
    if (product.trackStock) {
      const available = product.stockQuantity - product.reservedQuantity
      if (available <= 0) return <Badge variant="outline" className="text-red-600 border-red-600">Sem Estoque</Badge>
      if (available <= product.lowStockThreshold) return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Baixo</Badge>
    }
    return <Badge variant="outline" className="text-green-600 border-green-600">Ativo</Badge>
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }


  const handleEditProduct = (productId: string) => {
    setEditingProductId(productId)
    setEditDialogOpen(true)
  }

  const handleViewProduct = (productId: string) => {
    router.push(`/supplier-products/${productId}`)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <DashboardHeader
        title="Meus Produtos"
        description="Gerencie seu catálogo de produtos no marketplace"
      >
        <SupplierProductDialog
          onCreated={loadProducts}
          trigger={<DashboardHeaderButton>
            <Plus className="h-4 w-4 mr-2" />Novo Produto
          </DashboardHeaderButton>}
        />
      </DashboardHeader>

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </div>

      {/* Products List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Carregando produtos...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-8">
          <Package2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum produto encontrado</h3>
          <p className="text-slate-600 mb-4">
            {searchTerm ? 'Tente ajustar sua busca ou criar um novo produto.' : 'Comece adicionando seu primeiro produto.'}
          </p>
          <SupplierProductDialog
            onCreated={loadProducts}
            trigger={<Button><Plus className="h-4 w-4 mr-2" />Adicionar Produto</Button>}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center">
                  {Array.isArray(product.images) && product.images.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={product.images[0] as string} 
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <Package2 className="h-6 w-6 text-slate-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-800 truncate">{product.name}</h3>
                  <p className="text-sm text-slate-600">{product.category || 'Sem categoria'}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="font-medium">
                    {product.pricePerUnit ? formatCurrency(product.pricePerUnit) : product.priceType}
                  </div>
                  <div className="text-sm text-slate-600">Preço/{product.unitType}</div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-sm text-slate-700 min-w-[110px]">
                    {product.trackStock ? (
                      <div className="flex flex-col text-right">
                        <span className="font-medium">{product.stockQuantity - product.reservedQuantity} <span className="text-xs text-slate-500">disp.</span></span>
                        <span className="text-xs text-slate-500">Res: {product.reservedQuantity}</span>
                      </div>
                    ) : <span className="text-xs italic text-slate-500">Sem controle</span>}
                  </div>
                  {getStatusBadge(product)}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewProduct(product.id)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Visualizar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditProduct(product.id)}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setAdjustingId(product.id); setAdjustDelta(0) }}>
                      <TrendingUp className="h-4 w-4 mr-2" /> Ajustar Estoque
                    </DropdownMenuItem>
                    <DropdownMenuItem className={product.isActive ? "text-red-600" : "text-green-600"}>
                      <Package2 className="h-4 w-4 mr-2" /> {product.isActive ? 'Desativar' : 'Ativar'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}
      {adjustingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-medium">Ajustar Estoque</h3>
            <p className="text-sm text-slate-600">Informe um número positivo (entrada) ou negativo (saída).</p>
            <Input type="number" value={adjustDelta} onChange={e => setAdjustDelta(Number(e.target.value))} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setAdjustingId(null); setAdjustDelta(0) }}>Cancelar</Button>
              <Button onClick={async () => {
                if (!adjustDelta) { notify('error','Valor inválido'); return }
                try {
                  const res = await manualAdjustStock({ serviceId: adjustingId!, delta: adjustDelta, reason: 'Ajuste dashboard' })
                  if (!res.success) throw new Error(res.error)
                  notify('success','Estoque atualizado')
                  setAdjustingId(null)
                  setAdjustDelta(0)
                } catch (e) {
                  notify('error','Falha',{ description: e instanceof Error ? e.message : 'Erro' })
                }
              }}>Aplicar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de Edição */}
      <SupplierProductEditDialog
        productId={editingProductId}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUpdated={loadProducts}
      />
    </div>
  )
}