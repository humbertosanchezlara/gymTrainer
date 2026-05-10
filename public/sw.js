const APP_CACHE = 'forge-app-shell-v1';
const RUNTIME_CACHE = 'forge-runtime-v1';
const APP_SHELL = ['/', '/favicon.svg', '/icons.svg'];

const timeout = (ms) => new Promise((_, reject) => {
  setTimeout(() => reject(new Error('network timeout')), ms);
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => ![APP_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    const response = await Promise.race([fetch(request), timeout(1800)]);
    if (response.ok) {
      cache.put('/', response.clone());
    }
    return response;
  } catch {
    return (await cache.match('/')) || fetch(request);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || network || fetch(request);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin !== self.location.origin) {
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
      event.respondWith(staleWhileRevalidate(request));
    }
    return;
  }

  if (
    url.pathname.startsWith('/assets/')
    || url.pathname.endsWith('.svg')
    || url.pathname.endsWith('.png')
    || url.pathname.endsWith('.css')
    || url.pathname.endsWith('.js')
  ) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
