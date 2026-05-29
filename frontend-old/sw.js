// F1 Analysis 2026 — Service Worker
// Cache-first for fonts, logos, and static assets
// Network-first for API data

const CACHE_NAME = 'f1-analysis-v1';

const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/logos/alpine.svg',
  '/logos/aston-martin.svg',
  '/logos/audi.svg',
  '/logos/cadillac.svg',
  '/logos/ferrari.svg',
  '/logos/haas.svg',
  '/logos/mclaren.svg',
  '/logos/mercedes.svg',
  '/logos/racing-bulls.svg',
  '/logos/red-bull-racing.svg',
  '/logos/williams.svg',
];

// CDN scripts to cache
const CDN_CACHE = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js',
  'https://cdn.tailwindcss.com',
];

// Install — pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch — network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls — network-first
  if (url.pathname.startsWith('/api/') || url.origin === location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // CDN scripts — cache-first with network fallback
  if (url.origin === 'cdn.jsdelivr.net' || url.origin === 'cdn.tailwindcss.com') {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Static assets — cache-first
  if (url.pathname.match(/\.(svg|png|jpg|jpeg|webp|ico|json|css|js)$/)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Everything else (HTML) — network-first
  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}
