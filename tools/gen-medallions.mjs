// One ornate medallion per witness: printed on the magazine page, it is the AR marker AND the disc the figure stands on.
// Dense, unique guilloche + rosettes give the tracker thousands of features. Run: node tools/gen-medallions.mjs
import sharp from 'sharp';
import fs from 'node:fs';

const W = [
  ['zechariah', 'ЗАХАРИЯ', ['#2a1747', '#6a3fa0', '#e8c46a']],
  ['mary', 'МАРИЯ', ['#0f2a5c', '#3c6fc4', '#e9e2c8']],
  ['elizabeth', 'ЕЛИСАВЕТА', ['#5a1f2b', '#b5586a', '#f0d8a8']],
  ['joseph', 'ИОСИФ', ['#3d2a14', '#8a5a2b', '#d8b878']],
  ['micah', 'МИХЕЙ', ['#12373a', '#2f8a8a', '#d9d2a0']],
  ['shepherd', 'ПАСТУХ', ['#1f3d1c', '#5a9a3c', '#e8d890']],
  ['simeon', 'СИМЕОН', ['#14234a', '#5876c8', '#f2efe2']],
  ['anna', 'АННА', ['#40204a', '#9a5aa8', '#e8dcc8']],
  ['wiseman', 'ВОЛХВ', ['#1c1850', '#4a46b8', '#f0c860']],
  ['herod', 'ИРОД', ['#4a0f14', '#a82a30', '#d8b060']],
  ['word', 'СЛОВО БОЖЬЕ', ['#2b2210', '#b8902c', '#fff3c8']],
  ['room', 'РОЖДЕСТВО', ['#4a0f14', '#2f7a3c', '#f4dca0']],
];
const rng = seed => { let s = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7); return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
const C = 512, f = n => n.toFixed(1);
const pol = (r, a) => [C + r * Math.cos(a), C + r * Math.sin(a)];

