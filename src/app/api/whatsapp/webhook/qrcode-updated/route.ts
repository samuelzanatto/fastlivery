import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const instanceName = body.instance || 'unknown'
    
    console.log(`[WhatsApp Webhook QR] Webhook órfão recebido para instância: ${instanceName}`)
    
    // Tentar deletar a instância órfã automaticamente
    if (instanceName !== 'unknown') {
      try {
        const EVOLUTION_API_BASE_URL = process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080'
        const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
        
        if (EVOLUTION_API_KEY) {
          const deleteResponse = await fetch(`${EVOLUTION_API_BASE_URL}/instance/delete/${instanceName}`, {
            method: 'DELETE',
            headers: {
              'apikey': EVOLUTION_API_KEY,
            },
          })
          
          if (deleteResponse.ok) {
            console.log(`[WhatsApp Webhook QR] Instância órfã ${instanceName} deletada com sucesso`)
          } else {
            console.log(`[WhatsApp Webhook QR] Falha ao deletar instância órfã ${instanceName}: ${deleteResponse.status}`)
          }
        }
      } catch (deleteError) {
        console.log(`[WhatsApp Webhook QR] Erro ao tentar deletar instância órfã: ${deleteError}`)
      }
    }
    
    return NextResponse.json({ success: true, message: 'Webhook órfão processado' })

  } catch (error) {
    console.error('[WhatsApp Webhook QR] Erro:', error)
    return NextResponse.json({ success: true, message: 'Webhook órfão processado com erro' })
  }
}