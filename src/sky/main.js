// «Небо Рождества»: the phone is a window to the sky (gyroscope; drag on desktop).
//  beth: find the Bethlehem star, hear the angels' announcement (Luke 2:10-14), angels fly across the sky, the choir sings from their side.
//  magi: a real star map of the sky of Persia in 7 BC (Jupiter and Saturn met three times in Pisces), with planets, constellations and dates.
import * as THREE from 'three';
import { createChoir } from '../choir.js';
import { makeDate, skyAt, julianText, localHours, sepDeg, altAz, dirOf, BODIES } from './astro.js';
const $ = id => document.getElementById(id), D = Math.PI / 180;
const cvs = $('sky'), g = cvs.getContext('2d'), vid = $('cam');
let W = 0, H = 0, DPR = 1, F = 600, FOV = 65;
const resize = () => { DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cvs.width = W * DPR; cvs.height = H * DPR; F = Math.max(W, H) / 2 / Math.tan(FOV * D / 2); };
addEventListener('resize', resize); resize();
const cat = await fetch('sky/sky.json').then(r => r.json());
const PERSIA = { lat: 35.69, lon: 51.39 }, BETH = { lat: 31.70, lon: 35.20 };
let mode = null, sky = null, useCam = false, t0 = performance.now(), subs = false;
try { subs = localStorage.getItem('subs') === '1'; } catch { }

// ---------- camera orientation: gyroscope (if the phone has one) + drag ----------
const view = { yaw: 0, pitch: 20, off: 0 }, cam = new THREE.Quaternion(), sens = { on: false, q: new THREE.Quaternion(), has: false };
const _e = new THREE.Euler(), _q1 = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2), _z = new THREE.Vector3(0, 0, 1), _t = new THREE.Quaternion();
function onOri(e) {
  if (e.beta == null || e.alpha == null && e.webkitCompassHeading == null) return;
  const a = e.webkitCompassHeading != null ? 360 - e.webkitCompassHeading : e.alpha, scr = (screen.orientation?.angle ?? window.orientation ?? 0) * D;
  _e.set(e.beta * D, a * D, -e.gamma * D, 'YXZ'); sens.q.setFromEuler(_e); sens.q.multiply(_q1); sens.q.multiply(_t.setFromAxisAngle(_z, -scr)); sens.has = true;
}
async function startSensors() {
  try { if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) { if (await DeviceOrientationEvent.requestPermission() !== 'granted') return; } } catch { return; }
  addEventListener('deviceorientationabsolute', e => { sens.abs = true; onOri(e); }); addEventListener('deviceorientation', e => { if (!sens.abs) onOri(e); });
  await new Promise(r => setTimeout(r, 700)); sens.on = sens.has;
}
let drag = null;
cvs.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw: view.yaw, pitch: view.pitch, off: view.off }; cvs.setPointerCapture(e.pointerId); goal = null; });
cvs.addEventListener('pointermove', e => { if (!drag) return; const k = (FOV / Math.max(W, H)) * (sens.on ? 1 : 1.0), dx = (e.clientX - drag.x) * k, dy = (e.clientY - drag.y) * k; if (sens.on) view.off = drag.off + dx; else { view.yaw = drag.yaw + dx; view.pitch = Math.max(-89, Math.min(89, drag.pitch + dy)); } });
cvs.addEventListener('pointerup', () => drag = null); cvs.addEventListener('pointercancel', () => drag = null);
cvs.addEventListener('wheel', e => { FOV = Math.max(20, Math.min(100, FOV * (1 + e.deltaY * 0.001))); resize(); }, { passive: true });
const _tq = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
let goal = null;  // {alt, az}: smooth turn of the view (no gyroscope)
function updateCam() {
  if (goal && !sens.on) { const cur = { yaw: view.yaw, pitch: view.pitch }; let dy = ((goal.az * -1 - cur.yaw + 540) % 360) - 180; view.yaw += dy * 0.08; view.pitch += (goal.alt - cur.pitch) * 0.08; if (Math.abs(dy) < .3 && Math.abs(goal.alt - view.pitch) < .3) goal = null; }
  if (sens.on) { _tq.copy(sens.q); if (view.off) _tq.premultiply(_t.setFromAxisAngle(_up, view.off * D)); cam.slerp(_tq, 0.4); }
  else cam.setFromEuler(_e.set(view.pitch * D, view.yaw * D, 0, 'YXZ'));
}
// projection: world direction -> screen (camera looks along -z; x right, y up)
const R = new Float32Array(9);
function setR() { const m = new THREE.Matrix4().makeRotationFromQuaternion(cam).elements; R.set([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]); }
const P = [0, 0, 0];
function proj(x, y, z) { P[0] = R[0] * x + R[1] * y + R[2] * z; P[1] = R[3] * x + R[4] * y + R[5] * z; P[2] = R[6] * x + R[7] * y + R[8] * z; return P[2] < -0.02; }
let CY = 0;   // the screen row of the view centre: higher than the middle on the star map, so the bottom sheet does not cover the planets
const sx = () => W / 2 + P[0] / -P[2] * F, sy = () => CY - P[1] / -P[2] * F;
const forward = () => { const m = new THREE.Matrix4().makeRotationFromQuaternion(cam).elements; return [-m[8], -m[9], -m[10]]; };
const lookAt = v => { const f = forward(); return sepDeg(f, v); };
// goto an object when there is no gyroscope
const turnTo = v => { const a = altAz(v); goal = { alt: a.alt, az: a.az }; };

