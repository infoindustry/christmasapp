// Compile all ten medallions into ONE Locus AR target file; the order is written to public/data/medallions.json.
import sharp from 'sharp';
import fs from 'node:fs';
import { OfflineCompiler } from 'locus-ar';

const ids = JSON.parse(fs.readFileSync('public/data/witnesses.json', 'utf8')).map(w => w.id);
const targets = [];
for (const id of ids) {
  // flatten onto a neutral paper colour so the transparent corners are not read as black features
  const { data, info } = await sharp(`public/medallions/${id}.png`).flatten({ background: '#f4ecd8' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  targets.push({ width: info.width, height: info.height, data: new Uint8Array(data) });
}
const compiler = new OfflineCompiler();
await compiler.compileImageTargets(targets, p => process.stdout.write(`\rcompiling ${p.toFixed(0)}%`));
fs.writeFileSync('public/medallions.taar', compiler.exportData());
fs.writeFileSync('public/data/medallions.json', JSON.stringify(ids));
console.log(`\npublic/medallions.taar: ${(fs.statSync('public/medallions.taar').size / 1024).toFixed(0)} KB, ${ids.length} targets`);
