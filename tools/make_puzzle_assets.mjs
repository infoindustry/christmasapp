// Puzzle pictures: shrink the big originals (up to 5 MB) to 960 px wide webp for phones. Run: node tools/make_puzzle_assets.mjs [folder]
import sharp from 'sharp';
import { readdirSync, mkdirSync } from 'node:fs';
const D = process.argv[2] || '/Users/alex/Downloads/Пазлы/', files = readdirSync(D).filter(f => /\.(png|jpe?g)$/i.test(f)).sort();
mkdirSync('public/puzzle', { recursive: true }); let i = 1;
for (const f of files) { const id = 'p' + i++; const m = await sharp(D + f).metadata();
  await sharp(D + f).resize({ width: 960, withoutEnlargement: true }).webp({ quality: 74 }).toFile(`public/puzzle/${id}.webp`);
  await sharp(D + f).resize({ width: 360 }).jpeg({ quality: 70 }).toFile(`/private/tmp/claude-501/pz/${id}.jpg`);
  console.log(id, f, m.width + 'x' + m.height); }
