import { NextRequest, NextResponse } from 'next/server'

export async function POST(_request: NextRequest) {
  try {
    const EVOLUTION_API_BASE_URL = process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080'
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
    
    if (!EVOLUTION_API_KEY) {
      return NextResponse.json({ error: 'Evolution API Key não configurada' }, { status: 500 })
    }

    // Buscar todas as instâncias
    const fetchResponse = await fetch(`${EVOLUTION_API_BASE_URL}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    })

    if (!fetchResponse.ok) {
      return NextResponse.json({ error: 'Erro ao buscar instâncias' }, { status: 500 })
    }

    const instances = await fetchResponse.json()
    console.log(`[WhatsApp Cleanup] Encontradas ${instances.length} instâncias`)

    const results = []
    
    for (const instance of instances) {
      try {
        const deleteResponse = await fetch(`${EVOLUTION_API_BASE_URL}/instance/delete/${instance.name}`, {
          method: 'DELETE',
          headers: {
            'apikey': EVOLUTION_API_KEY,
          },
        })

        if (deleteResponse.ok) {
          console.log(`[WhatsApp Cleanup] Instância ${instance.name} deletada com sucesso`)
          results.push({ instance: instance.name, status: 'deleted' })
        } else {
          console.log(`[WhatsApp Cleanup] Falha ao deletar instância ${instance.name}: ${deleteResponse.status}`)
          results.push({ instance: instance.name, status: 'error', error: deleteResponse.status })
        }
      } catch (error) {
        console.error(`[WhatsApp Cleanup] Erro ao deletar instância ${instance.name}:`, error)
        results.push({ instance: instance.name, status: 'error', error: error instanceof Error ? error.message : 'Erro desconhecido' })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Limpeza concluída. ${results.filter(r => r.status === 'deleted').length} instâncias removidas.`,
      results 
    })

  } catch (error) {
    console.error('[WhatsApp Cleanup] Erro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}