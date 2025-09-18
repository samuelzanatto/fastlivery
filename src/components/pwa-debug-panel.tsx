'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PWADebugPanelProps {
  restaurantSlug: string
}

export default function PWADebugPanel({ restaurantSlug }: PWADebugPanelProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [criteria, setCriteria] = useState({
    https: false,
    serviceWorker: false,
    manifest: false,
    icons: false,
    display: false,
    engagement: false,
    beforeInstallPrompt: false
  })

  useEffect(() => {
    // Verificar critérios PWA
    const checkCriteria = async () => {
      const newCriteria = {
        https: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
        serviceWorker: 'serviceWorker' in navigator,
        manifest: !!document.querySelector('link[rel="manifest"]'),
        icons: false,
        display: false,
        engagement: false,
        beforeInstallPrompt: false
      }

      // Verificar manifest e ícones
      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement
      if (manifestLink) {
        try {
          const response = await fetch(manifestLink.href)
          const manifest = await response.json()
          
          // Verificar ícones obrigatórios
          const has192 = manifest.icons?.some((icon: { sizes?: string }) => icon.sizes === '192x192')
          const has512 = manifest.icons?.some((icon: { sizes?: string }) => icon.sizes === '512x512')
          newCriteria.icons = has192 && has512
          
          // Verificar display mode
          newCriteria.display = ['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display)
        } catch (error) {
          console.error('[PWA Debug] Erro ao verificar manifest:', error)
        }
      }

      // Verificar service workers registrados
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations()
          newCriteria.serviceWorker = registrations.length > 0
        } catch (error) {
          console.error('[PWA Debug] Erro ao verificar service workers:', error)
        }
      }

      setCriteria(newCriteria)
    }

    checkCriteria()

    // Listener para beforeinstallprompt
    const handleBeforeInstallPrompt = () => {
      setCriteria(prev => ({ ...prev, beforeInstallPrompt: true }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const simulateEngagement = () => {
    // Simular cliques e tempo na página
    console.log('[PWA Debug] Simulando engajamento do usuário...')
    
    // Disparar eventos de clique e interação
    const clickEvent = new MouseEvent('click', { bubbles: true })
    document.body.dispatchEvent(clickEvent)
    
    // Simular tempo na página
    localStorage.setItem(`pwa-engagement-${restaurantSlug}`, Date.now().toString())
    
    setCriteria(prev => ({ ...prev, engagement: true }))
  }

  const clearDismissed = () => {
    localStorage.removeItem(`pwa-dismissed-${restaurantSlug}`)
    console.log('[PWA Debug] Flag de dismissal removida')
  }

  const forceReload = () => {
    window.location.reload()
  }

  if (!isVisible) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-red-100 border-red-300 text-red-700 hover:bg-red-200"
        >
          PWA Debug
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-80">
      <Card className="border-red-300 bg-red-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-red-700 flex justify-between items-center">
            PWA Debug Panel
            <Button
              onClick={() => setIsVisible(false)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-red-500"
            >
              ×
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700">Critérios de Instalação:</h4>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="flex items-center justify-between">
                <span>HTTPS:</span>
                <Badge variant={criteria.https ? "default" : "destructive"} className="text-xs">
                  {criteria.https ? "✓" : "✗"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Service Worker:</span>
                <Badge variant={criteria.serviceWorker ? "default" : "destructive"} className="text-xs">
                  {criteria.serviceWorker ? "✓" : "✗"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Manifest:</span>
                <Badge variant={criteria.manifest ? "default" : "destructive"} className="text-xs">
                  {criteria.manifest ? "✓" : "✗"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Ícones:</span>
                <Badge variant={criteria.icons ? "default" : "destructive"} className="text-xs">
                  {criteria.icons ? "✓" : "✗"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Display:</span>
                <Badge variant={criteria.display ? "default" : "destructive"} className="text-xs">
                  {criteria.display ? "✓" : "✗"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>beforeInstallPrompt:</span>
                <Badge variant={criteria.beforeInstallPrompt ? "default" : "destructive"} className="text-xs">
                  {criteria.beforeInstallPrompt ? "✓" : "✗"}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700">Ações de Debug:</h4>
            <div className="space-y-1">
              <Button
                onClick={simulateEngagement}
                size="sm"
                className="w-full text-xs h-7"
                variant="outline"
              >
                Simular Engajamento
              </Button>
              <Button
                onClick={clearDismissed}
                size="sm"
                className="w-full text-xs h-7"
                variant="outline"
              >
                Limpar Dismissal
              </Button>
              <Button
                onClick={forceReload}
                size="sm"
                className="w-full text-xs h-7"
                variant="outline"
              >
                Recarregar Página
              </Button>
            </div>
          </div>

          <div className="text-xs text-gray-600 border-t pt-2">
            <p>Abra o Console para logs detalhados</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}