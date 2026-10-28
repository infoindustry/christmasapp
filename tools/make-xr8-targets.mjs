// Image targets for the 8th Wall engine (public/targets/xr8/<id>.json + <id>_luminance.png), same format as 8thwall's image-target-cli:
// a portrait 3:4 target with a 480x640 grayscale luminance image. The square medallion is padded (not cropped) to 3:4 so the whole medallion is the target
// and the target's width is exactly the medallion's diameter.
import sharp from 'sharp';
import fs from 'node:fs';

const ids = JSON.parse(fs.readFileSync('public/data/witnesses.json', 'utf8')).filter(w => w.type !== 'game' && !w.nomarker).map(w => w.id);
fs.mkdirSync('public/targets/xr8', { recursive: true });
const make = async (id, name, dir) => {
  const src = await sharp(`${dir}/${id}.png`).flatten({ background: '#f4ecd8' }).toBuffer();   // transparent corners -> paper colour
  const { width: w, height: h } = await sharp(src).metadata();
  const H = Math.round(w * 4 / 3), pad = Math.floor((H - h) / 2);
  const padded = sharp(src).extend({ top: pad, bottom: H - h - pad, left: 0, right: 0, background: '#f4ecd8' });
  await padded.clone().resize({ height: 640 }).grayscale().png().toFile(`public/targets/xr8/${name}_luminance.png`);
  return { type: 'PLANAR', properties: { left: 0, top: 0, width: w, height: H, isRotated: false, originalWidth: w, originalHeight: H },
    imagePath: `targets/xr8/${name}_luminance.png`, metadata: null, name, resources: { luminanceImage: `${name}_luminance.png` } };
};
for (const id of ids) {
  // [current medallion, the previous (dark) design]: either one found means this witness
  fs.writeFileSync(`public/targets/xr8/${id}.json`, JSON.stringify([await make(id, id, 'art/medallions'), await make(id, `${id}-old`, 'art/medallions-old')]));
  console.log(id);
}