// ---------- audio ----------
const choir = createChoir(); const voice = new Audio(); let voiceEnd = null;
voice.onended = () => { const f = voiceEnd; voiceEnd = null; f?.(); };
function speak(src, onend) { voice.pause(); voiceEnd = onend || null; voice.src = src; voice.play().catch(() => onend && setTimeout(() => { if (voiceEnd === onend) { voiceEnd = null; onend(); } }, 4000)); }
// everything that needs a user gesture (iOS) is prepared in the tap on the mode card: the voice element, the audio context and the choir
function unlockAudio() { choir.unlock(); }
function startChoir() { choir.start(); }
const caption = t => { const c = $('cap'); c.textContent = t; c.hidden = !subs || !t; };
$('cc').onclick = () => { subs = !subs; try { localStorage.setItem('subs', subs ? '1' : '0'); } catch { } $('cc').classList.toggle('on', subs); if (!subs) $('cap').hidden = true; else if ($('cap').textContent) $('cap').hidden = false; };
$('cc').classList.toggle('on', subs);

// ---------- shared drawing ----------
const ease = x => x * x * (3 - 2 * x);
function drawStars(alpha, lines) {
  const S = sky.stars, M = sky.mags, buckets = [[], [], [], [], [], []];
  for (let i = 0; i < M.length; i++) { if (!proj(S[i * 3], S[i * 3 + 1], S[i * 3 + 2])) continue; const x = sx(), y = sy(); if (x < -5 || x > W + 5 || y < -5 || y > H + 5) continue; buckets[Math.max(0, Math.min(5, Math.floor(M[i] + 1)))].push(x, y); }
  buckets.forEach((b, k) => { const r = Math.max(.7, (5.2 - k) * .62) * Math.min(1.6, F / 700 + .4); g.fillStyle = `rgba(255,248,235,${Math.min(1, (0.45 + (5 - k) * .13)) * alpha})`; g.beginPath(); for (let i = 0; i < b.length; i += 2) { g.moveTo(b[i] + r, b[i + 1]); g.arc(b[i], b[i + 1], r, 0, 7); } g.fill(); });
  if (lines) for (const c of sky.lines) { const hot = lines && c.id === lines; if (!hot) continue; g.strokeStyle = `rgba(240,200,110,${.85 * alpha})`; g.lineWidth = hot ? 2.2 : 1; g.beginPath(); for (const part of c.parts) { let pen = false; for (const v of part) { if (proj(v[0], v[1], v[2])) { const x = sx(), y = sy(); pen ? g.lineTo(x, y) : g.moveTo(x, y); pen = true; } else pen = false; } } g.stroke(); }
}
function label(text, x, y, size, color, dx = 0) { g.font = `${size}px -apple-system, "Segoe UI", sans-serif`; g.fillStyle = color; g.textAlign = dx ? 'left' : 'center'; g.fillText(text, x + dx, y); }
function glow(x, y, r, c0, c1 = 'rgba(255,255,255,0)') { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
function drawGround(hill, houses) {
  const step = 3, N = 360 / step; g.fillStyle = '#03040c';
  for (let i = 0; i < N; i++) {
    const az1 = i * step, az2 = az1 + step, h1 = hill(az1), h2 = hill(az2), a = dirOf(h1, az1), b = dirOf(h2, az2), c = dirOf(-85, az2), d = dirOf(-85, az1);
    if (!(proj(...a))) continue; const ax = sx(), ay = sy(); if (!proj(...b)) continue; const bx = sx(), by = sy(); if (!proj(...c)) continue; const cx = sx(), cy = sy(); if (!proj(...d)) continue;
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.lineTo(cx, cy); g.lineTo(sx(), sy()); g.closePath(); g.fill();
  }
  // the horizon below the hills: fill everything lower than the strips' bottoms with the same colour (the sky is looked at from above only slightly)
  if (houses) for (const h of houses) { const v = dirOf(hill(h.az) + .15, h.az); if (!proj(...v)) continue; const x = sx(), y = sy(), w = h.w * D * F; g.fillStyle = '#03040c'; g.fillRect(x - w / 2, y - w * .55, w, w * .55); g.beginPath(); g.moveTo(x - w * .6, y - w * .55); g.lineTo(x, y - w * 1.05); g.lineTo(x + w * .6, y - w * .55); g.fill(); if (h.lit) { g.fillStyle = 'rgba(255,205,110,.95)'; g.fillRect(x - w * .12, y - w * .38, w * .24, w * .2); } }
}
function arrowTo(v, text) {
  const a = $('arrow'); if (!proj(...v)) { /* behind */ } const x = P[0], y = P[1], z = P[2]; let sxp = W / 2 + x / -z * F, syp = CY - y / -z * F; const inside = z < -0.02 && sxp > 30 && sxp < W - 30 && syp > 60 && syp < H - 30;
  if (inside) { a.hidden = true; return; } a.hidden = false; let ang = Math.atan2(-y, x); if (z >= -0.02) ang = Math.atan2(-y, x || 1);
  const rx = W / 2 - 40, ry = (mode === 'magi' ? H * .3 : H / 2) - 90, k = 1 / Math.max(Math.abs(Math.cos(ang)) / rx, Math.abs(Math.sin(ang)) / ry); a.style.transform = `translate(${W / 2 + Math.cos(ang) * k - 19}px,${CY + 20 + Math.sin(ang) * k * .98 - 19}px) rotate(${ang}rad)`;
}

// ---------- Bethlehem ----------
const BS = { phase: 'seek', t: 0, star: null, hold: 0, angels: [], houses: [], hills: null, azStar: 0 };
function startBeth() {
  mode = 'beth'; $('ttl').textContent = 'Небо над Вифлеемом'; $('magi').hidden = true; $('end').hidden = true;
  sky = skyAt(makeDate(-4, 12, 20, 22, BETH.lon), BETH.lat, BETH.lon, cat);   // a December night over Bethlehem (the date of the birth is not known)
  const az = Math.random() * 360, alt = 38 + Math.random() * 14; BS.azStar = az; BS.star = dirOf(alt, az); BS.starAlt = alt; BS.phase = 'seek'; BS.t = 0; BS.hold = 0; BS.angels = []; BS.beam = 0; BS.bloom = 0;
  const ph = Math.random() * 6, ph2 = Math.random() * 6; BS.hills = a => 1.5 + 1.1 * Math.sin(a * D * 3 + ph) + .7 * Math.sin(a * D * 7 + ph2) + 1.0;
  BS.houses = Array.from({ length: 34 }, (_, i) => { const az0 = (az + 180 + (Math.random() - .5) * 70 + 360) % 360; return { az: az0, w: .8 + Math.random() * 1.1, lit: Math.random() < .6 }; });
  if (!useCam) view.yaw = -((az + 120) % 360), view.pitch = 12;   // start looking away from the star: the child has to find it
  $('hint').textContent = 'Поверни телефон вокруг. Найди яркую звезду и держи её в круге.'; caption('Найди Вифлеемскую звезду.');
}
function makeAngels() {
  const n = 15; BS.angels = Array.from({ length: n }, (_, i) => ({ i, big: i === 0, a0: BS.starAlt - 6 + (Math.random() - .5) * 40, z0: BS.azStar + (Math.random() - .5) * 100, wa: .15 + Math.random() * .15, wz: .1 + Math.random() * .12, pa: Math.random() * 6, pz: Math.random() * 6, delay: i * .5, sz: i === 0 ? 11 : 4.5 + Math.random() * 2.5 }));
  BS.angels[0].a0 = BS.starAlt - 9; BS.angels[0].z0 = BS.azStar; BS.angels[0].wa = .1; BS.angels[0].wz = .08;
}
function drawAngel(x, y, s, t, ph, al) {
  g.save(); g.globalAlpha = al; g.translate(x, y); glow(0, -s * .1, s * 1.5, 'rgba(255,238,190,.55)');
  const fl = Math.sin(t * 4.2 + ph) * .35; for (const sd of [-1, 1]) { g.save(); g.scale(sd, 1); g.rotate(-.55 - fl); g.fillStyle = 'rgba(255,253,245,.92)'; g.beginPath(); g.ellipse(s * .38, -s * .22, s * .5, s * .17, 0, 0, 7); g.fill(); g.rotate(.42); g.fillStyle = 'rgba(255,250,235,.8)'; g.beginPath(); g.ellipse(s * .34, -s * .05, s * .42, s * .13, 0, 0, 7); g.fill(); g.restore(); }
  g.fillStyle = '#fffaf0'; g.beginPath(); g.moveTo(-s * .12, -s * .24); g.quadraticCurveTo(-s * .3, s * .25, -s * .34, s * .55); g.quadraticCurveTo(0, s * .66, s * .34, s * .55); g.quadraticCurveTo(s * .3, s * .25, s * .12, -s * .24); g.closePath(); g.fill();
  g.fillStyle = '#ffe2bd'; g.beginPath(); g.arc(0, -s * .36, s * .13, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,215,100,.95)'; g.lineWidth = Math.max(1.2, s * .035); g.beginPath(); g.ellipse(0, -s * .56, s * .13, s * .04, 0, 0, 7); g.stroke(); g.restore();
}
function drawBeth(t, dt) {
  const f = forward(); BS.t += dt;
  const sunk = !useCam; if (!useCam) { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#01020a'); gr.addColorStop(.6, '#0a1236'); gr.addColorStop(1, '#1a2457'); g.fillStyle = gr; g.fillRect(0, 0, W, H); } else g.clearRect(0, 0, W, H);
  drawStars(useCam ? .8 : 1, false);
  if (sunk) drawGround(BS.hills, BS.houses);
  // the star
  const sep = lookAt(BS.star), found = BS.phase !== 'seek';
  if (proj(...BS.star)) { const x = sx(), y = sy(), pulse = 1 + Math.sin(t * 2.2) * .08, R0 = (found ? 80 + 40 * Math.min(1, BS.bloom) : 34) * pulse; BS.bloom = Math.min(1.3, BS.bloom + dt * .8 * (found ? 1 : 0));
    if (found && proj(...dirOf(BS.hills ? BS.hills(BS.azStar) : 0, BS.azStar))) { const bx = sx(), by = sy(); const gr = g.createLinearGradient(x, y, bx, by); gr.addColorStop(0, 'rgba(255,236,160,.6)'); gr.addColorStop(1, 'rgba(255,236,160,0)'); g.fillStyle = gr; const hw = 26 * Math.min(1, BS.bloom); g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + 4, y); g.lineTo(bx + hw, by); g.lineTo(bx - hw, by); g.fill(); proj(...BS.star); }
    glow(x, y, R0 * 1.6, 'rgba(255,236,170,.65)'); glow(x, y, R0 * .45, 'rgba(255,255,240,.95)'); g.strokeStyle = 'rgba(255,245,210,.9)'; g.lineWidth = 2; const L = R0 * (found ? 1.5 : 1.1); g.beginPath(); g.moveTo(x - L, y); g.lineTo(x + L, y); g.moveTo(x, y - L * 1.2); g.lineTo(x, y + L * 1.2); g.stroke(); g.lineWidth = 1; g.beginPath(); g.moveTo(x - L * .55, y - L * .55); g.lineTo(x + L * .55, y + L * .55); g.moveTo(x + L * .55, y - L * .55); g.lineTo(x - L * .55, y + L * .55); g.stroke(); }
  if (BS.phase === 'seek') {
    arrowTo(BS.star); const near = sep < 6; BS.hold = near ? BS.hold + dt : Math.max(0, BS.hold - dt * 2); $('ring').hidden = !near && BS.hold < .05; $('ring').style.setProperty('--p', Math.min(1, BS.hold / 1.4));
    if (BS.hold > 1.4) { BS.phase = 'found'; $('ring').hidden = true; $('arrow').hidden = true; $('hint').textContent = ''; caption('Вот она, Вифлеемская звезда! Её увидели мудрецы с востока. А пастухам в ту ночь явился ангел.'); speak('audio/sky/s1.mp3', () => { BS.phase = 'announce'; caption('«Не бойтесь; я возвещаю вам великую радость, которая будет всем людям: ибо ныне родился вам в городе Давидовом Спаситель, Который есть Христос Господь».'); makeAngels(); BS.tA = BS.t; speak('audio/sky/s2.mp3', () => { BS.phase = 'sing'; startChoir(); caption('«Слава в вышних Богу, и на земле мир, в человеках благоволение!»'); speak('audio/sky/s3.mp3', () => { BS.phase = 'done'; caption(''); $('end').hidden = false; }); }); }); if (navigator.vibrate) navigator.vibrate(60); }
  }
  // angels fly across the sky (and the choir sings from where they are)
  if (BS.angels.length) {
    const G = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]; const list = [];
    for (const a of BS.angels) { const al = ease(Math.max(0, Math.min(1, (BS.t - BS.tA - a.delay) / 1.6))); if (al <= 0) continue; const alt = Math.max(6, Math.min(80, a.a0 + 3 * Math.sin(BS.t * a.wa + a.pa))), azm = a.z0 + 7 * Math.sin(BS.t * a.wz + a.pz), v = dirOf(alt, azm); const g3 = G[a.i % 3]; g3[0] += v[0] * al; g3[1] += v[1] * al; g3[2] += v[2] * al; g3[3] += al; list.push([v, a, al]); }
    list.sort((p, q) => p[1].sz - q[1].sz);
    for (const [v, a, al] of list) if (proj(...v)) drawAngel(sx(), sy(), a.sz * D * F * 1.1, BS.t, a.pa, al);
    if (choir.ready) choir.place(G.map(g3 => { if (!g3[3]) return null; proj(g3[0] / g3[3], g3[1] / g3[3], g3[2] / g3[3]); return [P[0] * 6, P[1] * 6, P[2] * 6]; }));   // camera space: the listener stays at the origin, facing -z
  }
}

