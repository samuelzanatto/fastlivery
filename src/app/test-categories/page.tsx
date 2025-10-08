'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createDefaultSupplierCategories } from '@/actions/supplier-categories/supplier-categories'
import { notify } from '@/lib/notifications/notify'

export default function TestCategoriesPage() {
  const [loading, setLoading] = useState(false)

  const handleCreateDefaultCategories = async () => {
    setLoading(true)
    try {
      const result = await createDefaultSupplierCategories()
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar categorias padrão')
      }

      notify('success', `${result.data.count} categorias padrão criadas com sucesso`)
    } catch (error) {
      console.error('Erro ao criar categorias padrão:', error)
      notify('error', error instanceof Error ? error.message : 'Erro ao criar categorias padrão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Teste de Categorias de Supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>Use este botão para criar as categorias padrão do supplier:</p>
            <Button 
              onClick={handleCreateDefaultCategories}
              disabled={loading}
            >
              {loading ? 'Criando...' : 'Criar Categorias Padrão'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}