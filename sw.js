// Service Worker: macht die Partykiste installierbar und offline spielbar.
// Eigene Dateien: „Netz zuerst“ – online immer die neueste Version, offline die zuletzt gespeicherte.
// Schriften und Bilder von anderen Seiten: „Cache zuerst“ – die ändern sich nicht.
// Song-Hörproben (Audio) und die iTunes-Suche laufen immer übers Netz.

const CACHE = 'partykiste-v1';
const EXTERN = 'partykiste-extern-v1';
const MAX_EXTERN = 250; // so viele fremde Bilder/Schriften höchstens behalten (älteste fliegen raus)

const CORE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/base.css',
  'css/components.css',
  'css/hub.css',
  'css/dice.css',
  'icons/icon-192.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE && key !== EXTERN).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Die App nennt nach dem Start alle Dateien, die sie braucht (Module, Spiel-Styles) – die kommen vorab in den Cache
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'precache') return;
  event.waitUntil(
    caches.open(CACHE).then((cache) => Promise.all(event.data.urls.map((url) => cache.add(url).catch(() => {})))),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
  } else if (request.destination === 'image' || request.destination === 'font' || url.hostname === 'fonts.googleapis.com') {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true })
      ?? (request.mode === 'navigate' ? await cache.match('index.html') : undefined);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(EXTERN);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    await cache.put(request, response.clone());
    trim(cache);
  }
  return response;
}

async function trim(cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_EXTERN))) await cache.delete(key);
}
