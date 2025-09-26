'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, MapPin } from 'lucide-react'
import { notify } from '@/lib/notifications/notify'

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

interface AddressFormBottomSheetProps {
  onSave: (address: AddressFormData) => void
  onCancel: () => void
  initialData?: AddressFormData
  isLoading?: boolean
}

export function AddressFormBottomSheet({ 
  onSave, 
  onCancel, 
  initialData,
  isLoading = false
}: AddressFormBottomSheetProps) {
  const [formData, setFormData] = useState<AddressFormData>({
    street: initialData?.street || '',
    number: initialData?.number || '',
    complement: initialData?.complement || '',
    neighborhood: initialData?.neighborhood || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    zipCode: initialData?.zipCode || '',
    isDefault: initialData?.isDefault || false
  })
  
  const [isLoadingCep, setIsLoadingCep] = useState(false)
  const [cepError, setCepError] = useState('')

  const formatCep = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length <= 8) {
      return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2')
    }
    return cleaned.slice(0, 8).replace(/(\d{5})(\d{3})/, '$1-$2')
  }

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value)
    setFormData(prev => ({ ...prev, zipCode: formatted }))
    setCepError('')
    
    // Buscar automaticamente quando CEP estiver completo
    const cleanCep = formatted.replace(/\D/g, '')
    if (cleanCep.length === 8) {
      setIsLoadingCep(true)
      try {
        const response = await fetch(`/api/address/cep?cep=${cleanCep}`)
        
        if (response.ok) {
          const data = await response.json()
          setFormData(prev => ({
            ...prev,
            street: data.street || '',
            neighborhood: data.neighborhood || '',
            city: data.city || '',
            state: data.state || ''
          }))
          notify('success', 'CEP encontrado!')
        } else {
          const error = await response.json()
          setCepError(error.error || 'CEP não encontrado')
          notify('error', 'CEP não encontrado')
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error)
        setCepError('Erro ao buscar CEP')
  notify('error', 'Erro ao buscar CEP')
      } finally {
        setIsLoadingCep(false)
      }
    }
  }

  const handleInputChange = (field: keyof AddressFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações básicas
    if (!formData.zipCode || !formData.street || !formData.number || 
        !formData.neighborhood || !formData.city || !formData.state) {
  notify('error', 'Preencha todos os campos obrigatórios')
      return
    }

    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
          <MapPin className="w-6 h-6 text-orange-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          {initialData ? 'Editar Endereço' : 'Novo Endereço'}
        </h2>
        <p className="text-sm text-gray-600">
          Preencha as informações do seu endereço
        </p>
      </div>

      {/* CEP */}
      <div>
        <Label htmlFor="zipCode" className="mb-1 block">CEP *</Label>
        <div className="relative">
          <Input
            id="zipCode"
            type="text"
            value={formData.zipCode}
            onChange={handleCepChange}
            placeholder="00000-000"
            maxLength={9}
            className={cepError ? 'border-red-300' : ''}
          />
          {isLoadingCep && (
            <div className="absolute right-3 top-3">
              <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
            </div>
          )}
        </div>
        {cepError && (
          <p className="text-xs text-red-500 mt-1">{cepError}</p>
        )}
      </div>

      {/* Endereço */}
      <div>
        <Label htmlFor="street" className="mb-1 block">Endereço *</Label>
        <Input
          id="street"
          type="text"
          value={formData.street}
          onChange={(e) => handleInputChange('street', e.target.value)}
          placeholder="Rua, Avenida, etc."
        />
      </div>

      {/* Número e Complemento */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="number" className="mb-1 block">Número *</Label>
          <Input
            id="number"
            type="text"
            value={formData.number}
            onChange={(e) => handleInputChange('number', e.target.value)}
            placeholder="123"
          />
        </div>
        <div>
          <Label htmlFor="complement" className="mb-1 block">Complemento</Label>
          <Input
            id="complement"
            type="text"
            value={formData.complement}
            onChange={(e) => handleInputChange('complement', e.target.value)}
            placeholder="Apt, Casa, etc."
          />
        </div>
      </div>

      {/* Bairro */}
      <div>
        <Label htmlFor="neighborhood" className="mb-1 block">Bairro *</Label>
        <Input
          id="neighborhood"
          type="text"
          value={formData.neighborhood}
          onChange={(e) => handleInputChange('neighborhood', e.target.value)}
          placeholder="Nome do bairro"
        />
      </div>

      {/* Cidade e Estado */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city" className="mb-1 block">Cidade *</Label>
          <Input
            id="city"
            type="text"
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            placeholder="Nome da cidade"
          />
        </div>
        <div>
          <Label htmlFor="state" className="mb-1 block">Estado *</Label>
          <Input
            id="state"
            type="text"
            value={formData.state}
            onChange={(e) => handleInputChange('state', e.target.value.toUpperCase())}
            placeholder="SP"
            maxLength={2}
          />
        </div>
      </div>

      {/* Checkbox para endereço padrão */}
      <div className="flex items-center space-x-2 pt-2">
        <input
          type="checkbox"
          id="isDefault"
          checked={formData.isDefault}
          onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
          className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
        />
        <Label htmlFor="isDefault" className="text-sm">
          Definir como endereço principal
        </Label>
      </div>

      {/* Botões */}
      <div className="flex gap-4 pt-6">
        <Button 
          type="button"
          variant="outline" 
          onClick={onCancel} 
          className="flex-1"
          disabled={isLoading}
        >
          Cancelar
        </Button>
        
        <Button 
          type="submit"
          className="flex-1 bg-orange-500 hover:bg-orange-600"
          disabled={isLoading || isLoadingCep}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            'Salvar'
          )}
        </Button>
      </div>
    </form>
  )
}