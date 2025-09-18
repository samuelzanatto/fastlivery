// Formatadores para inputs
export const formatters = {
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
    // Remove todos os caracteres não numéricos e limita a 8 dígitos
    const numbers = value.replace(/\D/g, '').slice(0, 8)
    
    // Aplica a máscara 12345-678
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

  // Formatar valores monetários
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
