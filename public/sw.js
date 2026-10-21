// Service worker: the app shell works offline, cached media is served with Range support (audio/video need it), everything refreshes in the background.
// Rule number one: the worker must never make the site WORSE than no worker: any problem falls back to the plain network.
const VERSION = '__VERSION__';          // replaced at build time, so every deploy installs a fresh worker and drops the old caches
const SHELL = 'nativity-shell-' + VERSION, MEDIA = 'nativity-media-v1';
const base = new URL('./', self.location).href;

self.addEventListener('install', e => e.waitUntil((async () => {
  try {
    const pc = await (await fetch(new URL('precache.json', base), { cache: 'no-store' })).json(), c = await caches.open(SHELL);
    await Promise.all(pc.shell.map(u => c.add(new URL(u, base).href).catch(() => {})));
  } catch (err) { /* offline at install: the runtime cache below still fills up */ }
  self.skipWaiting();
})()));

self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== SHELL && k !== MEDIA) await caches.delete(k);   // old versions (and the very first cache) go away
  // a re-voiced line or a new model keeps its file name: drop the saved offline copy whose size differs from the published one
  try {
    const pc = await (await fetch(new URL('precache.json', base), { cache: 'no-store' })).json(), sizes = pc.mediaSize || {}, c = await caches.open(MEDIA);
    for (const req of await c.keys()) {
      const want = sizes[req.url.slice(base.length)], res = await c.match(req), have = res && +res.headers.get('content-length');
      if (want && have && have !== want) await c.delete(req);
    }
  } catch (err) { /* offline: check again on the next update */ }
  await self.clients.claim();
  for (const c of await self.clients.matchAll({ type: 'window' })) { try { c.navigate(c.url); } catch (err) {} }   // pages opened with an old version reload once, with the new files
})()));

const slice = async (cached, range) => {   // answer a Range request from a fully cached file
  const blob = await cached.blob(), m = /bytes=(\d*)-(\d*)/.exec(range) || [], size = blob.size;
  let start = m[1] ? +m[1] : 0, end = m[2] ? +m[2] : size - 1; if (!m[1] && m[2]) { start = size - +m[2]; end = size - 1; } end = Math.min(end, size - 1);
  return new Response(blob.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers: { 'Content-Type': cached.headers.get('Content-Type') || 'application/octet-stream', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
};
const store = (key, res) => { try { const copy = res.clone(); caches.open(SHELL).then(c => c.put(key, copy)).catch(() => {}); } catch (err) {} };

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith((async () => {
    try {
      const key = new Request(u.href), range = r.headers.get('range'), media = /\.(mp3|mp4)$/.test(u.pathname);
      if (media) { const hit = await caches.match(key); return hit ? (range ? slice(hit, range) : hit) : fetch(r); }   // audio / video: from the offline copy if there is one, else the network
      if (r.mode === 'navigate' || r.destination === 'document') {            // pages: the network first (always fresh), the cache when offline
        try { const res = await fetch(r); if (res.ok) store(key, res); return res; } catch (err) { return (await caches.match(key)) || (await caches.match(new URL('index.html', base).href)) || Response.error(); }
      }
      const hit = await caches.match(key);
      if (hit) { if (!/\.(glb)$/.test(u.pathname) && !u.pathname.includes('/assets/')) fetch(r).then(res => res.ok && res.status === 200 && store(key, res)).catch(() => {}); return hit; }   // cached copy at once, refreshed in the background
      const res = await fetch(r); if (res.ok && res.status === 200) store(key, res); return res;
    } catch (err) { return fetch(r); }
  })());
});
