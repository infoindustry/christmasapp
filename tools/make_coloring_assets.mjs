// "Magic coloring": each puzzle picture as a soft black-and-white sketch (the colours come back where a child paints). Run: node tools/make_coloring_assets.mjs
import sharp from 'sharp';
for (let i = 1; i <= 8; i++) {
  await sharp(`public/puzzle/p${i}.webp`).resize({ width: 720 }).greyscale().linear(0.8, 40).webp({ quality: 72 }).toFile(`public/coloring/g${i}.webp`);
  await sharp(`public/puzzle/p${i}.webp`).resize({ width: 720 }).webp({ quality: 74 }).toFile(`public/coloring/c${i}.webp`);
}
console.log('ok');
