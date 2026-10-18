// «Поём песню»: karaoke over the instrumental track. Words and timings live in data/song.json:
// { "title": "...", "lines": [{ "t": 0, "text": "..." }, ...] }  (t = start second; when t is missing the lines are spread evenly over the track)
const $ = id => document.getElementById(id), cv = $('cv'), g = cv.getContext('2d');
const demo = new URLSearchParams(location.search).has('demo');
const song = await fetch('data/song.json').then(r => r.json()).catch(() => ({ lines: [] }));
const audio = new Audio(song.audio || 'audio/song/minus.mp3'); audio.preload = 'auto';
const times = song.times?.length === 8 ? song.times : null; let lines = [], els = [], verse = 0;
if (demo) song.verses = [['Первая строчка песни', 'Вторая строчка песни', 'Третья строчка песни', 'Четвёртая строчка песни']];
$('ttl').textContent = song.title || 'Поём песню';
let dur = 40; audio.onloadedmetadata = () => { dur = audio.duration || 40; setVerse(verse); };
// the track is one verse: its eight lines start at data/song.json "times" (seconds); without them they are spread evenly
function setVerse(v) {
  verse = v; const vs = song.verses || [], txt = vs[v] || []; lines = txt.map((text, i) => ({ text, t: times ? times[i] : i * dur / txt.length }));
  $('lines').innerHTML = lines.map(l => `<div>${l.text}</div>`).join(''); els = [...$('lines').children];
  $('verses').innerHTML = vs.map((_, i) => `<button data-i="${i}" class="${i === v ? 'on' : ''}">Куплет ${i + 1}</button>`).join('');
}
$('verses').onclick = e => { const b = e.target.closest('button'); if (b) { setVerse(+b.dataset.i); audio.currentTime = 0; } };
setVerse(0); if (song.credit) $('credit').textContent = song.credit;
// ?tap: listen and press "Отметить" when each line starts; the eight seconds are printed to copy into song.json
if (new URLSearchParams(location.search).has('tap')) {
  let out = []; const show = () => { $('tap').textContent = out.length < 8 ? `Отметить строку ${out.length + 1}` : 'Готово'; $('tapout').textContent = JSON.stringify(out); };
  $('tap').hidden = false; $('tap').textContent = 'Нажми «Петь»: строка 1 отметится сама';
  audio.addEventListener('play', () => { if (!out.length) { out = [0]; show(); } });
  $('rst').addEventListener('click', () => { out = [0]; show(); });
  $('tap').onclick = () => { if (out.length && out.length < 8) out.push(+audio.currentTime.toFixed(1)); show(); };
}
let playing = false;
$('play').onclick = () => { if (playing) { audio.pause(); } else { audio.play(); } };
audio.onplay = () => { playing = true; $('play').textContent = '❚❚ Пауза'; }; audio.onpause = () => { playing = false; $('play').textContent = '▶ Петь'; };
audio.onended = () => { playing = false; $('play').textContent = '▶ Ещё раз'; };
$('rst').onclick = () => { audio.currentTime = 0; audio.play(); };
const rng = s => () => (s = (s * 16807) % 2147483647) / 2147483647, R = rng(11);
const stars = Array.from({ length: 60 }, () => ({ x: R(), y: R() * .8, r: .5 + R() * 1.6, p: R() * 6 }));
const notes = Array.from({ length: 10 }, (_, i) => ({ x: R(), y: R(), s: 14 + R() * 14, v: .02 + R() * .05, ch: '♪♫'[i % 2] }));
function frame(now) {
  const t = now / 1000, r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
  g.setTransform(dpr, 0, 0, dpr, 0, 0); const W = r.width, H = r.height; g.clearRect(0, 0, W, H);
  const beat = playing ? 1 : .4, ct = audio.currentTime;
  for (const s of stars) { g.fillStyle = `rgba(255,248,220,${.4 + .5 * Math.sin(t * 1.6 + s.p) ** 2})`; g.beginPath(); g.arc(s.x * W, s.y * H, s.r, 0, 7); g.fill(); }
  // a big star with rays that pulses with the music
  const sx = W / 2, sy = H * .22, pr = 1 + Math.sin(t * 3) * .06 * beat, gr = g.createRadialGradient(sx, sy, 0, sx, sy, 90 * pr); gr.addColorStop(0, 'rgba(255,240,180,.9)'); gr.addColorStop(1, 'rgba(255,240,180,0)'); g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, 90 * pr, 0, 7); g.fill();
  g.strokeStyle = 'rgba(255,246,210,.9)'; g.lineWidth = 2; const L = 48 * pr; g.beginPath(); g.moveTo(sx - L, sy); g.lineTo(sx + L, sy); g.moveTo(sx, sy - L * 1.2); g.lineTo(sx, sy + L * 1.2); g.stroke();
  // angels' choir: a row of simple glowing angels bobbing in time
  for (let i = 0; i < 5; i++) { const x = W * (.12 + i * .19), y = H * (.46 + (i % 2) * .05) + Math.sin(t * 2 + i) * 8 * beat, s = W * .13, fl = Math.sin(t * 4 + i) * .3 * beat; g.save(); g.translate(x, y); const gg = g.createRadialGradient(0, 0, 0, 0, 0, s); gg.addColorStop(0, 'rgba(255,238,190,.5)'); gg.addColorStop(1, 'rgba(255,238,190,0)'); g.fillStyle = gg; g.beginPath(); g.arc(0, 0, s, 0, 7); g.fill();
    for (const sd of [-1, 1]) { g.save(); g.scale(sd, 1); g.rotate(-.5 - fl); g.fillStyle = 'rgba(255,253,245,.9)'; g.beginPath(); g.ellipse(s * .36, -s * .2, s * .45, s * .15, 0, 0, 7); g.fill(); g.restore(); }
    g.fillStyle = '#fffaf0'; g.beginPath(); g.moveTo(-s * .1, -s * .22); g.quadraticCurveTo(-s * .28, s * .2, -s * .32, s * .5); g.quadraticCurveTo(0, s * .6, s * .32, s * .5); g.quadraticCurveTo(s * .28, s * .2, s * .1, -s * .22); g.fill();
    g.fillStyle = '#ffe2bd'; g.beginPath(); g.arc(0, -s * .34, s * .12, 0, 7); g.fill(); g.strokeStyle = '#f0c850'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(0, -s * .52, s * .12, s * .035, 0, 0, 7); g.stroke();
    g.fillStyle = '#2a1a05'; g.beginPath(); g.ellipse(0, -s * .12 + 0, s * .035, s * .05 * (.4 + .6 * Math.abs(Math.sin(t * 5 + i * 1.3) * beat)), 0, 0, 7); g.fill(); g.restore(); }
  for (const n of notes) { const y = ((n.y - t * n.v * beat * .5) % 1 + 1) % 1; g.font = `${n.s}px serif`; g.fillStyle = `rgba(255,230,150,${.5 * Math.sin(y * Math.PI)})`; g.fillText(n.ch, n.x * W, y * H); }
  // current line
  let cur = -1; for (let i = 0; i < lines.length; i++) if (ct >= lines[i].t) cur = i;
  els.forEach((e, i) => { e.classList.toggle('on', i === cur); e.classList.toggle('past', i < cur - 1); e.classList.toggle('far', i > cur + 2); });
  $('prog').firstElementChild.style.width = (dur ? ct / dur * 100 : 0) + '%';
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
