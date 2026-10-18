// Compile the medallions into Locus AR tracking targets: one small file per witness (public/targets/<id>.taar, loaded by that witness's page)
// and, with --all, one combined file (public/medallions.taar) for a future "one link for every medallion" mode.
import sharp from 'sharp';
import fs from 'node:fs';
import { OfflineCompiler } from 'locus-ar';

const ids = JSON.parse(fs.readFileSync('public/data/witnesses.json', 'utf8')).filter(w => w.type !== 'game' && !w.nomarker).map(w => w.id)   // the gingerbread game has no medallion;
fs.mkdirSync('public/targets', { recursive: true });
const load = async id => {
  // flatten onto a neutral paper colour so the transparent corners are not read as black features
  const { data, info } = await sharp(`art/medallions/${id}.png`).flatten({ background: '#f4ecd8' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8Array(data) };
};
for (const id of ids) {
  const c = new OfflineCompiler(); await c.compileImageTargets([await load(id)], () => {});
  fs.writeFileSync(`public/targets/${id}.taar`, c.exportData()); console.log(id, (fs.statSync(`public/targets/${id}.taar`).size / 1024).toFixed(0), 'KB');
}
if (process.argv.includes('--all')) {
  const c = new OfflineCompiler(); await c.compileImageTargets(await Promise.all(ids.map(load)), () => {});
  fs.writeFileSync('public/medallions.taar', c.exportData()); fs.writeFileSync('public/data/medallions.json', JSON.stringify(ids)); console.log('combined', ids.length);
}
