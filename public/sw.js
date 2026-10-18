// Service worker: installs the app shell for offline use, serves cached media (with Range support, which audio and video need), refreshes in the background.
const MEDIA = 'nativity-media-v1';
let SHELL = 'nativity-shell';
const base = new URL('./', self.location).href;
self.addEventListener('install', e => e.waitUntil((async () => {
  try {
    const pc = await (await fetch(new URL('precache.json', base), { cache: 'no-store' })).json(); SHELL = 'nativity-shell-' + pc.version;
    const c = await caches.open(SHELL); await Promise.all(pc.shell.map(u => c.add(new URL(u, base).href).catch(() => {})));
  } catch (err) { /* first visit without a network manifest: the runtime cache below still works */ }
  self.skipWaiting();
})()));
self.addEventListener('activate', e => e.waitUntil((async () => {
  const pc = await fetch(new URL('precache.json', base)).then(r => r.json()).catch(() => null); if (pc) SHELL = 'nativity-shell-' + pc.version;
  for (const k of await caches.keys()) if (k !== MEDIA && k !== SHELL && k.startsWith('nativity-shell')) await caches.delete(k);
  await self.clients.claim();
})()));
const slice = async (cached, range) => {   // answer a Range request from a fully cached file
  const blob = await cached.blob(), m = /bytes=(\d*)-(\d*)/.exec(range) || [], size = blob.size;
  let start = m[1] ? +m[1] : 0, end = m[2] ? +m[2] : size - 1; if (!m[1] && m[2]) { start = size - +m[2]; end = size - 1; } end = Math.min(end, size - 1);
  return new Response(blob.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers: { 'Content-Type': cached.headers.get('Content-Type') || 'application/octet-stream', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
};
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  const range = r.headers.get('range');
  e.respondWith((async () => {
    const key = new Request(u.href);   // a Range request is looked up as the whole file
    const hit = await caches.match(key, { ignoreSearch: false });
    if (range && /\.(mp3|mp4)$/.test(u.pathname)) return hit ? slice(hit, range) : fetch(r);
    if (hit) { if (!/\.(mp3|mp4|glb)$/.test(u.pathname)) fetch(r).then(res => res.ok && caches.open(SHELL).then(c => c.put(key, res))).catch(() => {}); return hit; }   // cached copy at once, refreshed for next time
    try { const res = await fetch(r); if (res.ok && !/\.(mp3|mp4)$/.test(u.pathname) && res.status === 200) caches.open(SHELL).then(c => c.put(key, res.clone())); return res; }
    catch (err) { if (r.mode === 'navigate') return (await caches.match(new URL('index.html', base).href)) || Response.error(); return Response.error(); }
  })());
});
