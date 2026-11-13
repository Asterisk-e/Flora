/* Static asset cache for localhost/HTTPS installs. User files remain in IndexedDB. */
const CACHE_NAME = 'flora-static-v5';
const CORE_FILES = ['./', './index.html', './theme.css', './styles.css', './features.css', './export-formats.js', './encoding.js', './presets.js', './app.js', './apps.js', './tools.js', './settings.js', './storage.js', './setup.js', './README.md'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok && response.type === 'basic') { const copy=response.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)); }
    return response;
  }).catch(() => caches.match('./index.html'))));
});
