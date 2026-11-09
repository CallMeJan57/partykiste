// Service Worker: macht die Partykiste installierbar und offline spielbar.
// Eigene Dateien: „Netz zuerst“ – online immer die neueste Version, offline die zuletzt gespeicherte.
// Schriften und Bilder von anderen Seiten: „Cache zuerst“ – die ändern sich nicht.
// Song-Hörproben (Audio) und die iTunes-Suche laufen immer übers Netz.

const CACHE = 'partykiste-v1';
const EXTERN = 'partykiste-extern-v2'; // v2: Bilder mit CORS statt undurchsichtig gespeichert
const MAX_EXTERN = 250; // so viele fremde Bilder/Schriften höchstens behalten (älteste fliegen raus)
// Bilder, die ein Spiel komplett für offline speichert (saveImagesOffline in js/core/offline.js) – ohne Obergrenze
const IMAGE_CACHES = ['partykiste-bilder-kmk-v1'];
const IMAGE_WORKERS = 4; // so viele Bilder gleichzeitig laden

const CORE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/base.css',
  'css/components.css',
  'css/hub.css',
  'css/dice.css',
  'css/coin.css',
  'css/finger.css',
  'icons/icon-192.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE && key !== EXTERN && !IMAGE_CACHES.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Die App nennt nach dem Start alle Dateien, die sie braucht (Module, Spiel-Styles) – die kommen vorab in den Cache
self.addEventListener('message', (event) => {
  if (event.data?.type === 'save-images') {
    event.waitUntil(saveImages(event.data.cache, event.data.urls, event.ports[0]));
    return;
  }
  if (event.data?.type !== 'precache') return;
  event.waitUntil(
    caches.open(CACHE).then((cache) => Promise.all(event.data.urls.map((url) => cache.add(url).catch(() => {})))),
  );
});

// Lädt alle noch fehlenden Bilder in den Bilder-Cache und meldet den Fortschritt über den MessagePort
async function saveImages(name, urls, port) {
  if (!IMAGE_CACHES.includes(name) || !Array.isArray(urls)) return;
  const cache = await caches.open(name);
  const saved = new Set((await cache.keys()).map((request) => request.url));
  const queue = urls.filter((url) => !saved.has(url));
  const report = (finished = false) => port?.postMessage({ done: urls.filter((url) => saved.has(url)).length, total: urls.length, finished });
  report();
  const worker = async () => {
    while (queue.length) {
      const url = queue.shift();
      try {
        const response = await fetchImage(url);
        if (response.ok || response.type === 'opaque') {
          await cache.put(url, response);
          saved.add(url);
        }
      } catch {
        // offline oder Bild weg – beim nächsten Öffnen wird es erneut versucht
      }
      report();
    }
  };
  await Promise.all(Array.from({ length: IMAGE_WORKERS }, worker));
  report(true);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.hostname.endsWith('goatcounter.com') || url.hostname === 'gc.zgo.at') return; // Besucherzähler nie zwischenspeichern
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

// Fremde Bilder möglichst mit CORS laden: Dann kennt der Browser die echte Größe. Undurchsichtige Antworten
// („opaque“) verbucht er dagegen mit mehreren MB Platzhalter pro Bild – das sprengt schnell den Offline-Speicher.
async function fetchImage(url) {
  try {
    return await fetch(url, { mode: 'cors', referrerPolicy: 'no-referrer' });
  } catch {
    return fetch(url, { mode: 'no-cors', referrerPolicy: 'no-referrer' });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(EXTERN);
  const cached = await caches.match(request); // auch in den Bilder-Caches der Spiele suchen
  if (cached) return cached;
  const response = request.destination === 'image' ? await fetchImage(request.url) : await fetch(request);
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
