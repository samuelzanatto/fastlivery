import { NextRequest, NextResponse } from 'next/server'

// Rota para interceptar requisições antigas do service worker
export async function GET(_request: NextRequest) {
  // Retorna 404 para service workers antigos
  return new NextResponse('Service Worker não encontrado - PWA foi removido', { 
    status: 404,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Expires': '0'
    }
  })
}