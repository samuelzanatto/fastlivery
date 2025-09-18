"use client"

// Página offline client; metadata removida (mover para layout se necessário)
import { useEffect, useCallback } from 'react'
import { RefreshCw, Wifi, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

// Metadata estática foi removida; poderia ser movida para layout pai.

export default function OfflinePage() {
  // Recarregar automaticamente quando a conexão voltar
  useEffect(() => {
    const handleOnline = () => {
      window.location.reload()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  const handleRetry = useCallback(() => {
    window.location.reload()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {/* Ícone */}
          <div className="relative mb-6">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
              <Wifi className="w-12 h-12 text-gray-400" strokeWidth={1.5} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">✕</span>
            </div>
          </div>

          {/* Título */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Você está offline
          </h1>
          
          {/* Descrição */}
          <p className="text-gray-600 mb-8 leading-relaxed">
            Verifique sua conexão com a internet e tente novamente. 
            Alguns recursos podem ainda estar disponíveis no cache.
          </p>

          {/* Ações */}
          <div className="space-y-3">
            {/* Tentar novamente */}
            <Button 
              onClick={handleRetry} 
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Tentar novamente
            </Button>

            {/* Voltar ao início */}
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link href="/">
                <Home className="w-5 h-5 mr-2" />
                Voltar ao início
              </Link>
            </Button>
          </div>

          {/* Dicas */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">
              💡 Dicas para conectar
            </h3>
            <ul className="text-sm text-blue-800 space-y-1 text-left">
              <li>• Verifique o WiFi ou dados móveis</li>
              <li>• Tente se mover para um local com melhor sinal</li>
              <li>• Reinicie o roteador se necessário</li>
            </ul>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}