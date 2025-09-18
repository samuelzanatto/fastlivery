export interface SavedAddress {
  id: string
  type: string
  street: string
  neighborhood: string
  city: string
  state: string
  cep: string
  number: string
  reference?: string
  fullAddress: string
}

const ADDRESSES_KEY = 'zaplivery_saved_addresses'

export const addressService = {
  getSavedAddresses: (): SavedAddress[] => {
    if (typeof window === 'undefined') return []
    
    try {
      const stored = localStorage.getItem(ADDRESSES_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Erro ao carregar endereços:', error)
      return []
    }
  },

  saveAddress: (address: Omit<SavedAddress, 'id'>): SavedAddress => {
    const newAddress: SavedAddress = {
      ...address,
      id: `address_${Date.now()}`
    }

    const addresses = addressService.getSavedAddresses()
    const updatedAddresses = [...addresses, newAddress]
    
    try {
      localStorage.setItem(ADDRESSES_KEY, JSON.stringify(updatedAddresses))
    } catch (error) {
      console.error('Erro ao salvar endereço:', error)
    }

    return newAddress
  },

  deleteAddress: (addressId: string): void => {
    const addresses = addressService.getSavedAddresses()
    const filteredAddresses = addresses.filter(addr => addr.id !== addressId)
    
    try {
      localStorage.setItem(ADDRESSES_KEY, JSON.stringify(filteredAddresses))
    } catch (error) {
      console.error('Erro ao deletar endereço:', error)
    }
  },

  updateAddress: (addressId: string, updates: Partial<SavedAddress>): void => {
    const addresses = addressService.getSavedAddresses()
    const updatedAddresses = addresses.map(addr => 
      addr.id === addressId ? { ...addr, ...updates } : addr
    )
    
    try {
      localStorage.setItem(ADDRESSES_KEY, JSON.stringify(updatedAddresses))
    } catch (error) {
      console.error('Erro ao atualizar endereço:', error)
    }
  }
}
