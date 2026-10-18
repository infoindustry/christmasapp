// App icons for the home-screen install (PWA): the Star of Bethlehem on a deep-night circle of light.
import sharp from 'sharp'; import fs from 'node:fs';
const star = (cx, cy, R, r, n) => { const p = []; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2 - Math.PI / 2, d = i % 2 ? r : R; p.push(`${(cx + Math.cos(a) * d).toFixed(1)},${(cy + Math.sin(a) * d).toFixed(1)}`); } return p.join(' '); };
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2d78"/><stop offset="1" stop-color="#14102a"/></linearGradient>
<radialGradient id="gl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".9"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>
<linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b8"/><stop offset="1" stop-color="#e3b445"/></linearGradient></defs>
<rect width="1024" height="1024" fill="url(#bg)"/>
<g transform="translate(512 512) scale(${1 - pad}) translate(-512 -512)">
<circle cx="512" cy="500" r="330" fill="url(#gl)"/>
<g fill="#fff" opacity=".85"><circle cx="190" cy="220" r="6"/><circle cx="830" cy="170" r="7"/><circle cx="880" cy="520" r="5"/><circle cx="150" cy="640" r="6"/><circle cx="700" cy="850" r="5"/><circle cx="320" cy="880" r="6"/></g>
<polygon points="${star(512, 492, 330, 96, 8)}" fill="url(#gd)" stroke="#fff6d2" stroke-width="6" stroke-linejoin="round"/>
<polygon points="${star(512, 492, 190, 70, 4)}" fill="#fff6d2" opacity=".75"/>
<path d="M240 800 Q512 700 784 800 L784 840 Q512 760 240 840 Z" fill="#e3b445" opacity=".9"/>
</g></svg>`;
const out = (name, size, pad, round = false) => sharp(Buffer.from(svg(pad))).resize(size, size).png().toFile(`public/icons/${name}`);
await out('icon-512.png', 512, 0.0); await out('icon-192.png', 192, 0.0);
await out('maskable-512.png', 512, 0.16);   // extra margin: Android crops it to a circle / squircle
await out('apple-touch-icon.png', 180, 0.0); await out('favicon-32.png', 32, 0.0);
console.log('icons ok');
