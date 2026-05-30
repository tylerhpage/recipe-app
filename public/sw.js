const CACHE_NAME = 'recipe-app-v2'

// App shell files to pre-cache on install
const APP_SHELL = [
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
]

// Install: cache static assets (not HTML — that gets network-first at runtime)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  )
  // Activate immediately without waiting for existing tabs to close
  self.skipWaiting()
})

// Activate: delete old caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  // Take control of all open tabs immediately
  self.clients.claim()
})

// Fetch strategy:
//   HTML (/ and /index.html) → network-first so new deployments load immediately
//   Hashed JS/CSS assets     → cache-first (safe: Vite changes filenames on each build)
//   Supabase / Anthropic     → always network, never cache
//   Other GETs               → cache-first with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Pass through non-GET and API calls
  if (
    request.method !== 'GET' ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('anthropic.com')
  ) {
    return
  }

  // Network-first for HTML so the app always boots with the latest index.html
  const isHtml =
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    request.headers.get('accept')?.includes('text/html')

  if (isHtml) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Cache-first for everything else (hashed bundles, icons, fonts, etc.)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetch(request).then((response) => {
        if (
          !response ||
          response.status !== 200 ||
          (response.type !== 'basic' && response.type !== 'cors')
        ) {
          return response
        }

        const responseToCache = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache))
        return response
      })
    })
  )
})
