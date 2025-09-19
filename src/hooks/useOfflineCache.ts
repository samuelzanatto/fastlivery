'use client'

import { useState, useEffect, useCallback } from 'react'

interface OfflineData {
  restaurant: Record<string, unknown> | null
  categories: Record<string, unknown>[]
  products: Record<string, unknown>[]
  cachedAt: number
}

interface UseOfflineCacheOptions {
  restaurantSlug: string
  enableOfflineCache?: boolean
  cacheExpiryHours?: number
}

interface UseOfflineCacheReturn {
  isOffline: boolean
  hasOfflineData: boolean
  offlineData: OfflineData | null
  cacheData: (data: Partial<OfflineData>) => Promise<void>
  clearCache: () => Promise<void>
  isStale: boolean
  syncWhenOnline: () => Promise<void>
}

export function useOfflineCache({
  restaurantSlug,
  enableOfflineCache = true,
  cacheExpiryHours = 24
}: UseOfflineCacheOptions): UseOfflineCacheReturn {
  const [isOffline, setIsOffline] = useState(false)
  const [hasOfflineData, setHasOfflineData] = useState(false)
  const [offlineData, setOfflineData] = useState<OfflineData | null>(null)
  const [isStale, setIsStale] = useState(false)

  const cacheKey = `restaurant-cache-${restaurantSlug}`
  const cacheExpiryMs = cacheExpiryHours * 60 * 60 * 1000

  // Verificar conexão
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOffline(!navigator.onLine)
    }

    updateOnlineStatus()
    
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  // Carregar dados do cache ao inicializar
  useEffect(() => {
    if (!enableOfflineCache) return

    const loadCachedData = async () => {
      try {
        if ('indexedDB' in window) {
          // Usar IndexedDB se disponível
          const data = await getFromIndexedDB(cacheKey)
          if (data) {
            setOfflineData(data)
            setHasOfflineData(true)
            
            // Verificar se dados estão velhos
            const isExpired = Date.now() - data.cachedAt > cacheExpiryMs
            setIsStale(isExpired)
          }
        } else {
          // Fallback para localStorage
          const stored = localStorage.getItem(cacheKey)
          if (stored) {
            const data = JSON.parse(stored)
            setOfflineData(data)
            setHasOfflineData(true)
            
            const isExpired = Date.now() - data.cachedAt > cacheExpiryMs
            setIsStale(isExpired)
          }
        }
      } catch (error) {
        console.error('Error loading cached data:', error)
      }
    }

    loadCachedData()
  }, [cacheKey, cacheExpiryMs, enableOfflineCache])

  // Cachear dados
  const cacheData = useCallback(async (data: Partial<OfflineData>) => {
    if (!enableOfflineCache) return

    try {
      const cacheEntry: OfflineData = {
        restaurant: data.restaurant || offlineData?.restaurant || null,
        categories: data.categories || offlineData?.categories || [],
        products: data.products || offlineData?.products || [],
        cachedAt: Date.now()
      }

      if ('indexedDB' in window) {
        await saveToIndexedDB(cacheKey, cacheEntry)
      } else {
        localStorage.setItem(cacheKey, JSON.stringify(cacheEntry))
      }

      setOfflineData(cacheEntry)
      setHasOfflineData(true)
      setIsStale(false)

      console.log(`[Cache] Data cached for restaurant: ${restaurantSlug}`)
    } catch (error) {
      console.error('Error caching data:', error)
    }
  }, [cacheKey, enableOfflineCache, offlineData, restaurantSlug])

  // Limpar cache
  const clearCache = useCallback(async () => {
    try {
      if ('indexedDB' in window) {
        await deleteFromIndexedDB(cacheKey)
      } else {
        localStorage.removeItem(cacheKey)
      }

      setOfflineData(null)
      setHasOfflineData(false)
      setIsStale(false)

      console.log(`[Cache] Cache cleared for restaurant: ${restaurantSlug}`)
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }, [cacheKey, restaurantSlug])

  // Sincronizar quando voltar online
  const syncWhenOnline = useCallback(async () => {
    if (isOffline || !hasOfflineData) return

    try {
      // Tentar buscar dados atualizados da API
      const response = await fetch(`/api/restaurants/${restaurantSlug}/sync`)
      if (response.ok) {
        const freshData = await response.json()
        await cacheData(freshData)
        console.log(`[Cache] Data synced for restaurant: ${restaurantSlug}`)
      }
    } catch (error) {
      console.error('Error syncing data:', error)
    }
  }, [isOffline, hasOfflineData, restaurantSlug, cacheData])

  // Auto-sync quando voltar online
  useEffect(() => {
    if (!isOffline && hasOfflineData && isStale) {
      syncWhenOnline()
    }
  }, [isOffline, hasOfflineData, isStale, syncWhenOnline])

  return {
    isOffline,
    hasOfflineData,
    offlineData,
    cacheData,
    clearCache,
    isStale,
    syncWhenOnline
  }
}

// Helper functions para IndexedDB
async function getFromIndexedDB(key: string): Promise<OfflineData | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ZapliveryCache', 1)
    
    request.onerror = () => reject(request.error)
    
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('restaurants')) {
        db.createObjectStore('restaurants')
      }
    }
    
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['restaurants'], 'readonly')
      const store = transaction.objectStore('restaurants')
      const getRequest = store.get(key)
      
      getRequest.onsuccess = () => {
        resolve(getRequest.result || null)
      }
      
      getRequest.onerror = () => reject(getRequest.error)
    }
  })
}

async function saveToIndexedDB(key: string, data: OfflineData): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ZapliveryCache', 1)
    
    request.onerror = () => reject(request.error)
    
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('restaurants')) {
        db.createObjectStore('restaurants')
      }
    }
    
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['restaurants'], 'readwrite')
      const store = transaction.objectStore('restaurants')
      const putRequest = store.put(data, key)
      
      putRequest.onsuccess = () => resolve()
      putRequest.onerror = () => reject(putRequest.error)
    }
  })
}

async function deleteFromIndexedDB(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ZapliveryCache', 1)
    
    request.onerror = () => reject(request.error)
    
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['restaurants'], 'readwrite')
      const store = transaction.objectStore('restaurants')
      const deleteRequest = store.delete(key)
      
      deleteRequest.onsuccess = () => resolve()
      deleteRequest.onerror = () => reject(deleteRequest.error)
    }
  })
}