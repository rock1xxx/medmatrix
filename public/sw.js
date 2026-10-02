const CACHE_NAME = 'medmatrix-offline-v2'
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
]

// Pre-cache static shell on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS)
    }).then(() => self.skipWaiting())
  )
})

// Clean up stale caches on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Offline-first fetch strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Do not intercept non-http(s) or cross-origin requests (e.g., Supabase API calls)
  if (url.origin !== self.location.origin) return

  // Stale-While-Revalidate for same-origin assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })
          }
          return networkResponse
        })
        .catch(() => {
          // If offline and navigating to any page, fallback to cached index.html
          if (event.request.mode === 'navigate' || event.request.destination === 'document') {
            return caches.match('/index.html')
          }
        })

      // Return cached version immediately if available, otherwise wait for network fetch
      return cachedResponse || fetchPromise
    })
  )
})
