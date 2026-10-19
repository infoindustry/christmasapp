// «Волшебная раскраска»: the picture sleeps in black and white; a finger brings the colours back (or paints with a chosen colour). When most of it is painted, the picture
// wakes up in full colour and the same short story as after the puzzle is told.
const $ = id => document.getElementById(id);
const PICS = [
  { id: 'p5', t: 'Радостная весть Марии', s: 'В городе Назарете к Марии пришёл ангел Гавриил. Он сказал: «Радуйся, Благодатная!» Ангел принёс радостную весть: у Марии родится Сын, и Его имя будет Иисус. Мария ответила: «Се, раба Господня; да будет мне по слову твоему».' },
  { id: 'p2', t: 'Сон Иосифа', s: 'Иосиф очень волновался за Марию. Но ночью во сне ему явился ангел и сказал не бояться: Сын Марии от Святого Духа. Иосиф должен назвать Его Иисус, потому что Он спасёт людей от грехов. Иосиф проснулся и послушался ангела.' },
  { id: 'p4', t: 'Пастухи и ангел', s: 'В поле возле Вифлеема пастухи ночью стерегли стадо. Вдруг перед ними явился ангел, и всё вокруг осветилось. Он сказал: «Не бойтесь!» И возвестил великую радость: родился Спаситель. Пастухи поспешили в Вифлеем.' },
  { id: 'p1', t: 'Симеон в храме', s: 'Старик Симеон долго ждал обещанного Спасителя. В храме он взял Младенца Иисуса на руки и прославил Бога: «Ибо видели очи мои спасение Твоё». Мария и Иосиф очень удивились его словам.' },
  { id: 'p8', t: 'Пророчица Анна', s: 'Рядом в храме была пророчица Анна. Она была уже очень старенькая и не отходила от храма: служила Богу днём и ночью. Увидев Младенца, Анна стала славить Бога и рассказывать о Нём всем, кто ждал спасения.' },
  { id: 'p7', t: 'Пророк Михей', s: 'Пророк Михей жил примерно за семьсот лет до рождения Иисуса. Бог открыл ему, где родится Спаситель, и он записал это в свиток: «И ты, Вифлеем-Ефрафа, мал ли ты между тысячами Иудиными? из тебя произойдет Мне Тот, Который должен быть Владыкою в Израиле». Через много лет книжники вспомнили эти слова, когда у них спросили, где родится Царь.' },
  { id: 'p3', t: 'Путь за звездой', s: 'Мудрецы шли за звездой на верблюдах. Дорога была долгой, но звезда снова вела их вперёд. Когда они нашли Младенца, то очень обрадовались, поклонились Ему и принесли золото, ладан и смирну.' },
  { id: 'p6', t: 'Царь Ирод', s: 'Царь Ирод встревожился, когда услышал о новорождённом Царе. Он собрал книжников, и они ответили: в Вифлееме. Ирод попросил волхвов сообщить ему, где Младенец, будто хочет поклониться Ему. Но на самом деле он вовсе этого не хотел. Бог предупредил волхвов во сне, и они вернулись домой другим путём.' },
];
const COLORS = [['✨', null], ['', '#ff4d4d'], ['', '#ff9f1a'], ['', '#ffd93d'], ['', '#3ecf6e'], ['', '#3da5ff'], ['', '#b06cff'], ['', '#ff7eb6']];
let done = {}, subs = false, brush = 0;
try { done = JSON.parse(localStorage.getItem('col') || '{}'); subs = localStorage.getItem('subs') === '1'; } catch { }
$('cc').classList.toggle('on', subs); $('cc').onclick = () => { subs = !subs; try { localStorage.setItem('subs', subs ? '1' : '0'); } catch { } $('cc').classList.toggle('on', subs); if (cur) $('story').textContent = subs && won ? cur.s : ''; };
const voice = new Audio(), sfx = f => { const a = new Audio(f); a.volume = .5; a.play().catch(() => { }); };
function menu() { $('menu').hidden = false; $('game').hidden = true; voice.pause(); cur = null; $('grid').innerHTML = PICS.map((p, i) => `<button data-i="${i}" class="${done[p.id] ? 'ok' : ''}" aria-label="${p.t}"><img src="puzzle/t${p.id.slice(1)}.webp" alt="" loading="lazy"></button>`).join(''); }
$('grid').onclick = e => { const b = e.target.closest('button'); if (b) open(+b.dataset.i); };
$('menuB').onclick = menu; $('back').onclick = e => { if (!$('game').hidden) { e.preventDefault(); menu(); } }; $('next').onclick = () => open((idx + 1) % PICS.length);
$('pal').innerHTML = COLORS.map(([t, c], i) => `<button data-i="${i}" style="background:${c || 'conic-gradient(#ff4d4d,#ffd93d,#3ecf6e,#3da5ff,#b06cff,#ff4d4d)'}" aria-label="цвет">${t}</button>`).join('');
const mark = () => [...$('pal').children].forEach((b, i) => b.classList.toggle('on', i === brush)); mark();
$('pal').onclick = e => { const b = e.target.closest('button'); if (b) { brush = +b.dataset.i; mark(); } };
// ----- canvases -----
const cv = $('cv'), g = cv.getContext('2d'), mk = () => document.createElement('canvas');
let cur = null, idx = 0, gray = null, color = null, IW = 720, IH = 1080, mask = mk(), paint = mk(), comp = mk(), won = false, dirty = true, drag = null, cells = null, cols = 16, rows = 24, bx = 0, by = 0, bw = 0, bh = 0, revealT = 0, sparks = [], last = null;
const ld = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = src; });
function layout() { const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); cv.width = r.width * dpr; cv.height = r.height * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); const ar = IW / IH; bh = Math.min(r.height, r.width / ar); bw = bh * ar; bx = (r.width - bw) / 2; by = (r.height - bh) / 2; dirty = true; }
async function open(i) {
  idx = i; cur = PICS[i]; voice.pause(); $('menu').hidden = true; $('game').hidden = false; $('done').hidden = true; $('pal').hidden = false; won = false; revealT = 0; sparks = [];
  [gray, color] = await Promise.all([ld(`coloring/g${cur.id.slice(1)}.webp`), ld(`coloring/c${cur.id.slice(1)}.webp`)]); IW = gray.width; IH = gray.height;
  for (const c of [mask, paint, comp]) { c.width = IW; c.height = IH; } mask.getContext('2d').clearRect(0, 0, IW, IH); paint.getContext('2d').clearRect(0, 0, IW, IH); cells = new Uint8Array(cols * rows); layout();
}
addEventListener('resize', () => { if (cur) layout(); });
const dab = (c, x, y, r, col) => { const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(.72, col); gr.addColorStop(1, col.replace(/[\d.]+\)$/, '0)')); c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
function stroke(x0, y0, x1, y1) {   // image coordinates
  const r = IW * (brush === 0 ? 0.085 : 0.065), d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d / (r * 0.35)));
  const mc = mask.getContext('2d'), pc = paint.getContext('2d'), rgba = brush ? hex(COLORS[brush][1]) : 'rgba(255,255,255,1)';
  for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; dab(brush === 0 ? mc : pc, x, y, r, rgba); const cx = Math.floor(x / IW * cols), cy = Math.floor(y / IH * rows), rc = Math.ceil(r / IW * cols * .6); for (let a = -rc; a <= rc; a++) for (let b = -rc; b <= rc; b++) { const X = cx + a, Y = cy + b; if (X >= 0 && Y >= 0 && X < cols && Y < rows && a * a + b * b <= rc * rc + 1) cells[Y * cols + X] = 1; } }
  dirty = true; if (Math.random() < .5) sparks.push({ x: x1, y: y1, vx: (Math.random() - .5) * 90, vy: -Math.random() * 90, l: 1 });
}
const hex = h => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},1)`; };
const toImg = e => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) - bx) / bw * IW, ((e.clientY - r.top) - by) / bh * IH]; };
cv.addEventListener('pointerdown', e => { if (won || !cur) return; drag = true; cv.setPointerCapture(e.pointerId); last = toImg(e); stroke(...last, ...last); });
cv.addEventListener('pointermove', e => { if (!drag) return; const p = toImg(e); stroke(...last, ...p); last = p; });
const up = () => { if (!drag) return; drag = false; check(); }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
function check() { if (won) return; const f = cells.reduce((s, v) => s + v, 0) / cells.length; if (f >= 0.5) finish(); }
function finish() {
  won = true; done[cur.id] = 1; try { localStorage.setItem('col', JSON.stringify(done)); } catch { } $('pal').hidden = true;
  for (let i = 0; i < 70; i++) sparks.push({ x: bx + Math.random() * bw, y: by + Math.random() * bh * .7, vx: (Math.random() - .5) * 200, vy: Math.random() * -160, l: 1 + Math.random() }); sfx('audio/game/big.mp3');
  $('story').textContent = subs ? cur.s : ''; $('done').hidden = false; setTimeout(() => { voice.src = `audio/puzzle/${cur.id}.mp3`; voice.play().catch(() => { }); }, 1200);
}
function compose() {
  const c = comp.getContext('2d'); c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, IW, IH); c.drawImage(gray, 0, 0, IW, IH);
  // the true colours show only where the magic brush went
  const t = compose.t ||= mk(); t.width = IW; t.height = IH; const tc = t.getContext('2d'); tc.drawImage(mask, 0, 0); tc.globalCompositeOperation = 'source-in'; tc.drawImage(color, 0, 0, IW, IH); c.drawImage(t, 0, 0);
  c.globalCompositeOperation = 'color'; c.globalAlpha = .85; c.drawImage(paint, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}
let lt = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - lt) / 1000); lt = now;
  if (cur && gray) {
    if (dirty) { compose(); dirty = false; }
    const r = cv.getBoundingClientRect(); g.clearRect(0, 0, r.width, r.height); g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 16; g.drawImage(comp, bx, by, bw, bh); g.restore();
    if (won) { revealT = Math.min(1, revealT + dt / 1.2); g.globalAlpha = revealT; g.drawImage(color, bx, by, bw, bh); g.globalAlpha = 1; }
    for (const s of sparks) { s.l -= dt * 1.4; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 220 * dt; g.globalAlpha = Math.max(0, Math.min(1, s.l)); g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(s.x, s.y, 3.2, 0, 7); g.fill(); } g.globalAlpha = 1; sparks = sparks.filter(s => s.l > 0);
  }
  requestAnimationFrame(frame);
}
menu(); requestAnimationFrame(frame);
window.__col = { open, finish, get cells() { return cells; } };
