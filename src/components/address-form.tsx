'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, MapPin } from 'lucide-react'

interface AddressData {
  cep: string
  street: string
  complement: string
  neighborhood: string
  city: string
  state: string
  fullAddress: string
}

interface AddressFormProps {
  onAddressSelect: (address: AddressData & { number: string; reference?: string }) => void
  onCancel: () => void
}

export function AddressForm({ onAddressSelect, onCancel }: AddressFormProps) {
  const [cep, setCep] = useState('')
  const [addressData, setAddressData] = useState<AddressData | null>(null)
  const [number, setNumber] = useState('')
  const [reference, setReference] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const formatCep = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length <= 8) {
      return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2')
    }
    return cleaned.slice(0, 8).replace(/(\d{5})(\d{3})/, '$1-$2')
  }

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value)
    setCep(formatted)
    
    // Buscar automaticamente quando CEP estiver completo
    if (formatted.length === 9) {
      fetchAddress(formatted)
    } else {
      setAddressData(null)
      setError('')
    }
  }

  const fetchAddress = async (cepValue: string) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/address/cep?cep=${encodeURIComponent(cepValue)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar CEP')
      }

      setAddressData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar CEP')
      setAddressData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (addressData && number) {
      onAddressSelect({
        ...addressData,
        number,
        reference
      })
    }
  }

  const isFormValid = addressData && number.trim()

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-orange-500" />
            <h3 className="font-medium">Adicionar Endereço</h3>
          </div>

          <div>
            <Label htmlFor="cep">CEP</Label>
            <div className="relative">
              <Input
                id="cep"
                value={cep}
                onChange={handleCepChange}
                placeholder="00000-000"
                maxLength={9}
                className="mt-1"
              />
              {isLoading && (
                <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 transform -translate-y-1/2" />
              )}
            </div>
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
          </div>

          {addressData && (
            <>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm font-medium">{addressData.street}</p>
                <p className="text-sm text-gray-600">
                  {addressData.neighborhood}, {addressData.city} - {addressData.state}
                </p>
              </div>

              <div>
                <Label htmlFor="number">Número *</Label>
                <Input
                  id="number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="123"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="reference">Ponto de referência</Label>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Próximo ao shopping, portão azul..."
                  className="mt-1"
                />
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              disabled={!isFormValid}
            >
              Salvar Endereço
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
