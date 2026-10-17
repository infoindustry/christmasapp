// Placeholder art generator: layered nativity scene + printable page.
// Layers are 1440x960 (hole is 960x640; extra margin is for parallax).
import sharp from 'sharp';
import fs from 'node:fs';

const W = 1440, H = 960;
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const svg = (body, defs = '', w = W, h = H) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;
const save = async (name, s) => sharp(Buffer.from(s)).png().toFile(`public/layers/${name}.png`);

// --- characters -----------------------------------------------------------
const eyes = (x, y, s = 1) => `
  <ellipse cx="${x - 14 * s}" cy="${y}" rx="${8 * s}" ry="${10 * s}" fill="#fff"/><circle cx="${x - 13 * s}" cy="${y + 1}" r="${5 * s}" fill="#3b2a1a"/><circle cx="${x - 11 * s}" cy="${y - 2}" r="${1.8 * s}" fill="#fff"/>
  <ellipse cx="${x + 14 * s}" cy="${y}" rx="${8 * s}" ry="${10 * s}" fill="#fff"/><circle cx="${x + 15 * s}" cy="${y + 1}" r="${5 * s}" fill="#3b2a1a"/><circle cx="${x + 17 * s}" cy="${y - 2}" r="${1.8 * s}" fill="#fff"/>
  <path d="M${x - 8 * s} ${y + 22 * s} q${8 * s} ${8 * s} ${16 * s} 0" stroke="#8a3b2a" stroke-width="${3 * s}" fill="none" stroke-linecap="round"/>
  <circle cx="${x - 26 * s}" cy="${y + 14 * s}" r="${6 * s}" fill="#ff8a7a" opacity=".5"/><circle cx="${x + 26 * s}" cy="${y + 14 * s}" r="${6 * s}" fill="#ff8a7a" opacity=".5"/>`;

