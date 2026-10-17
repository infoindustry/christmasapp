// Compile the printed page into a Locus AR .taar tracking target.
import sharp from 'sharp';
import fs from 'node:fs';
import { OfflineCompiler } from 'locus-ar';

const src = process.argv[2] || 'public/page-print.png';
const out = process.argv[3] || 'public/page.taar';
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const compiler = new OfflineCompiler();
await compiler.compileImageTargets([{ width: info.width, height: info.height, data: new Uint8Array(data) }],
  p => process.stdout.write(`\rcompiling ${p.toFixed(0)}%`));
fs.writeFileSync(out, compiler.exportData());
console.log(`\n${out}: ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
