import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest) {
  const serviceWorkerScript = `
// Service Worker PWA Dinâmico - ZapLivery
// Versão: 1.0.0

import {
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
  NetworkOnly
} from 'workbox-strategies';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim, skipWaiting } from 'workbox-core';

// Configurações
const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE_NAME = \`zaplivery-static-\${CACHE_VERSION}\`;
const DYNAMIC_CACHE_NAME = \`zaplivery-dynamic-\${CACHE_VERSION}\`;
const OFFLINE_PAGE = '/offline';

// Claim clients e skip waiting
clientsClaim();
skipWaiting();

// Limpar caches antigos
cleanupOutdatedCaches();

// Precache recursos essenciais
precacheAndRoute(self.__WB_MANIFEST || []);

// === ESTRATÉGIAS DE CACHE POR TIPO ===

// 1. Documentos HTML - Network First com fallback offline
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: \`\${DYNAMIC_CACHE_NAME}-pages\`,
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request, mode }) => {
          // Cache por slug de restaurante
          const url = new URL(request.url);
          const slug = url.pathname.split('/')[1];
          return slug ? \`\${request.url}-\${slug}\` : request.url;
        },
        cacheWillUpdate: async ({ response }) => {
          return response.status === 200;
        },
        requestWillFetch: async ({ request }) => {
          // Adicionar header para identificar SW
          const headers = new Headers(request.headers);
          headers.set('X-Requested-With', 'ServiceWorker');
          return new Request(request, { headers });
        }
      }
    ],
    networkTimeoutSeconds: 3,
  })
);

// 2. API Routes - Network First com cache curto
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: \`\${DYNAMIC_CACHE_NAME}-api\`,
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          const url = new URL(request.url);
          // Separar cache por restaurante
          const slug = url.pathname.split('/')[2];
          return slug ? \`\${request.url}-\${slug}\` : request.url;
        },
        cacheWillUpdate: async ({ response }) => {
          // Cache apenas respostas de sucesso
          return response.status === 200 && response.headers.get('content-type')?.includes('application/json');
        }
      }
    ],
    networkTimeoutSeconds: 5,
  })
);

// 3. Manifests PWA - Stale While Revalidate
registerRoute(
  ({ url }) => url.pathname.includes('/manifest.json'),
  new StaleWhileRevalidate({
    cacheName: \`\${DYNAMIC_CACHE_NAME}-manifest\`,
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          // Cache separado por restaurante
          const url = new URL(request.url);
          const slug = url.pathname.split('/')[2];
          return \`manifest-\${slug || 'default'}\`;
        }
      }
    ]
  })
);

// 4. Ícones PWA - Cache First com longa duração
registerRoute(
  ({ url }) => url.pathname.includes('/pwa-icon'),
  new CacheFirst({
    cacheName: \`\${STATIC_CACHE_NAME}-pwa-icons\`,
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          const url = new URL(request.url);
          const slug = url.pathname.split('/')[2];
          const size = url.searchParams.get('size');
          return \`icon-\${slug}-\${size}\`;
        },
        cacheWillUpdate: async ({ response }) => {
          return response.status === 200 && response.headers.get('content-type')?.includes('image');
        }
      }
    ]
  })
);

// 5. Imagens dos restaurantes - Cache First
registerRoute(
  ({ url }) => {
    return url.pathname.startsWith('/uploads/') || 
           url.pathname.includes('restaurant_logo') ||
           url.pathname.includes('restaurant_banner') ||
           url.pathname.includes('product_image') ||
           url.pathname.includes('category_image');
  },
  new CacheFirst({
    cacheName: \`\${STATIC_CACHE_NAME}-images\`,
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          // Organizar cache por tipo de imagem
          const url = new URL(request.url);
          const pathParts = url.pathname.split('/');
          const type = pathParts.includes('restaurant_logo') ? 'logos' :
                      pathParts.includes('restaurant_banner') ? 'banners' :
                      pathParts.includes('product_image') ? 'products' :
                      pathParts.includes('category_image') ? 'categories' : 'misc';
          
          return \`\${type}-\${url.pathname}\`;
        }
      }
    ]
  })
);

// 6. Assets estáticos - Cache First com longa duração
registerRoute(
  ({ request }) => request.destination === 'style' || 
                   request.destination === 'script' || 
                   request.destination === 'font',
  new CacheFirst({
    cacheName: \`\${STATIC_CACHE_NAME}-assets\`,
    plugins: [
      {
        cacheWillUpdate: async ({ response }) => {
          return response.status === 200;
        }
      }
    ]
  })
);

// === ESTRATÉGIAS OFFLINE ===

// Offline fallback para páginas
const navigationHandler = async (params) => {
  try {
    // Tentar buscar da rede primeiro
    return await new NetworkFirst({
      cacheName: \`\${DYNAMIC_CACHE_NAME}-pages\`,
      networkTimeoutSeconds: 3,
    }).handle(params);
  } catch (error) {
    // Se falhar, tentar página offline
    const cache = await caches.open(\`\${DYNAMIC_CACHE_NAME}-pages\`);
    const offlineResponse = await cache.match(OFFLINE_PAGE);
    
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Fallback final - página offline básica
    return new Response(
      \`<!DOCTYPE html>
      <html>
        <head>
          <title>Offline - ZapLivery</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui, sans-serif; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0; 
              background: #f9fafb; 
              color: #374151; 
            }
            .offline-content { 
              text-align: center; 
              max-width: 400px; 
              padding: 2rem; 
            }
            .icon { 
              font-size: 4rem; 
              margin-bottom: 1rem; 
            }
            h1 { 
              color: #1f2937; 
              margin-bottom: 0.5rem; 
            }
            p { 
              margin-bottom: 2rem; 
              line-height: 1.5; 
            }
            button { 
              background: #3b82f6; 
              color: white; 
              border: none; 
              padding: 0.75rem 1.5rem; 
              border-radius: 0.5rem; 
              cursor: pointer; 
              font-size: 1rem; 
            }
            button:hover { 
              background: #2563eb; 
            }
          </style>
        </head>
        <body>
          <div class="offline-content">
            <div class="icon">📱</div>
            <h1>Você está offline</h1>
            <p>Verifique sua conexão com a internet e tente novamente.</p>
            <button onclick="window.location.reload()">Tentar novamente</button>
          </div>
        </body>
      </html>\`,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }
};

// Registrar handler de navegação
registerRoute(
  new NavigationRoute(navigationHandler, {
    allowlist: [/^(?!\\/api\\/)/],
  })
);

// === EVENTOS DO SERVICE WORKER ===

// Evento de instalação
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching app shell');
      return cache.addAll([
        '/',
        '/offline',
        '/manifest.json'
      ]);
    })
  );
});

// Evento de ativação
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && 
              cacheName !== DYNAMIC_CACHE_NAME && 
              !cacheName.includes(CACHE_VERSION)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync para pedidos offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-orders') {
    event.waitUntil(
      // Implementar sincronização de pedidos offline
      syncOfflineOrders()
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      restaurantSlug: data.restaurantSlug
    },
    actions: [
      {
        action: 'view',
        title: 'Ver pedido',
        icon: '/icons/view-action.png'
      },
      {
        action: 'dismiss',
        title: 'Dispensar',
        icon: '/icons/dismiss-action.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Click em notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === 'view' && data.url) {
    event.waitUntil(
      clients.openWindow(data.url)
    );
  } else if (action === 'dismiss') {
    // Apenas fechar
  } else {
    // Click na notificação (sem action)
    event.waitUntil(
      clients.openWindow(data.url || '/')
    );
  }
});

// Função para sincronizar pedidos offline
async function syncOfflineOrders() {
  try {
    const cache = await caches.open(\`\${DYNAMIC_CACHE_NAME}-offline-orders\`);
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
          console.log('[SW] Offline order synced:', request.url);
        }
      } catch (error) {
        console.error('[SW] Failed to sync order:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

console.log('[SW] Service Worker loaded successfully');
`;

  return new NextResponse(serviceWorkerScript, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}