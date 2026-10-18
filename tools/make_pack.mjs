// Builds the print package for the designer: work/pack/ (zip it afterwards)
import sharp from 'sharp'; import fs from 'node:fs'; import QRCode from 'qrcode';
const SITE = 'https://ar.nativity.top';
const data = JSON.parse(fs.readFileSync('public/data/witnesses.json', 'utf8'));
const out = 'work/pack'; fs.rmSync(out, { recursive: true, force: true });
for (const d of ['medallions-png', 'medallions-svg', 'qr']) fs.mkdirSync(`${out}/${d}`, { recursive: true });
const meds = {};
for (const w of data) {
  fs.copyFileSync(`public/medallions/${w.id}.svg`, `${out}/medallions-svg/${w.id}.svg`);
  await sharp(fs.readFileSync(`public/medallions/${w.id}.svg`), { density: 288 }).resize(2000, 2000).png({ compressionLevel: 9 }).toFile(`${out}/medallions-png/${w.id}.png`);   // 2000 px: 6 cm at 850 dpi, 10 cm at 500 dpi. Vector SVGs are there for any larger size
  await QRCode.toFile(`${out}/qr/${w.id}.png`, `${SITE}/witness.html?id=${w.id}`, { width: 1000, margin: 2, color: { dark: '#14102a', light: '#ffffff' } });
  meds[w.id] = await sharp(`${out}/medallions-png/${w.id}.png`).resize(709, 709).png().toBuffer();   // 6.0 cm at 300 dpi
}
// test sheet A4 @300 dpi: all medallions at 6 cm (the minimum recommended size)
const W = 2480, H = 3508, cols = 3, cw = 780, ch = 820, x0 = (W - cols * cw) / 2, y0 = 130;
const comps = []; let i = 0;
for (const w of data) {
  const c = i % cols, r = Math.floor(i / cols), x = Math.round(x0 + c * cw + (cw - 709) / 2), y = y0 + r * ch;
  comps.push({ input: meds[w.id], left: x, top: y });
  const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="709" height="70"><text x="354" y="48" text-anchor="middle" font-family="Georgia" font-size="40" fill="#222">${w.name}</text></svg>`);
  comps.push({ input: label, left: x, top: y + 725 }); i++;
}
await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } }).composite(comps).png().toFile(`${out}/test-sheet-medallions-A4.png`);
// QR sheet
const qc = []; i = 0; const qs = 560;
for (const w of data) { const c = i % 4, r = Math.floor(i / 4); qc.push({ input: await sharp(`${out}/qr/${w.id}.png`).resize(qs, qs).toBuffer(), left: 100 + c * 590, top: 150 + r * 700 });
  qc.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${qs}" height="60"><text x="${qs / 2}" y="44" text-anchor="middle" font-family="Georgia" font-size="38" fill="#222">${w.name}</text></svg>`), left: 100 + c * 590, top: 150 + r * 700 + qs }); i++; }
await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } }).composite(qc).png().toFile(`${out}/test-sheet-qr-A4.png`);
console.log('pack ok', data.length);
