// The gingerbread's round picture for the home page (it has no medallion).
import sharp from 'sharp'; import fs from 'node:fs';
const S = 256, bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><defs><radialGradient id="g" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#ffd9a0"/><stop offset="1" stop-color="#c9661f"/></radialGradient></defs><circle cx="128" cy="128" r="126" fill="url(#g)"/><circle cx="128" cy="128" r="120" fill="none" stroke="#fff6dc" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/><g fill="#fff3b0"><circle cx="46" cy="58" r="3"/><circle cx="210" cy="70" r="4"/><circle cx="196" cy="206" r="3"/><circle cx="52" cy="196" r="4"/></g></svg>`);
const fig = await sharp('work/portraits/game.png').resize(S, S, { fit: 'inside' }).toBuffer();
fs.mkdirSync('public/medallions/thumb', { recursive: true });
await sharp(bg).composite([{ input: fig, gravity: 'center' }]).webp({ quality: 85 }).toFile('public/medallions/thumb/game.webp'); console.log('card ok');
