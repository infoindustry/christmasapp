// Service worker: after the first visit the models, pictures and scripts come from the phone's cache (instant), and refresh in the background.
const CACHE = 'nativity-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || r.headers.has('range')) return;   // audio / video are streamed with ranges: leave them to the browser
  if (/\.(mp3|mp4|vtt)$/.test(u.pathname)) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(r), net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
    return hit || net;   // cached copy at once; the network copy refreshes it for next time
  }));
});
