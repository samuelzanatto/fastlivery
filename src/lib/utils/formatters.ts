// Formatadores centralizados para toda a aplicação

// Função para criar slug a partir de string
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

import { getAppUrl } from '@/lib/utils/urls'

// Função para construir URL pública da loja
export function buildPublicStoreUrl(slug: string): string {
  const base = getAppUrl()
  return `${base.replace(/\/$/, '')}/${slug}`
}

// Gerar número de pedido único
export function generateOrderNumber(): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  
  return `${year}${month}${day}${random}`
}

// Gerar QR Code único
export function generateQRCode(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Formatação de moeda brasileira
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

// Formatação de data brasileira
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date)
}

// Formatadores para inputs
export const inputFormatters = {
  // Formatar telefone brasileiro
  phone: (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, (_, area, prefix, suffix) => {
        if (suffix) return `(${area}) ${prefix}-${suffix}`
        if (prefix) return `(${area}) ${prefix}`
        if (area) return `(${area}`
        return ''
      })
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, area, prefix, suffix) => {
        if (suffix) return `(${area}) ${prefix}-${suffix}`
        if (prefix) return `(${area}) ${prefix}`
        if (area) return `(${area}`
        return ''
      })
    }
  },

  // Formatar CEP brasileiro
  cep: (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 8)
    if (numbers.length > 5) {
      return `${numbers.slice(0, 5)}-${numbers.slice(5)}`
    }
    return numbers
  },

  // Formatar CNPJ
  cnpj: (value: string) => {
    const numbers = value.replace(/\D/g, '')
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, a, b, c, d, e) => {
      if (e) return `${a}.${b}.${c}/${d}-${e}`
      if (d) return `${a}.${b}.${c}/${d}`
      if (c) return `${a}.${b}.${c}`
      if (b) return `${a}.${b}`
      return a
    })
  },

  // Formatar CPF
  cpf: (value: string) => {
    const numbers = value.replace(/\D/g, '')
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) => {
      if (d) return `${a}.${b}.${c}-${d}`
      if (c) return `${a}.${b}.${c}`
      if (b) return `${a}.${b}`
      return a
    })
  },

  // Formatar valores monetários para input
  currency: (value: string) => {
    const numbers = value.replace(/\D/g, '')
    const amount = parseFloat(numbers) / 100
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount).replace('R$', '').trim()
  },

  // Apenas números
  numbersOnly: (value: string) => {
    return value.replace(/\D/g, '')
  }
}

// Função para buscar CEP na API dos Correios
export const fetchAddressByCep = async (cep: string) => {
  const cleanCep = cep.replace(/\D/g, '')
  if (cleanCep.length !== 8) {
    throw new Error('CEP deve ter 8 dígitos')
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
    const data = await response.json()
    
    if (data.erro) {
      throw new Error('CEP não encontrado')
    }

    return {
      address: data.logradouro,
      neighborhood: data.bairro,
      city: data.localidade,
      state: data.uf,
      cep: data.cep
    }
  } catch {
    throw new Error('Erro ao buscar endereço')
  }
}

// Hook personalizado para autocomplete de endereço
export const useAddressAutocomplete = () => {
  const searchAddress = async (cep: string) => {
    try {
      return await fetchAddressByCep(cep)
    } catch {
      throw new Error('Erro ao buscar endereço')
    }
  }

  return { searchAddress }
}