// ---------- the sky of the Magi ----------
const MP = [
  { n: 'Май', g: [-6, 5, 27], f: s => s.bodies.Jupiter.v, lab: ['Jupiter', 'Saturn'], hot: 'Psc', a: 'm1', t: 'Две яркие звезды рядом: это Юпитер и Сатурн. Они встретились в созвездии Рыбы.' },
  { n: 'Октябрь', g: [-6, 10, 1], f: s => s.bodies.Jupiter.v, lab: ['Jupiter', 'Saturn'], hot: 'Psc', a: 'm1', t: 'Они разошлись и встретились снова.' },
  { n: 'Декабрь', g: [-6, 12, 3], f: s => s.bodies.Jupiter.v, lab: ['Jupiter', 'Saturn'], hot: 'Psc', a: 'm1', t: 'Третья встреча за один год. Это очень редко!' },
  { n: 'Парад планет', g: [-5, 2, 19], f: s => s.bodies.Jupiter.v, lab: ['Mars', 'Jupiter', 'Saturn', 'Moon'], hot: 'Psc', a: 'm2', t: 'Весна, на следующий год. В Рыбах собрались Марс, Юпитер, Сатурн и молодая Луна.' },
  { n: 'Луна и Юпитер', g: [-5, 4, 15], hour: 5.5, f: s => s.bodies.Jupiter.v, lab: ['Moon', 'Jupiter'], hot: 'Ari', a: 'm3', t: 'Луна подошла к Юпитеру почти вплотную. Утром он взошёл на востоке, в созвездии Овна.' },
  { n: 'Новая звезда', g: [-4, 3, 23], f: s => s.nova, lab: [], hot: 'Cap', nova: true, a: 'm4', t: 'Китайские астрономы записали новую яркую звезду в созвездии Козерога. Она светила около 70 дней.' },
  { n: 'Комета', g: [-4, 3, 28], f: s => s.comet.head, lab: [], hot: 'Cap', comet: true, a: 'm5', t: 'В те же месяцы летописи рассказывают о «хвостатой звезде»: так назвали комету.' },
  { n: 'Сейчас', now: true, f: s => s.bodies.Jupiter.v, lab: ['Jupiter', 'Saturn', 'Moon'], hot: null, a: 'm1', t: 'Так выглядит небо над тобой сейчас. Найди Юпитер и Сатурн.' },
];
const MS = { p: 0, days: 0, hour: 22, loc: PERSIA };
function magiDate(p) { if (p.now) return new Date(Date.now() + MS.days * 864e5); const [y, m, d] = p.g; return makeDate(y, m, d + MS.days, MS.hour, MS.loc.lon); }
let magiSky = null, dirty = true, target = null;
function bestHour(p) {
  if (p.hour != null) return p.hour;
  let best = { h: 22, alt: -99 }; const [y, m, d] = p.g;
  for (let h = 0; h < 24; h += .25) { const s = skyAt(makeDate(y, m, d, h, MS.loc.lon), MS.loc.lat, MS.loc.lon, { stars: [], lines: [], cons: [], named: [] }), al = altAz(p.f(s)).alt; if (s.sunAlt < -6 && al > best.alt) best = { h, alt: al }; }
  return best.h;
}
function pickPreset(i) {
  MS.p = i; MS.days = 0; const p = MP[i]; MS.hour = p.now ? localHours(new Date(), MS.loc.lon) : bestHour(p);
  $('hour').value = MS.hour; [...$('presets').children].forEach((b, k) => b.classList.toggle('on', k === i)); dirty = true;
  setTimeout(() => { if (magiSky && !sens.on) turnTo(MP[MS.p].f(magiSky)); }, 80);
}
function refreshMagi() {
  const p = MP[MS.p], date = magiDate(p); magiSky = sky = skyAt(date, MS.loc.lat, MS.loc.lon, cat);
  const lh = localHours(date, MS.loc.lon), tm = Math.round(lh * 60) % 1440, h = Math.floor(tm / 60), mn = tm % 60;
  $('mdate').textContent = p.now ? date.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' }) : julianText(date).replace(/^(\d+ \S+) (\d+) г\. до н\. э\./, '$1, $2 год до Рождества');
  $('hlab').textContent = `${String(h).padStart(2, '0')}:${String(mn).padStart(2, '0')}`; $('hour').value = lh;
  const ja = altAz(p.f(sky)); $('minfo').textContent = p.t + (ja.alt < 0 ? ' Сейчас это под горизонтом: подвинь час в «Ещё».' : '');
  dirty = false;
}
function startMagi() {
  mode = 'magi'; $('ttl').textContent = 'Небо волхвов'; $('end').hidden = true; $('arrow').hidden = true; $('ring').hidden = true; caption('');
  $('magi').hidden = false; $('hint').textContent = ''; zoomed = false; FOV = 65; resize(); $('presets').innerHTML = MP.map((p, i) => `<button data-i="${i}">${p.n}</button>`).join('');
  pickPreset(0);
}
$('presets').onclick = async e => { const b = e.target.closest('button'); if (!b) return; const i = +b.dataset.i; if (MP[i].now) await new Promise(r => navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => { MS.loc = { lat: p.coords.latitude, lon: p.coords.longitude }; r(); }, () => r(), { timeout: 4000 }) : r()); else MS.loc = PERSIA; target = null; pickPreset(i); };
$('hour').oninput = e => { MS.hour = +e.target.value; dirty = true; };
document.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { MS.days += +b.dataset.d; dirty = true; });
$('findj').onclick = () => { if (magiSky) { target = magiSky.bodies.Jupiter.v; turnTo(target); } }; $('finds').onclick = () => { if (magiSky) { target = magiSky.bodies.Saturn.v; turnTo(target); } };
let zoomed = false; $('zoom').onclick = () => { zoomed = !zoomed; FOV = zoomed ? 16 : 65; resize(); $('zoom').textContent = zoomed ? '🔍 Отдалить' : '🔍 Приблизить'; if (zoomed && magiSky && !sens.on) turnTo(MP[MS.p].f(magiSky)); };
$('tell').onclick = () => speak(`audio/sky/${MP[MS.p].a}.mp3`);
function moonAt(x, y, mv) {
  const sv = sky.bodies.Sun.v, cosE = mv[0] * sv[0] + mv[1] * sv[1] + mv[2] * sv[2], ci = -cosE, r = 12;   // i = phase angle = 180 - elongation
  // screen direction toward the Sun
  const dd = cosE, tx = sv[0] - mv[0] * dd, ty = sv[1] - mv[1] * dd, tz = sv[2] - mv[2] * dd, tl = Math.hypot(tx, ty, tz) || 1; const m2 = [mv[0] + tx / tl * .02, mv[1] + ty / tl * .02, mv[2] + tz / tl * .02]; let ang = 0;
  if (proj(...m2)) { const x2 = sx(), y2 = sy(); ang = Math.atan2(y2 - y, x2 - x); }
  glow(x, y, 34, 'rgba(230,236,255,.35)'); g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = '#2a3150'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
  g.fillStyle = '#f1f3fb'; g.beginPath(); g.arc(0, 0, r, -Math.PI / 2, Math.PI / 2); g.fill(); g.fillStyle = ci > 0 ? '#f1f3fb' : '#2a3150'; g.beginPath(); g.ellipse(0, 0, Math.abs(ci) * r, r, 0, 0, 7); g.fill(); g.restore();
}
// the records of the Han court astronomers: a new star and a comet in Capricornus (the place is approximate)
function extras(pp, t) {
  if (pp.nova && proj(...sky.nova)) { const x = sx(), y = sy(), pu = 1 + Math.sin(t * 2.4) * .1; glow(x, y, 70 * pu, 'rgba(255,240,190,.75)'); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,248,215,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 34 * pu, y); g.lineTo(x + 34 * pu, y); g.moveTo(x, y - 34 * pu); g.lineTo(x, y + 34 * pu); g.stroke(); label('Новая звезда', x, y + 62, 20, '#ffe9b0'); }
  if (pp.comet) { const c = sky.comet; if (proj(...c.head)) { const hx = sx(), hy = sy(); const pts = []; for (let k = 0; k <= 24; k++) { const th = k / 24 * 14 * D, cs = Math.cos(th), sn = Math.sin(th); pts.push(proj(c.head[0] * cs + c.away[0] * sn, c.head[1] * cs + c.away[1] * sn, c.head[2] * cs + c.away[2] * sn) ? [sx(), sy()] : null); }
      const end = pts.filter(Boolean).pop() || [hx, hy], gr = g.createLinearGradient(hx, hy, end[0], end[1]); gr.addColorStop(0, 'rgba(210,235,255,.9)'); gr.addColorStop(1, 'rgba(210,235,255,0)'); const nx = -(end[1] - hy), ny = end[0] - hx, nl = Math.hypot(nx, ny) || 1, w = 16; g.fillStyle = gr; g.beginPath(); g.moveTo(hx + nx / nl * 5, hy + ny / nl * 5); g.lineTo(end[0] + nx / nl * w, end[1] + ny / nl * w); g.lineTo(end[0] - nx / nl * w, end[1] - ny / nl * w); g.lineTo(hx - nx / nl * 5, hy - ny / nl * 5); g.fill(); glow(hx, hy, 30, 'rgba(235,245,255,.9)'); g.fillStyle = '#fff'; g.beginPath(); g.arc(hx, hy, 5, 0, 7); g.fill(); label('Хвостатая звезда', hx, hy - 24, 20, '#ffe9b0'); } }
}
let t0n = 0;
function drawMagi() {
  const sa = sky.sunAlt, dark = Math.max(0, Math.min(1, (-sa - 1) / 14)), day = Math.max(0, Math.min(1, (sa + 4) / 10));
  if (!useCam) { const top = `rgb(${Math.round(1 + 50 * day)},${Math.round(2 + 110 * day + 6 * (1 - dark))},${Math.round(10 + 190 * day + 20 * (1 - dark))})`, bot = `rgb(${Math.round(8 + 190 * day)},${Math.round(14 + 150 * day)},${Math.round(40 + 120 * day)})`; const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, W, H); } else g.clearRect(0, 0, W, H);
  const pp = MP[MS.p]; drawStars(Math.max(0.05, dark) * (useCam ? .85 : 1), pp.hot);
  for (const c of sky.cons) if (c.id === pp.hot && proj(...c.v)) { const x = sx(), y = sy(); if (x > 0 && x < W && y > 50 && y < H - 160) label(c.ru, x, y, 20, `rgba(245,210,120,${.95 * dark})`); }
  if (!useCam) drawGround(() => 0, null);
  for (const [id] of BODIES) { const b = sky.bodies[id]; if (!proj(...b.v)) continue; const x = sx(), y = sy(); if (altAz(b.v).alt < -1 && !useCam) continue; const big = pp.lab.includes(id);
    if (id === 'Sun') { glow(x, y, 60, 'rgba(255,230,150,.9)'); g.fillStyle = '#fff6c8'; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); label('Солнце', x, y + 34, 12, '#fff'); continue; }
    if (id === 'Moon') { moonAt(x, y, b.v); if (pp.lab.includes('Moon')) label('Луна', x, y + 30, 20, '#dfe6ff'); continue; }
    const col = { Jupiter: '#ffe6a8', Saturn: '#ead9a2', Venus: '#ffffff', Mars: '#ff9b78', Mercury: '#cfd3dc' }[id], r = big ? 5.5 : 4; glow(x, y, big ? 26 : 16, col + '88', col + '00'); g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    if (big) label(b.ru, x, y + (id === 'Saturn' || id === 'Mars' ? 30 : -20), 20, '#ffe9b0'); }
  extras(pp, t0n);
  arrowTo(target || pp.f(sky));
  if (!useCam) for (const [az, tx] of [[0, 'С'], [90, 'В'], [180, 'Ю'], [270, 'З']]) if (proj(...dirOf(1.2, az))) label(tx, sx(), sy() - 6, 22, '#f3d48a');
}

