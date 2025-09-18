import { NextRequest, NextResponse } from 'next/server'

interface ViaCepResponse {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cep = searchParams.get('cep')

    if (!cep) {
      return NextResponse.json(
        { error: 'CEP é obrigatório' },
        { status: 400 }
      )
    }

    // Limpar CEP (remover caracteres não numéricos)
    const cleanCep = cep.replace(/\D/g, '')

    // Validar formato do CEP
    if (cleanCep.length !== 8) {
      return NextResponse.json(
        { error: 'CEP deve conter 8 dígitos' },
        { status: 400 }
      )
    }

    // Buscar CEP na API do ViaCEP
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
    
    if (!response.ok) {
      throw new Error('Erro ao consultar CEP')
    }

    const data: ViaCepResponse = await response.json()

    // Verificar se o CEP foi encontrado
    if (data.erro) {
      return NextResponse.json(
        { error: 'CEP não encontrado' },
        { status: 404 }
      )
    }

    // Retornar dados formatados
    return NextResponse.json({
      cep: data.cep,
      street: data.logradouro,
      complement: data.complemento,
      neighborhood: data.bairro,
      city: data.localidade,
      state: data.uf,
      fullAddress: `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`
    })

  } catch (error) {
    console.error('Erro ao buscar CEP:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
