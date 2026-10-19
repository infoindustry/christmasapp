// Coloring pages: o<N>.webp = the AI line drawing (3:4, black lines on white), c<N>.webp = the same picture in colour cropped to the same frame (the finale), cb<N>.webp = its soft blurred version (the "magic" brush),
// t<N>.webp = thumbnail of the line drawing. Run: node tools/make_coloring_assets.mjs "<folder with the 8 line drawings, numbered -1..-8>"
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
const D = process.argv[2] || '/Users/alex/Downloads/Новая папка с объектами 4/', W = 720, H = 960;
const files = readdirSync(D).filter(f => /\.(png|jpe?g|webp)$/i.test(f)).sort((a, b) => +a.match(/-(\d+)\.\w+$/)[1] - +b.match(/-(\d+)\.\w+$/)[1]);
for (let i = 1; i <= 8; i++) {
  await sharp(D + files[i - 1]).resize(W, H, { fit: 'fill' }).greyscale().normalise().webp({ quality: 82 }).toFile(`public/coloring/o${i}.webp`);
  await sharp(`public/puzzle/p${i}.webp`).resize(W, H, { fit: 'cover' }).webp({ quality: 76 }).toFile(`public/coloring/c${i}.webp`);
  await sharp(`public/puzzle/p${i}.webp`).resize(W, H, { fit: 'cover' }).blur(7).modulate({ saturation: 1.25 }).webp({ quality: 70 }).toFile(`public/coloring/cb${i}.webp`);   // a soft colour wash for the magic brush: it does not have to match the lines exactly
  await sharp(D + files[i - 1]).resize(220).greyscale().webp({ quality: 70 }).toFile(`public/coloring/t${i}.webp`);
}
console.log('ok', files.length);
