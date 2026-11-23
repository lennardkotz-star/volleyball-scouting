/* Volleyball Scouting – Offline-Modus: App-Dateien aus dem Speicher, im Hintergrund aktualisieren. Videos laufen nicht hierüber. */
const CACHE = 'vst-v4';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'css/app.css', 'css/video.css', 'css/look.css', 'js/core.js', 'js/idb.js', 'js/app.js', 'js/rally.js', 'js/video.js', 'js/zones.js', 'js/share.js', 'js/main.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // Zuerst das Netz, damit Updates sofort ankommen. Bei schlechtem Hallen-WLAN nach kurzer Zeit aus dem Speicher.
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request, { cache: 'no-cache' }).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; });
    if (!hit) return net;
    const late = new Promise((res) => setTimeout(() => res(hit), 2500));
    return Promise.race([net.catch(() => hit), late]);
  }));
});
