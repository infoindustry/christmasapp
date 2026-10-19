// Note map for «Колокольчики ангелов»: the beat grid of the 40-second backing track (about 114 bpm, one line of the carol = 8 beats)
// keeps only the beats that really have a sound in the music (onset analysis), and spreads them over 4 bells. Run: node tools/make_bells.mjs (needs /tmp/minus.wav)
import { readFileSync, writeFileSync } from 'node:fs';
const b = readFileSync('/tmp/minus.wav'), n = (b.length - 44) / 2, x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = b.readInt16LE(44 + i * 2) / 32768;
const H = 256, sr = 22050, fr = Math.floor(n / H), e = new Float32Array(fr);
for (let f = 0; f < fr; f++) { let s = 0; for (let i = 0; i < H * 2 && f * H + i < n; i++) { const v = x[f * H + i]; s += v * v; } e[f] = Math.sqrt(s / (H * 2)); }
const on = []; for (let f = 2; f < fr - 2; f++) { const d = e[f] - e[f - 1]; if (d > 0.012 && d >= e[f - 1] - e[f - 2] && d >= e[f + 1] - e[f]) on.push(f * H / sr); }
const BEAT = 4.2 / 8, near = t => on.some(o => Math.abs(o - t) < 0.09);
let rnd = 7; const R = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
const notes = []; let lane = 1, rep = 0;
for (let k = 4; k * BEAT < 33.7; k++) {
  const t = +(k * BEAT).toFixed(3), strong = k % 2 === 0;
  if (!(strong || near(t))) continue;          // beats 1 and 3 of the bar always, the others only where the music has a sound
  if (!strong && R() < .35) continue;          // not too busy for children
  let l; do { l = (R() * 4) | 0; } while (l === lane && rep >= 1); rep = l === lane ? rep + 1 : 0; lane = l; notes.push({ t, l });
}
notes.push({ t: +(33.6).toFixed(3), l: 1 }, { t: 33.6, l: 2 }); // the closing chord: two bells together
writeFileSync('public/data/bells.json', JSON.stringify({ beat: BEAT, notes }));
console.log(notes.length, 'notes');
