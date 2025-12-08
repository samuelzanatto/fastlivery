'use client'

import { useEffect } from 'react'

/**
 * Componente que apenas registra o Service Worker para habilitar PWA.
 * O prompt de instalação nativo do navegador será exibido automaticamente
 * quando os critérios de PWA forem atendidos (manifest + service worker + HTTPS).
 */
export function PWAServiceWorker() {
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

  // Não renderiza nada - apenas registra o SW
  return null
}
