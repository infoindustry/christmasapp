// Compile the medallions into MindAR tracking targets (public/targets/<id>.mind): the second tracker engine, chosen with the "AR · медальон 2" button.
import fs from 'node:fs';
import { loadImage } from 'canvas';
import sharp from 'sharp';
import { OfflineCompiler } from 'mind-ar/src/image-target/offline-compiler.js';

const ids = JSON.parse(fs.readFileSync('public/data/witnesses.json', 'utf8')).filter(w => w.type !== 'game' && !w.nomarker).map(w => w.id);
for (const id of ids) {
  const c = new OfflineCompiler();
  const img = async dir => loadImage(await sharp(`${dir}/${id}.png`).flatten({ background: '#f4ecd8' }).png().toBuffer());   // flattened onto paper colour: transparent corners are not features
  await c.compileImageTargets([await img('art/medallions'), await img('art/medallions-old')], () => {});   // target 0: current design, target 1: the previous (dark) one
  fs.writeFileSync(`public/targets/${id}.mind`, Buffer.from(c.exportData())); console.log(id, (fs.statSync(`public/targets/${id}.mind`).size / 1024).toFixed(0), 'KB');
}
