// Clasuke Studio service worker. vite.config.js fills in the two placeholders at build time.
//   - app shell + hashed assets + thumbnails: precached, served cache-first
//   - 360° photos: cached the first time they are used
//   - videos and any Range request: never touched, they stream from the network
const VERSION = '__SW_VERSION__';
const PRECACHE = __SW_PRECACHE__;
const CACHE = 'clasuke-' + VERSION, RUNTIME = 'clasuke-runtime-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.allSettled(PRECACHE.map(u => c.add(new Request(u, { cache: 'reload' })))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== RUNTIME).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range') || req.destination === 'video') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname === '/health' || /\.(mp4|webm|mov)$/i.test(url.pathname)) return;
  if (req.mode === 'navigate') {
    // network first so a deploy shows up at once; the cached shell is the offline fallback
    e.respondWith(fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put('/', copy)); } return r; })
      .catch(() => caches.match('/', { cacheName: CACHE }).then(r => r || Response.error())));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok && r.status === 200 && /\.(jpe?g|png|webp|svg|woff2|js|css)$/i.test(url.pathname)) { const copy = r.clone(); caches.open(RUNTIME).then(c => c.put(req, copy)); }
    return r;
  })));
});
