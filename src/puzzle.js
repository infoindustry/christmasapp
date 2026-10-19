// «Пазлы Рождества»: pictures cut into pieces; drag one piece onto another to swap them. When the picture is done, a short story is told.
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
const LV = [['Лёгкий', 2, 2], ['Средний', 3, 4], ['Сложный', 4, 6]];
let level = 1, done = {}, subs = false;
try { done = JSON.parse(localStorage.getItem('puz') || '{}'); level = +localStorage.getItem('puzLv') || 1; subs = localStorage.getItem('subs') === '1'; } catch { }
$('cc').classList.toggle('on', subs);
$('cc').onclick = () => { subs = !subs; try { localStorage.setItem('subs', subs ? '1' : '0'); } catch { } $('cc').classList.toggle('on', subs); if (cur) $('story').textContent = subs && won ? cur.s : ''; };
const voice = new Audio(), sfx = f => { const a = new Audio(f); a.volume = .6; a.play().catch(() => { }); };
function menu() {
  $('menu').hidden = false; $('game').hidden = true; voice.pause(); cur = null;
  $('lv').innerHTML = LV.map(([n, c, r], i) => `<button data-i="${i}" class="${i === level ? 'on' : ''}">${n}<br><small>${c * r} частей</small></button>`).join('');
  $('grid').innerHTML = PICS.map((p, i) => `<button data-i="${i}" class="${done[p.id] ? 'ok' : ''}"><img src="puzzle/t${p.id.slice(1)}.webp" alt="" loading="lazy"><span>${p.t}</span></button>`).join('');
}
$('lv').onclick = e => { const b = e.target.closest('button'); if (!b) return; level = +b.dataset.i; try { localStorage.setItem('puzLv', level); } catch { } menu(); };
$('grid').onclick = e => { const b = e.target.closest('button'); if (b) open(+b.dataset.i); };
$('menuB').onclick = menu; $('back').onclick = e => { if (!$('game').hidden) { e.preventDefault(); menu(); } };
$('next').onclick = () => open((idx + 1) % PICS.length);
// ----- the game -----
const cv = $('cv'), g = cv.getContext('2d');
let cur = null, idx = 0, img = null, cols = 2, rows = 2, perm = [], won = false, drag = null, peek = false, sparks = [], bx = 0, by = 0, bw = 0, bh = 0, flash = [];
function layout() {
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); cv.width = r.width * dpr; cv.height = r.height * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const ar = img ? img.width / img.height : 2 / 3; bh = Math.min(r.height, r.width / ar); bw = bh * ar; bx = (r.width - bw) / 2; by = (r.height - bh) / 2;
}
function shuffle() {
  const n = cols * rows; do { perm = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [perm[i], perm[j]] = [perm[j], perm[i]]; } } while (perm.filter((p, i) => p === i).length > Math.max(1, n / 6));
  won = false; $('done').hidden = true; flash = Array(n).fill(0); sparks = [];
}
async function open(i) {
  idx = i; cur = PICS[i]; [, cols, rows] = LV[level]; $('menu').hidden = true; $('game').hidden = false; $('ttl').textContent = cur.t; voice.pause();
  img = await new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = `puzzle/${cur.id}.webp`; }); layout(); shuffle();
}
$('shuf').onclick = shuffle; addEventListener('resize', () => { if (cur) layout(); });
const hold = on => () => { peek = on; }; $('peek').onpointerdown = hold(true); $('peek').onpointerup = $('peek').onpointerleave = $('peek').onpointercancel = hold(false);
const cell = (x, y) => { const c = Math.floor((x - bx) / (bw / cols)), r = Math.floor((y - by) / (bh / rows)); return c < 0 || r < 0 || c >= cols || r >= rows ? -1 : r * cols + c; };
cv.addEventListener('pointerdown', e => { if (won || !cur) return; const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, c = cell(x, y); if (c < 0 || perm[c] === c) return; drag = { c, x, y, ox: x - (bx + (c % cols) * bw / cols), oy: y - (by + Math.floor(c / cols) * bh / rows) }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', e => { if (!drag) return; const r = cv.getBoundingClientRect(); drag.x = e.clientX - r.left; drag.y = e.clientY - r.top; });
const end = e => {
  if (!drag) return; const t = cell(drag.x, drag.y), c = drag.c; drag = null;
  if (t >= 0 && t !== c && perm[t] !== t) { [perm[c], perm[t]] = [perm[t], perm[c]]; flash[t] = flash[c] = 1; for (const k of [c, t]) if (perm[k] === k) { sfx('audio/game/pop.mp3'); burst(k); } if (navigator.vibrate) navigator.vibrate(10); if (perm.every((p, i) => p === i)) win(); }
};
cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', () => drag = null);
function burst(k) { const x = bx + (k % cols + .5) * bw / cols, y = by + (Math.floor(k / cols) + .5) * bh / rows; for (let i = 0; i < 12; i++) sparks.push({ x, y, vx: (Math.random() - .5) * 280, vy: (Math.random() - .5) * 280 - 60, l: 1 }); }
function win() {
  won = true; done[cur.id] = 1; try { localStorage.setItem('puz', JSON.stringify(done)); } catch { }
  for (let i = 0; i < 60; i++) sparks.push({ x: bx + Math.random() * bw, y: by + Math.random() * bh * .6, vx: (Math.random() - .5) * 200, vy: Math.random() * -200, l: 1 + Math.random() });
  sfx('audio/game/big.mp3'); $('story').textContent = subs ? cur.s : ''; $('done').hidden = false;
  setTimeout(() => { voice.src = `audio/puzzle/${cur.id}.mp3`; voice.play().catch(() => { }); }, 900);
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (cur && img) {
    const r = cv.getBoundingClientRect(); g.clearRect(0, 0, r.width, r.height); const pw = bw / cols, ph = bh / rows, sw = img.width / cols, sh = img.height / rows, gap = won ? 0 : 2;
    const drawP = (p, x, y, s = 1) => { g.drawImage(img, (p % cols) * sw, Math.floor(p / cols) * sh, sw, sh, x + gap, y + gap, (pw - gap * 2) * s, (ph - gap * 2) * s); };
    for (let i = 0; i < cols * rows; i++) { if (drag && drag.c === i) { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(bx + (i % cols) * pw + 2, by + Math.floor(i / cols) * ph + 2, pw - 4, ph - 4); continue; } const x = bx + (i % cols) * pw, y = by + Math.floor(i / cols) * ph; drawP(perm[i], x, y);
      if (!won && perm[i] === i) { g.strokeStyle = 'rgba(232,196,106,.9)'; g.lineWidth = 2; g.strokeRect(x + 2, y + 2, pw - 4, ph - 4); }
      if (flash[i] > 0) { g.fillStyle = `rgba(255,240,180,${flash[i] * .45})`; g.fillRect(x, y, pw, ph); flash[i] = Math.max(0, flash[i] - dt * 3); } }
    if (peek && !won) { g.globalAlpha = .6; g.drawImage(img, bx, by, bw, bh); g.globalAlpha = 1; }
    if (drag) { g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 18; const x = drag.x - drag.ox - pw * .025, y = drag.y - drag.oy - ph * .025; drawP(perm[drag.c], x, y, 1.05); g.restore(); }
    for (const s of sparks) { s.l -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 300 * dt; g.globalAlpha = Math.max(0, Math.min(1, s.l)); g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(s.x, s.y, 3.2, 0, 7); g.fill(); } g.globalAlpha = 1; sparks = sparks.filter(s => s.l > 0);
  }
  requestAnimationFrame(frame);
}
menu(); requestAnimationFrame(frame);
window.__pz = { get perm() { return perm; }, open, win };
