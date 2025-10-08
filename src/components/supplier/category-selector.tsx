"use client"

import { useState, useEffect } from 'react'
import { getSupplierCategoriesHierarchy, getSupplierSubcategories } from '@/actions/supplier-categories/supplier-categories'
import { SupplierCategory } from '@/actions/supplier-categories/supplier-categories'

interface CategorySelectorProps {
  categoryId?: string | null
  subCategoryId?: string | null
  onCategoryChange: (categoryId: string, categoryName: string) => void
  onSubCategoryChange: (subCategoryId: string | null, subCategoryName: string | null) => void
  className?: string
  required?: boolean
}

export function CategorySelector({ 
  categoryId, 
  subCategoryId, 
  onCategoryChange, 
  onSubCategoryChange,
  className = "",
  required = false
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<SupplierCategory[]>([])
  const [subcategories, setSubcategories] = useState<SupplierCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingSubcategories, setLoadingSubcategories] = useState(false)

  // Carregar categorias principais
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await getSupplierCategoriesHierarchy()
        if (result.success) {
          setCategories(result.data)
        }
      } catch (error) {
        console.error('Erro ao carregar categorias:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCategories()
  }, [])

  // Carregar subcategorias quando categoria mudar
  useEffect(() => {
    if (categoryId) {
      const loadSubcategories = async () => {
        setLoadingSubcategories(true)
        try {
          const result = await getSupplierSubcategories(categoryId)
          if (result.success) {
            setSubcategories(result.data)
          }
        } catch (error) {
          console.error('Erro ao carregar subcategorias:', error)
        } finally {
          setLoadingSubcategories(false)
        }
      }

      loadSubcategories()
    } else {
      setSubcategories([])
    }
  }, [categoryId])

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value
    const selectedCategory = categories.find(cat => cat.id === selectedId)
    
    // Sempre reset a subcategoria quando a categoria muda
    onSubCategoryChange(null, null)
    
    if (selectedId && selectedCategory) {
      onCategoryChange(selectedId, selectedCategory.name)
    } else {
      onCategoryChange('', '')
    }
  }

  const handleSubCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value
    const selectedSubCategory = subcategories.find(sub => sub.id === selectedId)
    
    if (selectedId && selectedSubCategory) {
      onSubCategoryChange(selectedId, selectedSubCategory.name)
    } else {
      onSubCategoryChange(null, null)
    }
  }

  if (loading) {
    return (
      <div className={`grid grid-cols-2 gap-4 ${className}`}>
        <div className="space-y-2">
          <label className="text-sm font-medium">Categoria {required && '*'}</label>
          <div className="h-9 border rounded-md bg-gray-50 animate-pulse"></div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Subcategoria</label>
          <div className="h-9 border rounded-md bg-gray-50 animate-pulse"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      <div className="space-y-2">
        <label className="text-sm font-medium">Categoria {required && '*'}</label>
        <select
          value={categoryId || ''}
          onChange={handleCategoryChange}
          className="w-full border rounded-md h-9 px-2 text-sm bg-white"
          required={required}
        >
          <option value="">Selecione uma categoria</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Subcategoria</label>
        <select
          value={subCategoryId || ''}
          onChange={handleSubCategoryChange}
          className="w-full border rounded-md h-9 px-2 text-sm bg-white"
          disabled={!categoryId || loadingSubcategories}
        >
          <option value="">
            {loadingSubcategories ? 'Carregando...' : 'Selecione uma subcategoria'}
          </option>
          {subcategories.map((subcategory) => (
            <option key={subcategory.id} value={subcategory.id}>
              {subcategory.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}