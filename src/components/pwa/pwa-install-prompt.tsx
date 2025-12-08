'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  X, 
  Bell, 
  BellOff,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Share
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePushNotifications } from '@/hooks/use-push-notifications'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAInstallPromptProps {
  businessId: string
  businessName: string
  userId?: string
  vapidPublicKey: string
  variant?: 'banner' | 'card' | 'button'
  className?: string
  showNotificationToggle?: boolean
  onInstall?: () => void
  onDismiss?: () => void
}

export function PWAInstallPrompt({
  businessId,
  businessName,
  userId,
  vapidPublicKey,
  variant = 'banner',
  className,
  showNotificationToggle = true,
  onInstall,
  onDismiss
}: PWAInstallPromptProps) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)

  const {
    isSupported: pushSupported,
    permission: notificationPermission,
    isSubscribed,
    isLoading: pushLoading,
    error: pushError,
    canRequestPermission,
    subscribe,
    unsubscribe
  } = usePushNotifications({
    businessId,
    userId,
    vapidPublicKey
  })

  // Detecta iOS
  useEffect(() => {
    const ua = navigator.userAgent
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(isIOSDevice)
  }, [])

  // Registra Service Worker automaticamente (necessário para PWA)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      }).then((registration) => {
        console.log('[PWA] Service Worker registrado:', registration.scope)
      }).catch((error) => {
        console.error('[PWA] Erro ao registrar Service Worker:', error)
      })
    }
  }, [])

  // Verifica se já está instalado
  useEffect(() => {
    const checkInstalled = () => {
      // PWA standalone mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      // iOS standalone
      const isIOSStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
      
      setIsInstalled(isStandalone || isIOSStandalone)
    }

    checkInstalled()
    
    // Escuta mudanças no display mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    mediaQuery.addEventListener('change', checkInstalled)
    
    return () => mediaQuery.removeEventListener('change', checkInstalled)
  }, [])

  // Captura o evento beforeinstallprompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    
    // Detecta quando foi instalado
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setInstallPrompt(null)
      setShowBanner(false)
      onInstall?.()
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [onInstall])

  // Mostra banner após delay (para iOS e também para mostrar opção de notificações)
  useEffect(() => {
    // Não mostra se já está instalado
    if (isInstalled) return
    
    // Mostra banner após 2 segundos
    const timer = setTimeout(() => {
      setShowBanner(true)
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [isInstalled])

  const handleInstall = useCallback(async () => {
    if (installPrompt) {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null)
        setShowBanner(false)
        onInstall?.()
      }
    } else if (isIOS) {
      setShowIOSInstructions(true)
    }
  }, [installPrompt, isIOS, onInstall])

  const handleDismiss = useCallback(() => {
    setShowBanner(false)
    onDismiss?.()
  }, [onDismiss])

  const handleNotificationToggle = useCallback(async () => {
    if (isSubscribed) {
      await unsubscribe()
    } else {
      await subscribe()
    }
  }, [isSubscribed, subscribe, unsubscribe])

  // Se já instalado e não tem opção de notificação, não mostra nada
  if (isInstalled && !showNotificationToggle) {
    return null
  }

  // Componente de botão simples
  if (variant === 'button') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {!isInstalled && (installPrompt || isIOS) && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleInstall}
          >
            <Download className="w-4 h-4 mr-2" />
            Instalar App
          </Button>
        )}
        
        {showNotificationToggle && pushSupported && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleNotificationToggle}
            disabled={pushLoading || !canRequestPermission}
          >
            {isSubscribed ? (
              <>
                <BellOff className="w-4 h-4 mr-2" />
                Desativar
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Notificações
              </>
            )}
          </Button>
        )}
      </div>
    )
  }

  // Se não tem nada para mostrar
  if (!showBanner && isInstalled) {
    // Mostra apenas toggle de notificações se instalado
    if (showNotificationToggle && pushSupported) {
      return (
        <div className={cn('flex items-center justify-between p-3 bg-muted rounded-lg', className)}>
          <div className="flex items-center gap-2">
            {isSubscribed ? (
              <Bell className="w-5 h-5 text-primary" />
            ) : (
              <BellOff className="w-5 h-5 text-muted-foreground" />
            )}
            <span className="text-sm">
              {isSubscribed ? 'Notificações ativadas' : 'Ative as notificações'}
            </span>
          </div>
          <Button
            variant={isSubscribed ? 'outline' : 'default'}
            size="sm"
            onClick={handleNotificationToggle}
            disabled={pushLoading || !canRequestPermission}
          >
            {isSubscribed ? 'Desativar' : 'Ativar'}
          </Button>
        </div>
      )
    }
    return null
  }

  // Banner inferior
  if (variant === 'banner') {
    if (!showBanner) return null

    return (
      <>
        {/* Banner de instalação */}
        <div 
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-lg',
            'animate-in slide-in-from-bottom duration-300',
            className
          )}
        >
          <div className="max-w-lg mx-auto">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-primary-foreground" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">
                    Instalar {businessName}
                  </h3>
                  {isInstalled && (
                    <Badge variant="secondary" className="shrink-0">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Instalado
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {isIOS 
                    ? 'Adicione à tela inicial para acesso rápido'
                    : 'Instale para receber notificações de pedidos'
                  }
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 -mt-1 -mr-2"
                onClick={handleDismiss}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2 mt-3">
              {!isInstalled && (
                <Button 
                  className="flex-1"
                  onClick={handleInstall}
                >
                  {isIOS ? (
                    <>
                      <Share className="w-4 h-4 mr-2" />
                      Como instalar
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Instalar
                    </>
                  )}
                </Button>
              )}
              
              {showNotificationToggle && pushSupported && (
                <Button 
                  variant={isInstalled ? 'default' : 'outline'}
                  className={isInstalled ? 'flex-1' : ''}
                  onClick={handleNotificationToggle}
                  disabled={pushLoading || !canRequestPermission}
                >
                  {isSubscribed ? (
                    <>
                      <BellOff className="w-4 h-4 mr-2" />
                      Notificações ativas
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      {isInstalled ? 'Ativar notificações' : 'Notificações'}
                    </>
                  )}
                </Button>
              )}
            </div>

            {pushError && (
              <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {pushError}
              </div>
            )}
          </div>
        </div>

        {/* Modal de instruções iOS */}
        {showIOSInstructions && (
          <div 
            className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center p-4"
            onClick={() => setShowIOSInstructions(false)}
          >
            <Card 
              className="w-full max-w-md animate-in slide-in-from-bottom"
              onClick={e => e.stopPropagation()}
            >
              <CardHeader>
                <CardTitle>Como instalar no iOS</CardTitle>
                <CardDescription>
                  Siga os passos abaixo para adicionar à tela inicial
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Toque no botão Compartilhar</p>
                    <p className="text-sm text-muted-foreground">
                      Na barra inferior do Safari, toque no ícone <Share className="w-4 h-4 inline" />
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Adicionar à Tela de Início</p>
                    <p className="text-sm text-muted-foreground">
                      Role a lista e toque em &quot;Adicionar à Tela de Início&quot;
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Confirme a instalação</p>
                    <p className="text-sm text-muted-foreground">
                      Toque em &quot;Adicionar&quot; no canto superior direito
                    </p>
                  </div>
                </div>

                <Button 
                  className="w-full mt-4" 
                  onClick={() => setShowIOSInstructions(false)}
                >
                  Entendi
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </>
    )
  }

  // Card (para exibição inline)
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">
                Instalar {businessName}
              </CardTitle>
              <CardDescription>
                Acesso rápido com notificações
              </CardDescription>
            </div>
          </div>
          {isInstalled && (
            <Badge variant="secondary">
              <CheckCircle className="w-3 h-3 mr-1" />
              Instalado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          {!isInstalled && (installPrompt || isIOS) && (
            <Button 
              size="sm"
              className="flex-1"
              onClick={handleInstall}
            >
              <Download className="w-4 h-4 mr-2" />
              Instalar
            </Button>
          )}
          
          {showNotificationToggle && pushSupported && (
            <Button 
              size="sm"
              variant={isInstalled && !isSubscribed ? 'default' : 'outline'}
              className="flex-1"
              onClick={handleNotificationToggle}
              disabled={pushLoading || !canRequestPermission}
            >
              {isSubscribed ? (
                <>
                  <BellOff className="w-4 h-4 mr-2" />
                  Desativar
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Notificações
                </>
              )}
            </Button>
          )}
        </div>

        {pushError && (
          <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            {pushError}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
