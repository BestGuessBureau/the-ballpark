// The Ballpark — offline copy for the home-screen app.
// The page and its files are network-first, so a fix to the figures reaches
// everyone the next time they open it; the saved copy is only for no signal.
// Google Fonts are cache-first — a font file never changes at the same URL.
// Bump VERSION whenever the PRECACHE list changes.
const VERSION = 'v1';
const CACHE = 'ballpark-' + VERSION;
const PRECACHE = [
  './',
  'manifest.webmanifest',
  'icons/favicon.svg',
  'icons/favicon-32.png',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-192.png',
  'icons/icon-maskable-512.png',
  'pay-scale-firefighter-preview.jpg',
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys
      .filter(k => k.startsWith('ballpark-') && k !== CACHE)
      .map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (FONT_HOSTS.includes(url.hostname)) e.respondWith(cacheFirst(e));
  else if (url.origin === location.origin) e.respondWith(networkFirst(e, url));
});

async function networkFirst(e, url) {
  // One saved copy per file — shared links arrive with tracking tags (?fbclid=…)
  const key = url.origin + url.pathname;
  try {
    const res = await fetch(e.request);
    if (res.status === 200) {
      const copy = res.clone();
      e.waitUntil(caches.open(CACHE).then(c => c.put(key, copy)));
    }
    return res;
  } catch (err) {
    const hit = await caches.match(key)
      || (e.request.mode === 'navigate' && await caches.match('./'));
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(e) {
  const hit = await caches.match(e.request);
  if (hit) return hit;
  const res = await fetch(e.request);
  // The stylesheet is fetched no-cors, so it comes back opaque (status 0)
  if (res.ok || res.type === 'opaque') {
    const copy = res.clone();
    e.waitUntil(caches.open(CACHE).then(c => c.put(e.request, copy)));
  }
  return res;
}
