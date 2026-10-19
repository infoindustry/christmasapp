// Meshy USDZ with a baked skeletal animation -> small enough for a phone: the 4096 px texture becomes 1024 px (same file name/format, so the .usdc needs no edit),
// then the package is rebuilt with Apple's usdzip. Run: node tools/shrink_usdz.mjs "<folder with Meshy_AI_*.usdz>"
import sharp from 'sharp';
import { readdirSync, mkdirSync, rmSync, readdirSync as ls, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
const SRC = process.argv[2], OUT = 'public/usdz', TMP = '/private/tmp/claude-501/usdz-work', SIZE = +process.argv[3] || 1024;
const ID = [[/anna/, 'anna'], [/joseph/, 'joseph'], [/mary/, 'mary'], [/wise_man/, 'wiseman'], [/shepherd/, 'shepherd'], [/simeon_multiview/, 'simeon'], [/zechariah/, 'zechariah'], [/elizabeth/, 'elizabeth'], [/micah/, 'micah'], [/herod/, 'herod']];
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(SRC).filter(f => f.endsWith('.usdz'))) {
  const id = ID.find(([r]) => r.test(f))?.[1]; if (!id) { console.log('skip', f); continue; }
  const d = join(TMP, id); rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true });
  execFileSync('unzip', ['-q', '-o', join(SRC, f), '-d', d]);
  for (const t of ls(join(d, 'textures')).filter(n => /\.png$/i.test(n))) { const p = join(d, 'textures', t); const b = await sharp(p).resize(SIZE, SIZE, { fit: 'inside' }).png({ compressionLevel: 9, palette: false }).toBuffer(); await sharp(b).toFile(p + '.tmp'); execFileSync('mv', [p + '.tmp', p]); }
  const out = join(process.cwd(), OUT, id + '.usdz'); rmSync(out, { force: true });
  execFileSync('usdzip', [out, 'output.usdc', ...ls(join(d, 'textures')).map(n => 'textures/' + n)], { cwd: d });   // textures are listed explicitly (usdzip does not find them by itself)
  console.log(id, (statSync(out).size / 1048576).toFixed(1) + ' MB');
}
