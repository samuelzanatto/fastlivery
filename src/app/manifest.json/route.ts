import { NextRequest, NextResponse } from 'next/server'

// Rota para interceptar requisições antigas do manifest PWA
export async function GET(_request: NextRequest) {
  // Retorna 404 para manifest antigo
  return new NextResponse('Manifest não encontrado - PWA foi removido', { 
    status: 404,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Expires': '0'
    }
  })
}