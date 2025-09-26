'use client'

import { useState, useEffect } from 'react'
import { PWAHeader } from '@/components/layout/pwa-header'
import { UserProfile } from '@/components/profile/unified-user-profile'
import { AddressFormBottomSheet } from '@/components/forms/address-form-bottom-sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { 
  MapPin,
  Plus,
  Edit,
  Trash2,
  Heart,
  Home,
  Building2
} from 'lucide-react'
import { notify } from '@/lib/notifications/notify'

interface Address {
  id: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

interface AddressFormData {
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
  isDefault?: boolean
}

export default function EnderecosPage() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Carregar endereços da API
  const loadAddresses = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/customer/addresses')
      
      if (response.ok) {
        const data = await response.json()
        setAddresses(data.addresses || [])
      } else {
  notify('error', 'Erro ao carregar endereços')
      }
    } catch (error) {
      console.error('Erro ao carregar endereços:', error)
  notify('error', 'Erro ao carregar endereços')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAddresses()
  }, [])

  // Salvar endereço (criar ou editar)
  const handleSaveAddress = async (addressData: AddressFormData) => {
    try {
      setIsSaving(true)
      
      if (editingAddress) {
        // Atualizar endereço existente
        const response = await fetch(`/api/customer/addresses/${editingAddress.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(addressData)
        })
        
        if (response.ok) {
          notify('success', 'Endereço atualizado com sucesso!')
          await loadAddresses()
        } else {
          const error = await response.json()
          notify('error', error.error || 'Erro ao atualizar endereço')
        }
      } else {
        // Criar novo endereço
        const response = await fetch('/api/customer/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(addressData)
        })
        
        if (response.ok) {
          notify('success', 'Endereço adicionado com sucesso!')
          await loadAddresses()
        } else {
          const error = await response.json()
          notify('error', error.error || 'Erro ao adicionar endereço')
        }
      }
      
      setIsSheetOpen(false)
      setEditingAddress(null)
    } catch (error) {
      console.error('Erro ao salvar endereço:', error)
  notify('error', 'Erro ao salvar endereço')
    } finally {
      setIsSaving(false)
    }
  }

  // Definir endereço como principal
  const handleSetDefault = async (addressId: string) => {
    try {
      const response = await fetch(`/api/customer/addresses/${addressId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
  notify('success', 'Endereço principal definido!')
        await loadAddresses()
      } else {
        const error = await response.json()
  notify('error', error.error || 'Erro ao definir endereço principal')
      }
    } catch (error) {
      console.error('Erro ao definir endereço principal:', error)
  notify('error', 'Erro ao definir endereço principal')
    }
  }

  // Excluir endereço
  const handleDelete = async (addressId: string) => {
    if (!confirm('Tem certeza que deseja excluir este endereço?')) {
      return
    }

    try {
      const response = await fetch(`/api/customer/addresses/${addressId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
  notify('success', 'Endereço excluído com sucesso!')
        await loadAddresses()
      } else {
        const error = await response.json()
  notify('error', error.error || 'Erro ao excluir endereço')
      }
    } catch (error) {
      console.error('Erro ao excluir endereço:', error)
  notify('error', 'Erro ao excluir endereço')
    }
  }

  // Editar endereço
  const handleEdit = (address: Address) => {
    setEditingAddress(address)
    setIsSheetOpen(true)
  }

  // Adicionar novo endereço
  const handleAddNew = () => {
    setEditingAddress(null)
    setIsSheetOpen(true)
  }

  // Fechar sheet
  const handleCloseSheet = () => {
    setIsSheetOpen(false)
    setEditingAddress(null)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PWAHeader title="Meus Endereços" showBackButton={true} noBorder={true} className="lg:hidden" />
        <div className="container mx-auto px-4 pt-20 lg:pt-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-4">
      <PWAHeader title="Meus Endereços" showBackButton={true} noBorder={true} className="lg:hidden" />
      
      <div className="container mx-auto px-4 pt-20 lg:pt-8">
        {/* Botão Adicionar Novo Endereço - só aparece quando há endereços */}
        {addresses.length > 0 && (
          <div className="mb-6">
            <div className="bg-white border-2 border-dashed border-orange-200 rounded-xl hover:border-orange-300 hover:bg-orange-50/20 transition-colors">
              <Button 
                variant="ghost" 
                className="w-full h-20 text-orange-600 hover:text-orange-700 hover:bg-transparent"
                onClick={handleAddNew}
              >
                <Plus className="h-6 w-6 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Adicionar novo endereço</div>
                  <div className="text-sm text-orange-500">Facilite suas entregas futuras</div>
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* Lista de Endereços */}
        {addresses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-10 w-10 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Nenhum endereço cadastrado
            </h3>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">
              Adicione um endereço para facilitar suas entregas e ter uma experiência mais rápida
            </p>
            <Button 
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleAddNew}
            >
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar primeiro endereço
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <div key={address.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Ícone */}
                  <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    {address.complement?.toLowerCase().includes('casa') || address.complement?.toLowerCase().includes('residência') ? (
                      <Home className="w-6 h-6 text-orange-600" />
                    ) : address.complement?.toLowerCase().includes('trabalho') || address.complement?.toLowerCase().includes('escritório') ? (
                      <Building2 className="w-6 h-6 text-orange-600" />
                    ) : (
                      <MapPin className="w-6 h-6 text-orange-600" />
                    )}
                  </div>
                  
                  {/* Informações do Endereço */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {address.street}, {address.number}
                      </h3>
                      {address.isDefault && (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                          Principal
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      {address.complement && (
                        <p className="text-sm text-gray-600">
                          {address.complement}
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        {address.neighborhood} • {address.city}, {address.state}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">
                        CEP: {address.zipCode.replace(/(\d{5})(\d{3})/, '$1-$2')}
                      </p>
                    </div>
                  </div>
                  
                  {/* Ações */}
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                      onClick={() => handleEdit(address)}
                    >
                      <Edit className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(address.id)}
                      className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
                    </Button>
                  </div>
                </div>
                
                {/* Botão Definir como Principal */}
                {!address.isDefault && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleSetDefault(address.id)}
                      className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-8"
                    >
                      <Heart className="h-3 w-3 mr-2" />
                      Definir como principal
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Sheet para Formulário */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent 
          side="bottom" 
          className="h-[90vh] max-h-[90vh] rounded-t-3xl border-0 shadow-2xl"
          style={{ 
            height: 'min(90vh, 90dvh)', 
            maxHeight: 'min(90vh, 90dvh)',
            // Força posicionamento fixo para evitar movimento com teclado
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            top: 'unset',
            transform: 'translateX(0) translateY(0)',
            // CSS adicional para iOS
            WebkitTransform: 'translateX(0) translateY(0)',
            // Previne redimensionamento
            resize: 'none',
            // Z-index alto para garantir que fique acima
            zIndex: 9999
          }}
          onOpenAutoFocus={(e) => {
            // Previne auto-focus que pode triggerar o teclado
            e.preventDefault()
          }}
        >
          <VisuallyHidden>
            <SheetTitle>
              {editingAddress ? 'Editar Endereço' : 'Adicionar Novo Endereço'}
            </SheetTitle>
          </VisuallyHidden>
          <AddressFormBottomSheet
            onSave={handleSaveAddress}
            onCancel={handleCloseSheet}
            initialData={editingAddress ? {
              street: editingAddress.street,
              number: editingAddress.number,
              complement: editingAddress.complement || '',
              neighborhood: editingAddress.neighborhood,
              city: editingAddress.city,
              state: editingAddress.state,
              zipCode: editingAddress.zipCode,
              isDefault: editingAddress.isDefault
            } : undefined}
            isLoading={isSaving}
          />
        </SheetContent>
      </Sheet>

      {/* User Profile Sheet - Global */}
      <UserProfile mode="sheet" readOnly />
    </div>
  )
}
