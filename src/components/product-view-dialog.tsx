'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Eye } from 'lucide-react'
import Image from 'next/image'
import { ReactNode } from 'react'

interface ProductOption {
  id: string
  name: string
  description?: string
  price: number
  isRequired: boolean
  maxOptions: number
  options: Array<{
    id: string
    name: string
    price: number
  }>
}

interface Product {
  id: string
  name: string
  description?: string
  price: number
  image?: string
  category: {
    id: string
    name: string
  }
  isAvailable: boolean
  options?: ProductOption[]
}

interface ProductViewDialogProps {
  product: Product
  children?: ReactNode
}

export function ProductViewDialog({ product, children }: ProductViewDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visualizar Produto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Imagem e informações básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Imagem */}
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-gray-700">Imagem</h3>
              <div className="aspect-square w-full rounded-lg overflow-hidden bg-gray-100 border">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={300}
                    height={300}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Eye className="h-12 w-12" />
                    <span className="ml-2">Sem imagem</span>
                  </div>
                )}
              </div>
            </div>

            {/* Informações básicas */}
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2">Informações Básicas</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-medium">Nome</label>
                    <p className="text-sm font-medium">{product.name}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-medium">Preço</label>
                    <p className="text-sm font-medium text-green-600">
                      R$ {product.price.toFixed(2)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-medium">Categoria</label>
                    <Badge variant="secondary" className="text-xs">
                      {product.category.name}
                    </Badge>
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-medium">Status</label>
                    <Badge variant={product.isAvailable ? "default" : "destructive"} className="text-xs">
                      {product.isAvailable ? 'Disponível' : 'Indisponível'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Descrição */}
          {product.description && (
            <div>
              <h3 className="font-medium text-sm text-gray-700 mb-2">Descrição</h3>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {product.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Adicionais */}
          {product.options && product.options.length > 0 && (
            <div>
              <h3 className="font-medium text-sm text-gray-700 mb-2">
                Adicionais Configurados ({product.options.length})
              </h3>
              <div className="space-y-3">
                {product.options.map((optionGroup) => (
                  <Card key={optionGroup.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className="font-medium text-sm">{optionGroup.name}</h4>
                        {optionGroup.isRequired && (
                          <Badge variant="destructive" className="text-xs">
                            Obrigatório
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          Max: {optionGroup.maxOptions}
                        </Badge>
                      </div>
                      
                      {optionGroup.description && (
                        <p className="text-xs text-gray-600 mb-3">{optionGroup.description}</p>
                      )}
                      
                      <Separator className="my-3" />
                      
                      <div className="space-y-2">
                        <label className="text-xs text-gray-500 uppercase font-medium">
                          Itens ({optionGroup.options.length})
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {optionGroup.options.map((item) => (
                            <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs">
                              <span>{item.name}</span>
                              <span className="font-medium text-green-600">
                                {item.price > 0 ? `+R$ ${item.price.toFixed(2)}` : 'Grátis'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Sem adicionais */}
          {(!product.options || product.options.length === 0) && (
            <div>
              <h3 className="font-medium text-sm text-gray-700 mb-2">Adicionais</h3>
              <Card className="border-dashed">
                <CardContent className="p-4 text-center text-gray-500">
                  <p className="text-sm">Este produto não possui adicionais configurados</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}