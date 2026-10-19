// «Колокольчики ангелов»: a rhythm game over the instrumental «Вести ангельской внемли». Stars fall onto four bells; tap a bell when a star reaches it.
// The more you catch, the louder the angels' choir sings. No failing, no game over: the song always plays to the end.
const $ = id => document.getElementById(id), cv = $('cv'), g = cv.getContext('2d');
const map = await fetch('data/bells.json').then(r => r.json());
const FALL = 1.9, PERFECT = .11, GOOD = .22, MISS = .26;
const FREQ = [523.25, 698.46, 880, 1046.5], COL = ['#ffd86b', '#ff9fb8', '#8fd3ff', '#9df0c0'];   // chord tones of F major: they fit the music
let W = 0, H = 0, DPR = 1, LW = 0, X0 = 0, HY = 0, TY = 0;
function resize() { DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; LW = Math.min(W, 520) / 4; X0 = (W - LW * 4) / 2; HY = H * .78; TY = H * .22; }
addEventListener('resize', resize); resize();
const music = new Audio('audio/song/minus.mp3'), choir = new Audio('audio/family/choir.mp3'); choir.loop = true;
let ac, bus, choirGain, notes = [], t0 = 0, running = false, score = 0, combo = 0, best = 0, hits = 0, total = 0, pops = [], sparks = [], bounce = [0, 0, 0, 0], energy = 0, flash = [0, 0, 0, 0];
function unlock() {
  ac ||= new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); bus = ac.createGain(); bus.gain.value = .5; bus.connect(ac.destination);
  const src = ac.createMediaElementSource(choir); choirGain = ac.createGain(); choirGain.gain.value = 0; src.connect(choirGain); choirGain.connect(ac.destination);
}
function ding(l, soft) {   // a small bell: a few inharmonic partials with a quick fade
  if (!ac) return; const t = ac.currentTime, f = FREQ[l], v = soft ? .35 : 1;
  for (const [m, a, d] of [[1, .5, 1.1], [2.76, .25, .5], [5.4, .12, .25], [1.5, .15, .7]]) { const o = ac.createOscillator(), gn = ac.createGain(); o.type = 'sine'; o.frequency.value = f * m; gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(a * v, t + .006); gn.gain.exponentialRampToValueAtTime(.0008, t + d); o.connect(gn); gn.connect(bus); o.start(t); o.stop(t + d + .05); }
}
function start() {
  notes = map.notes.map(n => ({ ...n, state: 0 })); total = notes.length; score = combo = best = hits = 0; pops = []; sparks = []; energy = 0;
  $('start').hidden = $('end').hidden = true; $('hud').hidden = false; unlock(); music.currentTime = 0; choir.currentTime = 0; music.play(); choir.play().catch(() => {}); running = true; upd();
}
function upd() { $('score').textContent = '⭐ ' + score; $('combo').textContent = combo >= 3 ? '🔥 ' + combo : ''; }
function laneAt(x) { return Math.max(0, Math.min(3, Math.floor((x - X0) / LW))); }
function tap(x) {
  if (!running) return; const l = laneAt(x), now = music.currentTime; bounce[l] = 1; flash[l] = 1;
  let n = null; for (const q of notes) if (q.state === 0 && q.l === l && Math.abs(q.t - now) < GOOD + .05 && (!n || Math.abs(q.t - now) < Math.abs(n.t - now))) n = q;
  const cx = X0 + LW * (l + .5);
  if (!n) { ding(l, true); return; }   // a tap without a star: just a soft ring, nothing is lost
  const d = Math.abs(n.t - now), perfect = d < PERFECT; n.state = 1; hits++; combo++; best = Math.max(best, combo); score += perfect ? 2 : 1; upd(); ding(l);
  pops.push({ x: cx, y: HY - 70, t: 0, txt: perfect ? 'Отлично!' : 'Хорошо!', c: perfect ? '#fff1a8' : '#cfe6ff' });
  for (let i = 0; i < (perfect ? 16 : 9); i++) sparks.push({ x: cx, y: HY, vx: (Math.random() - .5) * 320, vy: -Math.random() * 360 - 60, life: 1, c: COL[l] });
  if (navigator.vibrate) navigator.vibrate(12);
}
cv.addEventListener('pointerdown', e => { e.preventDefault(); tap(e.clientX); });
addEventListener('keydown', e => { const k = { a: 0, s: 1, d: 2, f: 3, '1': 0, '2': 1, '3': 2, '4': 3 }[e.key]; if (k != null) tap(X0 + LW * (k + .5)); });
$('play').onclick = start; $('again').onclick = start;
music.onended = () => { running = false; choirGain && choirGain.gain.setTargetAtTime(0, ac.currentTime, .6); setTimeout(() => choir.pause(), 2500); const r = hits / total, st = r > .8 ? 3 : r > .5 ? 2 : 1; $('stars').textContent = '⭐'.repeat(st) + '☆'.repeat(3 - st); $('msg').textContent = `Поймано звёздочек: ${hits} из ${total}. Лучший ряд: ${best}. Ангелы тебя слышали!`; $('end').hidden = false; $('hud').hidden = true; };
const R = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(5), stars = Array.from({ length: 70 }, () => ({ x: R(), y: R(), r: .5 + R() * 1.5, p: R() * 6 }));
function bell(cx, cy, s, c, bn, fl) {
  g.save(); g.translate(cx, cy - s * .55); g.rotate(Math.sin(bn * 14) * .35 * bn); g.translate(0, s * .55);
  glow(0, -s * .1, s * (1.1 + fl * .6), c + (fl > .2 ? 'aa' : '44'));
  g.fillStyle = c; g.beginPath(); g.moveTo(-s * .12, -s * .8); g.quadraticCurveTo(-s * .5, -s * .75, -s * .5, -s * .1); g.quadraticCurveTo(-s * .5, s * .12, -s * .7, s * .25); g.lineTo(s * .7, s * .25); g.quadraticCurveTo(s * .5, s * .12, s * .5, -s * .1); g.quadraticCurveTo(s * .5, -s * .75, s * .12, -s * .8); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-s * .25, -s * .35, s * .08, s * .25, .25, 0, 7); g.fill();
  g.fillStyle = '#8a5a14'; g.beginPath(); g.arc(0, s * .3, s * .12, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(0, -s * .88, s * .1, 0, 7); g.fill(); g.restore();
}
function glow(x, y, r, c, c1) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, c1 || (c[0] === '#' ? c.slice(0, 7) + '00' : 'rgba(255,255,255,0)')); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
function star(x, y, r, c) { glow(x, y, r * 2.2, c + '88'); g.fillStyle = '#fff'; g.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? r * .45 : r, a = k / 10 * 6.283 - 1.5708; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); g.fillStyle = c; g.beginPath(); g.arc(x, y, r * .45, 0, 7); g.fill(); }
function angel(x, y, s, t, ph, e) {
  g.save(); g.translate(x, y); glow(0, 0, s * (1.3 + e * .8), 'rgba(255,238,190,' + (.25 + e * .4).toFixed(2) + ')'); const fl = Math.sin(t * 4 + ph) * .3;
  for (const sd of [-1, 1]) { g.save(); g.scale(sd, 1); g.rotate(-.5 - fl); g.fillStyle = 'rgba(255,253,245,.9)'; g.beginPath(); g.ellipse(s * .36, -s * .2, s * .45, s * .15, 0, 0, 7); g.fill(); g.restore(); }
  g.fillStyle = '#fffaf0'; g.beginPath(); g.moveTo(-s * .1, -s * .22); g.quadraticCurveTo(-s * .28, s * .2, -s * .32, s * .5); g.quadraticCurveTo(0, s * .6, s * .32, s * .5); g.quadraticCurveTo(s * .28, s * .2, s * .1, -s * .22); g.fill();
  g.fillStyle = '#ffe2bd'; g.beginPath(); g.arc(0, -s * .34, s * .12, 0, 7); g.fill(); g.strokeStyle = '#f0c850'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, -s * .52, s * .12, s * .035, 0, 0, 7); g.stroke();
  g.fillStyle = '#2a1a05'; g.beginPath(); g.ellipse(0, -s * .12, s * .035, s * .05 * (.4 + .6 * Math.abs(Math.sin(t * (5 + e * 3) + ph)) * (.4 + e)), 0, 0, 7); g.fill(); g.restore();
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; g.setTransform(DPR, 0, 0, DPR, 0, 0); const t = now / 1000, mt = music.currentTime;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#060a2e'); gr.addColorStop(.7, '#16207a'); gr.addColorStop(1, '#2b2f86'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (const s of stars) { g.fillStyle = `rgba(255,248,220,${.35 + .5 * Math.sin(t * 1.5 + s.p) ** 2})`; g.beginPath(); g.arc(s.x * W, s.y * H * .75, s.r, 0, 7); g.fill(); }
  // misses fall through quietly; the combo is only a bonus
  if (running) for (const n of notes) if (n.state === 0 && mt - n.t > MISS) { n.state = 2; combo = 0; upd(); }
  energy += (Math.min(1, combo / 16) - energy) * Math.min(1, dt * 2); if (choirGain) choirGain.gain.value = running ? .08 + energy * .8 : choirGain.gain.value;
  for (let i = 0; i < 5; i++) angel(W * (.1 + i * .2), H * .125 + (i % 2) * 14 + Math.sin(t * 1.6 + i) * 5, Math.min(W * .13, 64), t, i, energy);
  // lanes
  for (let l = 0; l < 4; l++) { const x = X0 + LW * l; g.fillStyle = `rgba(255,255,255,${.035 + flash[l] * .1})`; g.fillRect(x + 3, TY, LW - 6, H - TY); flash[l] = Math.max(0, flash[l] - dt * 4); bounce[l] = Math.max(0, bounce[l] - dt * 2.2); }
  g.strokeStyle = 'rgba(255,230,150,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(X0, HY); g.lineTo(X0 + LW * 4, HY); g.stroke();
  if (running) for (const n of notes) { if (n.state === 1) continue; const y = HY - (n.t - mt) / FALL * (HY - TY); if (y < TY - 30 || y > H + 30) continue; const cx = X0 + LW * (n.l + .5); g.globalAlpha = n.state === 2 ? Math.max(0, .5 - (mt - n.t - MISS) * 2) : Math.min(1, (y - TY) / 60); star(cx, y, Math.min(LW * .28, 26), COL[n.l]); g.globalAlpha = 1; }
  for (let l = 0; l < 4; l++) bell(X0 + LW * (l + .5), HY + Math.min(LW * .75, 70), Math.min(LW * .5, 46), COL[l], bounce[l], flash[l]);
  for (const s of sparks) { s.life -= dt * 1.6; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 700 * dt; g.globalAlpha = Math.max(0, s.life); g.fillStyle = s.c; g.beginPath(); g.arc(s.x, s.y, 3.5, 0, 7); g.fill(); } g.globalAlpha = 1; sparks = sparks.filter(s => s.life > 0);
  for (const p of pops) { p.t += dt; g.globalAlpha = Math.max(0, 1 - p.t * 1.3); g.font = '700 22px -apple-system, sans-serif'; g.textAlign = 'center'; g.fillStyle = p.c; g.fillText(p.txt, p.x, p.y - p.t * 60); } g.globalAlpha = 1; pops = pops.filter(p => p.t < .8);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__bells = { notes: () => notes, tap, get mt() { return music.currentTime; } };