for (const [id, name, [dark, mid, gold]] of W) {
  const R = rng(id); const o = [];
  o.push(`<defs><radialGradient id="bg"><stop offset="0" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></radialGradient>
    <linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${gold}"/><stop offset="1" stop-color="#9a7a34"/></linearGradient>
    </defs>`);
  o.push(`<circle cx="${C}" cy="${C}" r="506" fill="${dark}"/><circle cx="${C}" cy="${C}" r="498" fill="url(#bg)"/>`);
  // guilloche: many thin rotated ellipses (unique per witness)
  const n1 = 36 + Math.floor(R() * 24), e1 = 150 + R() * 120, e2 = 380 + R() * 60, ph = R() * 3;
  for (let i = 0; i < n1; i++) o.push(`<ellipse cx="${C}" cy="${C}" rx="${f(e2)}" ry="${f(e1)}" transform="rotate(${f(i * 180 / n1 + ph)} ${C} ${C})" fill="none" stroke="${gold}" stroke-opacity="0.22" stroke-width="1.4"/>`);
  // petal ring
  const np = 20 + Math.floor(R() * 8) * 2;
  for (let i = 0; i < np; i++) { const a = i / np * 6.283, b = (i + 1) / np * 6.283, m = (a + b) / 2; const [x1, y1] = pol(330, a), [x2, y2] = pol(330, b), [cx, cy] = pol(446 + (i % 2) * 22, m);
    o.push(`<path d="M${f(x1)},${f(y1)} Q${f(cx)},${f(cy)} ${f(x2)},${f(y2)} Z" fill="${i % 2 ? gold : mid}" fill-opacity="${i % 2 ? .85 : .75}" stroke="${dark}" stroke-width="2"/>`);
    const [dx, dy] = pol(405, m); o.push(`<circle cx="${f(dx)}" cy="${f(dy)}" r="${i % 2 ? 7 : 5}" fill="${i % 2 ? dark : gold}"/>`); }
  // rim ticks
  const nt = 96 + Math.floor(R() * 4) * 24; for (let i = 0; i < nt; i++) { const a = i / nt * 6.283, [x1, y1] = pol(486, a), [x2, y2] = pol(i % 4 ? 497 : 500, a); o.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="url(#gd)" stroke-width="${i % 4 ? 2 : 3.5}"/>`); }
  o.push(`<circle cx="${C}" cy="${C}" r="478" fill="none" stroke="url(#gd)" stroke-width="5"/><circle cx="${C}" cy="${C}" r="330" fill="none" stroke="url(#gd)" stroke-width="4"/>`);
  // star polygon rings, different counts per witness
  for (const [r, k, w] of [[310, 12 + Math.floor(R() * 5) * 2, 3], [250, 8 + Math.floor(R() * 4) * 2, 3], [190, 6 + Math.floor(R() * 4) * 2, 2.5]]) { const pts = []; for (let i = 0; i < k * 2; i++) pts.push(pol(i % 2 ? r * .62 : r, i / (k * 2) * 6.283 + R() * .02).map(f).join(',')); o.push(`<polygon points="${pts.join(' ')}" fill="${dark}" fill-opacity=".55" stroke="url(#gd)" stroke-width="${w}" stroke-linejoin="round"/>`); }
  // inner dot lattice
  for (let rr = 70; rr < 300; rr += 22) { const k = Math.floor(rr / 9); for (let i = 0; i < k; i++) { const [x, y] = pol(rr, i / k * 6.283 + rr); o.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${1.6 + R() * 1.4}" fill="${gold}" fill-opacity=".7"/>`); } }
  // asymmetric "stardust" and a soft mottled texture: a perfectly symmetric mandala gives the camera nothing to lock onto,
  // this makes every medallion unique and easy to track, and reads as painted gold dust on enamel
  for (let i = 0; i < 260; i++) { const a = R() * 6.283, rr = 70 + R() * 405, [x, y] = pol(rr, a), big = R() < .12; o.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(big ? 3 + R() * 4 : 0.8 + R() * 2)}" fill="${R() < .6 ? gold : '#fff'}" fill-opacity="${f(.25 + R() * .6)}"/>`); }
  for (let i = 0; i < 14; i++) { const a = R() * 6.283, rr = 100 + R() * 330, [x, y] = pol(rr, a), [x2, y2] = pol(rr + 20 + R() * 40, a + (R() - .5) * .5); o.push(`<line x1="${f(x)}" y1="${f(y)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${gold}" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/>`); }
  o.push(`<filter id="nz" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="4" seed="${1 + Math.floor(R() * 900)}"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.6 -0.55"/></filter><clipPath id="nzc"><circle cx="${C}" cy="${C}" r="470"/></clipPath><circle cx="${C}" cy="${C}" r="470" filter="url(#nz)" opacity=".30" clip-path="url(#nzc)"/>`);
  o.push(`<circle cx="${C}" cy="${C}" r="64" fill="${dark}" stroke="url(#gd)" stroke-width="5"/><circle cx="${C}" cy="${C}" r="48" fill="none" stroke="${gold}" stroke-width="2" stroke-dasharray="3 7"/>`);
  // name along the petal ring: letter by letter (textPath is not supported by the SVG renderer)
  { const chars = [...name], step = Math.min(10.5, 74 / chars.length * 1.9); chars.forEach((ch, i) => { const ang = (i - (chars.length - 1) / 2) * step;
      o.push(`<text transform="translate(${C} ${C}) rotate(${f(ang)}) translate(0 -403)" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="50" font-weight="700" fill="${dark}" stroke="${dark}" stroke-width="5" stroke-linejoin="round">${ch}</text>`);
      o.push(`<text transform="translate(${C} ${C}) rotate(${f(ang)}) translate(0 -403)" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="50" font-weight="700" fill="url(#gd)">${ch}</text>`); }); }
  fs.writeFileSync(`public/medallions/${id}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1024" height="1024" viewBox="0 0 1024 1024">${o.join('')}</svg>`);
  await sharp(Buffer.from(fs.readFileSync(`public/medallions/${id}.svg`))).png({ compressionLevel: 9, palette: true, quality: 92 }).toFile(`public/medallions/${id}.png`);
  console.log('medallion', id);
}