// ---------- start / loop ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now; CY = mode === 'magi' ? H * .3 : H / 2; g.setTransform(DPR, 0, 0, DPR, 0, 0); updateCam(); setR();
  if (mode === 'magi') { t0n = now / 1000; if (dirty) refreshMagi(); drawMagi(); } else if (mode === 'beth') drawBeth(now / 1000, dt);
  requestAnimationFrame(loop);
}
async function begin(m) {
  unlockAudio(); speak(m === 'beth' ? 'audio/sky/s0.mp3' : 'audio/sky/m0.mp3');
  $('start').hidden = true; $('hud').hidden = false; useCam = $('usecam').checked;
  await startSensors();
  if (useCam) { try { vid.srcObject = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }); vid.classList.add('on'); vid.play(); } catch { useCam = false; } }
  if (!sens.on) $('hint').textContent = 'Двигай небо пальцем. На телефоне с гироскопом оно повернётся вместе с тобой.';
  (m === 'beth' ? startBeth : startMagi)();
}
document.querySelectorAll('.card').forEach(b => b.onclick = () => begin(b.dataset.mode));
$('again').onclick = () => { choir.stop(0); speak('audio/sky/s0.mp3'); startBeth(); }; $('tomagi').onclick = () => { choir.stop(0); speak('audio/sky/m0.mp3'); startMagi(); };
const qm = new URLSearchParams(location.search).get('m'); if (qm) requestAnimationFrame(() => begin(qm));
requestAnimationFrame(loop);
window.__sky = { view, BS, MS, get sky() { return sky; }, turnTo };