const person = (x, y, robe, cloth, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="120" rx="70" ry="14" fill="#000" opacity=".18"/>
    <path d="M-62 120 Q-70 20 -30 -10 Q0 -22 30 -10 Q70 20 62 120 Z" fill="${robe}"/>
    <path d="M-62 120 Q-70 20 -30 -10 Q-10 40 -20 120 Z" fill="#000" opacity=".1"/>
    <circle cx="0" cy="-48" r="48" fill="#f2c29b"/>
    <path d="M-52 -52 Q-50 -110 0 -108 Q50 -110 52 -52 Q40 -78 0 -76 Q-40 -78 -52 -52 Z" fill="${cloth}"/>
    <path d="M-54 -50 Q-60 -10 -34 14 Q-44 -20 -40 -44 Z" fill="${cloth}"/>
    <path d="M54 -50 Q60 -10 34 14 Q44 -20 40 -44 Z" fill="${cloth}"/>
    ${eyes(0, -44)}
  </g>`;

const sheep = (x, y, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="48" rx="60" ry="10" fill="#000" opacity=".18"/>
    <rect x="-34" y="20" width="10" height="30" rx="5" fill="#4a3a30"/><rect x="22" y="20" width="10" height="30" rx="5" fill="#4a3a30"/>
    ${[[-30,0],[-10,-14],[14,-12],[34,2],[-20,16],[10,18],[0,2]].map(([a,b])=>`<circle cx="${a}" cy="${b}" r="26" fill="#fffaf0"/>`).join('')}
    <circle cx="-52" cy="4" r="20" fill="#4a3a30"/>
    <circle cx="-58" cy="0" r="4" fill="#fff"/><circle cx="-57" cy="1" r="2" fill="#000"/>
    <ellipse cx="-70" cy="-12" rx="8" ry="12" fill="#4a3a30" transform="rotate(-30 -70 -12)"/>
  </g>`;

// --- layers ----------------------------------------------------------------
const stars = Array.from({ length: 140 }, () => {
  const x = rnd() * W, y = rnd() * H * 0.7, r = 1 + rnd() * 3;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff6c8" opacity="${0.4 + rnd() * 0.6}"/>`;
}).join('');
await save('0-sky', svg(`
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <circle cx="1020" cy="220" r="150" fill="#ffe9a8" opacity=".12"/><circle cx="1020" cy="220" r="80" fill="#ffe9a8" opacity=".18"/>
  ${stars}`,
  `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1445"/><stop offset=".55" stop-color="#2b2f87"/><stop offset="1" stop-color="#7a55b8"/></linearGradient>`));

await save('1-star', svg(`
  <g transform="translate(720 300)">
    <circle r="150" fill="url(#h)"/>
    <path d="M0 -90 L18 -22 L88 -22 L32 20 L52 88 L0 48 L-52 88 L-32 20 L-88 -22 L-18 -22 Z" fill="#ffe27a" stroke="#fff3b0" stroke-width="6" stroke-linejoin="round"/>
    <path d="M0 -380 L10 -90 L-10 -90Z" fill="#ffe27a" opacity=".35"/>
  </g>`,
  `<radialGradient id="h"><stop offset="0" stop-color="#fff3b0" stop-opacity=".9"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></radialGradient>`));

await save('2-hills-far', svg(`
  <path d="M0 640 Q250 480 520 600 Q800 470 1100 590 Q1300 520 1440 600 V960 H0Z" fill="#3d3a8f"/>
  <path d="M0 640 Q250 480 520 600 Q800 470 1100 590 Q1300 520 1440 600" fill="none" stroke="#6a66c9" stroke-width="5" opacity=".6"/>`));

const trees = Array.from({ length: 9 }, (_, i) => {
  const x = 80 + i * 170 + rnd() * 60, y = 640 + rnd() * 30, s = 0.8 + rnd() * 0.6;
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-6" y="0" width="12" height="40" fill="#2a1d3a"/><path d="M0 -90 L40 10 H-40Z M0 -60 L50 40 H-50Z" fill="#1f6b5a"/></g>`;
}).join('');
await save('3-hills-mid', svg(`
  <path d="M0 700 Q300 600 640 680 Q980 590 1440 690 V960 H0Z" fill="#2c7a6a"/>${trees}`));

await save('4-stable', svg(`
  <g transform="translate(720 330)">
    <rect x="-330" y="40" width="660" height="400" fill="#7a4a2b"/>
    ${Array.from({length: 13}, (_, i) => `<rect x="${-330 + i * 51}" y="40" width="3" height="400" fill="#5a3320"/>`).join('')}
    <path d="M-420 60 L0 -150 L420 60 Z" fill="#b5703a"/>
    <path d="M-420 60 L0 -150 L420 60" fill="none" stroke="#e4a15f" stroke-width="10"/>
    <rect x="-330" y="40" width="40" height="400" fill="#4a2a18"/><rect x="290" y="40" width="40" height="400" fill="#4a2a18"/>
    <rect x="-200" y="100" width="400" height="340" fill="#1a0f24" opacity=".35"/>
  </g>`));

await save('5-family', svg(`
  <ellipse cx="720" cy="720" rx="360" ry="40" fill="#3a2410" opacity=".35"/>
  ${person(540, 600, '#3b6fb5', '#f5f1e6', 1.05)}
  ${person(910, 600, '#8b5a32', '#d9a05b', 1.05)}
  <g transform="translate(720 690)">
    <path d="M-110 0 L110 0 L90 50 L-90 50Z" fill="#9b6a3a"/><rect x="-105" y="-18" width="210" height="22" rx="8" fill="#c28a4e"/>
    <ellipse cx="0" cy="-22" rx="95" ry="22" fill="#f3d27a"/>
    <circle cx="0" cy="-60" r="150" fill="url(#gl)"/>
    <ellipse cx="0" cy="-44" rx="58" ry="30" fill="#fffaf0"/>
    <circle cx="0" cy="-58" r="28" fill="#f2c29b"/>
    <path d="M-12 -62 q4 4 8 0 M6 -62 q4 4 8 0" stroke="#5a3a2a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="-18" cy="-52" r="5" fill="#ff8a7a" opacity=".6"/><circle cx="20" cy="-52" r="5" fill="#ff8a7a" opacity=".6"/>
  </g>`,
  `<radialGradient id="gl"><stop offset="0" stop-color="#fff0b0" stop-opacity=".85"/><stop offset="1" stop-color="#fff0b0" stop-opacity="0"/></radialGradient>`));

await save('6-shepherds', svg(`
  ${person(150, 680, '#a04a3a', '#7ab04a', 1.2)}
  ${sheep(320, 770, 0.9)}${sheep(1160, 790, 0.8)}
  ${person(1290, 690, '#56742f', '#d4a24a', 1.15)}`));

const grass = Array.from({ length: 260 }, () => {
  const x = rnd() * W, y = 800 + rnd() * 160, h = 20 + rnd() * 40;
  return `<path d="M${x} ${y} q${rnd() * 14 - 7} ${-h / 2} ${rnd() * 20 - 10} ${-h}" stroke="${rnd() > .5 ? '#3f9b4a' : '#2f7a3e'}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
}).join('');
await save('7-foreground', svg(`
  <path d="M0 860 Q360 800 720 850 Q1080 800 1440 860 V960 H0Z" fill="#2a6a35"/>${grass}`));

// --- printable page 1200x900: textured frame + flat scene in the hole -------
const PW = 1200, PH = 900, HX = 120, HY = 130, HW = 960, HH = 640;
const frameTex = Array.from({ length: 700 }, () => {
  const x = rnd() * PW, y = rnd() * PH, r = 2 + rnd() * 7;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${['#e8c26a','#b8333c','#2f7a4a','#f5ecd0'][Math.floor(rnd() * 4)]}" opacity=".85"/>`;
}).join('');
const holly = Array.from({ length: 26 }, (_, i) => {
  const t = i / 26, x = 60 + t * (PW - 120);
  return `<g transform="translate(${x} 60) rotate(${rnd()*60-30})"><path d="M0 0 q20 -26 40 0 q-20 26 -40 0Z" fill="#1f6b3a"/><circle cx="6" cy="6" r="8" fill="#c0282f"/></g>
          <g transform="translate(${x} ${PH-60}) rotate(${rnd()*60-30})"><path d="M0 0 q20 -26 40 0 q-20 26 -40 0Z" fill="#1f6b3a"/><circle cx="6" cy="6" r="8" fill="#c0282f"/></g>`;
}).join('');
const sceneFlat = await sharp({ create: { width: W, height: H, channels: 4, background: '#0000' } })
  .composite(await Promise.all(['0-sky','2-hills-far','3-hills-mid','4-stable','1-star','5-family','6-shepherds','7-foreground']
    .map(async n => ({ input: await sharp(`public/layers/${n}.png`).toBuffer() })))).png().toBuffer();
const sceneCrop = await sharp(sceneFlat).extract({ left: (W - HW) / 2, top: (H - HH) / 2, width: HW, height: HH }).png().toBuffer();
await sharp(Buffer.from(svg(`
  <rect width="${PW}" height="${PH}" fill="#7a1f2b"/>${frameTex}${holly}
  <rect x="${HX - 14}" y="${HY - 14}" width="${HW + 28}" height="${HH + 28}" rx="10" fill="#e8c26a"/>
  <rect x="${HX - 4}" y="${HY - 4}" width="${HW + 8}" height="${HH + 8}" rx="4" fill="#3a2410"/>`, '', PW, PH)))
  .composite([{ input: sceneCrop, left: HX, top: HY }]).png().toFile('public/page-print.png');
fs.writeFileSync('public/scene.json', JSON.stringify({ page: { w: PW, h: PH }, hole: { x: HX, y: HY, w: HW, h: HH }, layerSize: { w: W, h: H } }, null, 2));
console.log('art done');
