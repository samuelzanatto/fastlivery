'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { X, Download, Smartphone, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface PWAInstallPromptProps {
  restaurantName: string
  restaurantSlug: string
  iconUrl?: string
  className?: string
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export default function PWAInstallPrompt({
  restaurantName,
  restaurantSlug,
  iconUrl,
  className
}: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installMethod, setInstallMethod] = useState<'native' | 'manual' | null>(null)
  const [deviceType, setDeviceType] = useState<'desktop' | 'mobile' | 'tablet'>('desktop')

  useEffect(() => {
    // Detectar tipo de dispositivo
    const userAgent = navigator.userAgent.toLowerCase()
    if (/tablet|ipad/.test(userAgent)) {
      setDeviceType('tablet')
    } else if (/mobile|phone|android|iphone/.test(userAgent)) {
      setDeviceType('mobile')
    } else {
      setDeviceType('desktop')
    }

    // Verificar se já está instalado
    const checkIfInstalled = () => {
      // Verificar standalone mode (já instalado)
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        console.log('[PWA] App já instalado - display-mode: standalone')
        setIsInstalled(true)
        return
      }

      // Verificar navigator.standalone (iOS)
      if ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone) {
        console.log('[PWA] App já instalado - navigator.standalone')
        setIsInstalled(true)
        return
      }

      console.log('[PWA] App não está instalado')
    }

    // Log dos critérios PWA
    const logPWACriteria = () => {
      console.log('[PWA] Verificando critérios de instalação:')
      console.log('- HTTPS:', window.location.protocol === 'https:' || window.location.hostname === 'localhost')
      console.log('- Service Worker:', 'serviceWorker' in navigator)
      console.log('- Manifest:', document.querySelector('link[rel="manifest"]'))
      console.log('- Display mode:', window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser')
      console.log('- User agent:', navigator.userAgent)
      
      // Verificar se service worker está registrado
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          console.log('[PWA] Service Workers registrados:', registrations.length)
          registrations.forEach((registration, index) => {
            console.log(`[PWA] SW ${index + 1}:`, registration.scope)
          })
        })
      }
    }

    checkIfInstalled()
    logPWACriteria()

    // Listener para beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] beforeinstallprompt event fired!', e)
      
      // Prevenir o prompt padrão do browser
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setInstallMethod('native')
      
      console.log('[PWA] Prompt nativo disponível, aguardando engajamento do usuário...')
      
      // Mostrar prompt após 3 segundos se não foi dismissado
      setTimeout(() => {
        const dismissed = localStorage.getItem(`pwa-dismissed-${restaurantSlug}`)
        const dismissedTime = dismissed ? parseInt(dismissed) : 0
        const now = Date.now()
        
        // Verificar se passou o tempo de dismiss (24h)
        if (!dismissed || now > dismissedTime) {
          if (!isInstalled) {
            console.log('[PWA] Mostrando prompt de instalação')
            setShowPrompt(true)
          }
        } else {
          console.log('[PWA] Prompt dismissado recentemente, não mostrando')
        }
      }, 3000)
    }

    // Listener para app instalado
    const handleAppInstalled = () => {
      console.log('[PWA] App instalado com sucesso!')
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
      
      // Remover flag de dismissed
      localStorage.removeItem(`pwa-dismissed-${restaurantSlug}`)
      
      // Log da instalação
      console.log('[PWA] App instalado para:', restaurantName)
    }

    // Adicionar listener para verificar se beforeinstallprompt será disparado
    let beforeInstallPromptFired = false
    const checkPromptSupport = () => {
      setTimeout(() => {
        if (!beforeInstallPromptFired) {
          console.log('[PWA] beforeinstallprompt não foi disparado após 5s')
          console.log('[PWA] Possíveis razões:')
          console.log('- App já instalado')
          console.log('- Critérios de instalação não atendidos')
          console.log('- Navegador não suporta (Safari, Firefox)')
          console.log('- Engajamento insuficiente (< 30s ou sem cliques)')
          console.log('- Service worker não registrado')
        }
      }, 5000)
    }

    // Registrar event listeners
    window.addEventListener('beforeinstallprompt', (e) => {
      beforeInstallPromptFired = true
      handleBeforeInstallPrompt(e)
    })
    window.addEventListener('appinstalled', handleAppInstalled)

    // Verificar suporte após um delay
    checkPromptSupport()

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [restaurantSlug, isInstalled, restaurantName])

  // Verificar se deve mostrar prompt manual para dispositivos sem suporte nativo
  useEffect(() => {
    if (!deferredPrompt && !showPrompt && !isInstalled) {
      // Verificar se é iOS ou outro browser que não suporta beforeinstallprompt
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
      const isFirefox = /Firefox/.test(navigator.userAgent)
      
      console.log('[PWA] Verificando navegadores sem beforeinstallprompt:', {
        isIOS,
        isSafari,
        isFirefox,
        deviceType
      })
      
      if (isIOS || isSafari || isFirefox || (deviceType !== 'desktop' && !deferredPrompt)) {
        console.log('[PWA] Navegador detectado que requer instalação manual')
        setInstallMethod('manual')
        
        setTimeout(() => {
          const dismissed = localStorage.getItem(`pwa-dismissed-${restaurantSlug}`)
          const dismissedTime = dismissed ? parseInt(dismissed) : 0
          const now = Date.now()
          
          if (!dismissed || now > dismissedTime) {
            console.log('[PWA] Mostrando prompt manual após delay')
            setShowPrompt(true)
          }
        }, 8000) // Delay maior para navegadores sem beforeinstallprompt
      } else {
        console.log('[PWA] Aguardando beforeinstallprompt ou verificando critérios...')
      }
    }
  }, [deferredPrompt, showPrompt, deviceType, restaurantSlug, isInstalled])

  // Não mostrar se já instalado
  if (isInstalled) {
    return null
  }

  const handleInstallClick = async () => {
    console.log('[PWA] Usuário clicou para instalar:', installMethod)
    
    if (installMethod === 'native' && deferredPrompt) {
      try {
        console.log('[PWA] Disparando prompt nativo...')
        await deferredPrompt.prompt()
        
        const { outcome } = await deferredPrompt.userChoice
        console.log('[PWA] Resultado do prompt:', outcome)
        
        if (outcome === 'accepted') {
          console.log('[PWA] Usuário aceitou instalação')
        } else {
          console.log('[PWA] Usuário rejeitou instalação')
        }
        
        setDeferredPrompt(null)
        setShowPrompt(false)
      } catch (error) {
        console.error('[PWA] Erro ao mostrar prompt:', error)
      }
    } else {
      console.log('[PWA] Mostrando instruções manuais')
      // Mostrar instruções manuais
      setInstallMethod('manual')
    }
  }

  const handleDismiss = () => {
    console.log('[PWA] Usuário dismissou prompt')
    setShowPrompt(false)
    
    // Salvar que foi dismissado por 24h
    const dismissedUntil = Date.now() + (24 * 60 * 60 * 1000)
    localStorage.setItem(`pwa-dismissed-${restaurantSlug}`, dismissedUntil.toString())
    
    console.log('[PWA] Prompt dismissado até:', new Date(dismissedUntil).toLocaleString())
  }

  const getInstallInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/.test(navigator.userAgent)
    
    if (isIOS) {
      return {
        icon: <Smartphone className="h-6 w-6" />,
        title: 'Adicionar à Tela Inicial',
        steps: [
          'Toque no botão de compartilhar na parte inferior da tela',
          'Role para baixo e toque em "Adicionar à Tela Inicial"',
          'Toque em "Adicionar" para instalar o app'
        ]
      }
    }
    
    if (isAndroid) {
      return {
        icon: <Smartphone className="h-6 w-6" />,
        title: 'Instalar App',
        steps: [
          'Toque no menu (⋮) do navegador',
          'Selecione "Adicionar à tela inicial" ou "Instalar app"',
          'Confirme a instalação'
        ]
      }
    }

    return {
      icon: <Monitor className="h-6 w-6" />,
      title: 'Instalar App',
      steps: [
        'Clique no ícone de instalação na barra de endereços',
        'Ou use o menu do navegador > "Instalar app"',
        'Confirme a instalação'
      ]
    }
  }

  if (!showPrompt) return null

  const instructions = installMethod === 'manual' ? getInstallInstructions() : null

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center",
      "bg-black/50 backdrop-blur-sm",
      className
    )}>
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              {iconUrl ? (
                <Image 
                  src={iconUrl}
                  alt={`${restaurantName} logo`}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-xl object-cover"
                />
              ) : (
                <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    {restaurantName.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  Instalar {restaurantName}
                </h3>
                <p className="text-sm text-gray-600">
                  Acesso rápido como um app nativo
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {installMethod === 'manual' && instructions ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-blue-600">
                {instructions.icon}
                <span className="font-medium">{instructions.title}</span>
              </div>
              
              <ol className="space-y-2 text-sm text-gray-700">
                {instructions.steps.map((step, index) => (
                  <li key={index} className="flex space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              
              <div className="flex space-x-2 pt-2">
                <Button onClick={handleDismiss} variant="outline" className="flex-1">
                  Agora não
                </Button>
                <Button onClick={handleDismiss} className="flex-1">
                  Entendi
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <Download className="h-8 w-8 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    Instale o app para acesso rápido, notificações e funcionamento offline.
                  </p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button 
                  onClick={handleDismiss} 
                  variant="outline" 
                  className="flex-1"
                >
                  Agora não
                </Button>
                <Button 
                  onClick={handleInstallClick}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Instalar App
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}