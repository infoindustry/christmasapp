// After `vite build`: lists every file of dist/ in dist/precache.json — "shell" (the app itself, cached at install) and "media" (models, voices, the film: downloaded on demand for offline use).
import fs from 'node:fs'; import path from 'node:path';
const root = 'dist', files = [];
const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f), st = fs.statSync(p); if (st.isDirectory()) walk(p); else files.push({ url: path.relative(root, p).split(path.sep).join('/'), size: st.size }); } }; walk(root);
const skip = /^(CNAME|sw\.js|precache\.json)$/;
const isMedia = u => /^(audio|film|witnesses|animals|room|game)\//.test(u) && !/\.(webp|png|jpg)$/.test(u) || /\.glb$/.test(u);
const shell = files.filter(f => !skip.test(f.url) && !isMedia(f.url)).map(f => f.url), media = files.filter(f => !skip.test(f.url) && isMedia(f.url));
const version = Date.now().toString(36);
fs.writeFileSync(`${root}/precache.json`, JSON.stringify({ version, shell: ['./', ...shell], media: media.map(f => f.url), mediaBytes: media.reduce((a, f) => a + f.size, 0) }));
console.log(`precache: ${shell.length} shell files, ${media.length} media files (${(media.reduce((a, f) => a + f.size, 0) / 1048576).toFixed(0)} MB)`);
