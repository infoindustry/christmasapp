// The greeting-card maker: a picture from the film, a hero sticker, a verse (word for word, Synodal), names; shared as a PNG.
const $ = id => document.getElementById(id), cv = $('cv'), g = cv.getContext('2d'), S = 1080;
const BGS = [['manger', 'Ясли'], ['magi', 'Волхвы'], ['shepherds', 'Пастухи'], ['gabriel', 'Ангел'], ['light', 'Свет'], ['star', 'Звезда']];
const STK = [['mary', 'Мария'], ['joseph', 'Иосиф'], ['shepherd', 'Пастух'], ['wiseman', 'Волхв'], ['simeon', 'Симеон'], ['anna', 'Анна'], ['elizabeth', 'Елисавета'], ['zechariah', 'Захария'], ['micah', 'Михей'], ['game', 'Пряничек']];
const VERSES = [
  ['«Ибо ныне родился вам в городе Давидовом Спаситель, Который есть Христос Господь».', 'Евангелие от Луки 2:11'],
  ['«Слава в вышних Богу, и на земле мир, в человеках благоволение!»', 'Евангелие от Луки 2:14'],
  ['«И Слово стало плотию, и обитало с нами, полное благодати и истины».', 'Евангелие от Иоанна 1:14'],
  ['«Се, Дева во чреве приимет, и родит Сына, и нарекут имя Ему: Еммануил, что значит: с нами Бог».', 'Евангелие от Матфея 1:23'],
  ['«Ибо так возлюбил Бог мир, что отдал Сына Своего Единородного, дабы всякий верующий в Него не погиб, но имел жизнь вечную».', 'Евангелие от Иоанна 3:16'],
  ['«Ибо младенец родился нам, Сын дан нам; владычество на раменах Его, и нарекут имя Ему: Чудный, Советник, Бог крепкий, Отец вечности, Князь мира».', 'Книга пророка Исаии 9:6'],
];
const ph = { img: null, x: 0, y: 0, z: 1, halo: true };
const st = { bg: 0, stk: -1, v: 0, snow: true, stars: true };
const imgs = {}; const load = src => imgs[src] ||= new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
// pickers
$('bgs').innerHTML = BGS.map(([k, n], i) => `<button data-i="${i}" title="${n}"><img src="card/bg/${k}.jpg" alt="${n}"></button>`).join('');
$('stk').innerHTML = `<button data-i="-1" class="none" title="Без героя">🚫</button>` + STK.map(([k, n], i) => `<button data-i="${i}" title="${n}"><img src="card/stick/${k}.webp" alt="${n}"></button>`).join('');
$('verses').innerHTML = VERSES.map(([t, r], i) => `<button data-i="${i}">${t}<small>${r}</small></button>`).join('');
const mark = () => { for (const [id, key] of [['bgs', 'bg'], ['stk', 'stk'], ['verses', 'v']]) for (const b of $(id).children) b.classList.toggle('on', +b.dataset.i === st[key]); };
for (const [id, key] of [['bgs', 'bg'], ['stk', 'stk'], ['verses', 'v']]) $(id).onclick = e => { const b = e.target.closest('button'); if (!b) return; st[key] = +b.dataset.i; mark(); draw(); };
for (const id of ['snow', 'stars']) $(id).onchange = e => { st[id] = e.target.checked; draw(); }; $('to').oninput = $('from').oninput = () => draw();

const wrap = (t, maxW) => { const words = t.split(' '), lines = []; let line = ''; for (const w of words) { const test = line ? line + ' ' + w : w; if (g.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; } if (line) lines.push(line); return lines; };
const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
async function draw() {
  const bg = await load(`card/bg/${BGS[st.bg][0]}.jpg`);
  g.clearRect(0, 0, S, S); if (bg) g.drawImage(bg, 0, 0, S, S); else { g.fillStyle = '#1b1440'; g.fillRect(0, 0, S, S); }
  // soft light at the top and a dark cloth at the bottom for the words
  let gr = g.createLinearGradient(0, 0, 0, 330); gr.addColorStop(0, 'rgba(10,6,30,.65)'); gr.addColorStop(1, 'rgba(10,6,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, 330);
  gr = g.createLinearGradient(0, 560, 0, S); gr.addColorStop(0, 'rgba(10,6,30,0)'); gr.addColorStop(0.45, 'rgba(10,6,30,.78)'); gr.addColorStop(1, 'rgba(10,6,30,.92)'); g.fillStyle = gr; g.fillRect(0, 560, S, S - 560);
  const R = rng(7);
  if (st.stars) for (let i = 0; i < 26; i++) { const x = R() * S, y = R() * 520, r = 2 + R() * 4, a = 0.5 + R() * 0.5; g.fillStyle = `rgba(255,236,170,${a})`; g.beginPath(); for (let k = 0; k < 8; k++) { const rr = k % 2 ? r * 0.4 : r * 1.8, an = k / 8 * Math.PI * 2; g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); } g.fill(); }
  if (st.snow) for (let i = 0; i < 70; i++) { const x = R() * S, y = R() * S, r = 2 + R() * 6; g.fillStyle = `rgba(255,255,255,${0.35 + R() * 0.55})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  // title
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 18; g.fillStyle = '#f3d48a'; g.font = 'bold 104px Georgia, "Times New Roman", serif'; g.fillText('С Рождеством!', S / 2, 150); g.shadowBlur = 0;
  const to = $('to').value.trim(), from = $('from').value.trim();
  if (to) { g.font = '600 40px Georgia, serif'; g.fillStyle = '#fff'; g.shadowBlur = 12; g.fillText('Для ' + to, S / 2, 240); g.shadowBlur = 0; }
  // verse
  const hasStk = st.stk >= 0 || !!ph.img, [vt, vr] = VERSES[st.v], left = 70, maxW = hasStk ? 600 : 940, cx = left + maxW / 2;
  let size = 50; g.font = `italic ${size}px Georgia, "Times New Roman", serif`; let lines = wrap(vt, maxW); while (lines.length > 6 && size > 30) { size -= 4; g.font = `italic ${size}px Georgia, serif`; lines = wrap(vt, maxW); }
  const lh = size * 1.28, total = lines.length * lh, y0 = 770 - total / 2 + lh / 2 - 10;
  g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 10; lines.forEach((l, i) => g.fillText(l, cx, y0 + i * lh)); g.shadowBlur = 0;
  g.font = '600 34px -apple-system, "Segoe UI", sans-serif'; g.fillStyle = '#e8c46a'; g.fillText(vr, cx, y0 + total + 14);
  if (from) { g.font = '600 38px Georgia, serif'; g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText('От ' + from, 70, 990); g.textAlign = 'center'; }
  g.font = '500 24px -apple-system, "Segoe UI", sans-serif'; g.fillStyle = 'rgba(255,255,255,.55)'; g.fillText('ar.nativity.top', S / 2, 1046);
  // hero sticker (a round portrait with a golden ring)
  if (hasStk) {
    const photo = !!ph.img, im = photo ? ph.img : await load(`card/stick/${STK[st.stk][0]}.webp`), cx2 = 870, cy2 = 800, r = photo ? 150 : 135;
    if (im) {
      if (photo && ph.halo) { g.save(); g.strokeStyle = '#ffe9a0'; g.lineWidth = 12; g.shadowColor = '#ffd86b'; g.shadowBlur = 30; g.beginPath(); g.ellipse(cx2, cy2 - r - 22, 84, 20, 0, 0, 7); g.stroke(); g.restore(); }
      g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 24; g.fillStyle = '#2b1f5e'; g.beginPath(); g.arc(cx2, cy2, r + 8, 0, 7); g.fill(); g.restore();
      g.save(); g.beginPath(); g.arc(cx2, cy2, r, 0, 7); g.clip();
      if (photo) { const k = (r * 2 / Math.min(im.width, im.height)) * ph.z; g.drawImage(im, cx2 - im.width * k / 2 + ph.x, cy2 - im.height * k / 2 + ph.y, im.width * k, im.height * k); }
      else { const gg = g.createRadialGradient(cx2, cy2 - 40, 10, cx2, cy2, r); gg.addColorStop(0, '#5a47a8'); gg.addColorStop(1, '#241a52'); g.fillStyle = gg; g.fillRect(cx2 - r, cy2 - r, r * 2, r * 2); const k = (r * 2.1) / Math.max(im.width, im.height); g.drawImage(im, cx2 - im.width * k / 2, cy2 - im.height * k / 2 + 8, im.width * k, im.height * k); }
      g.restore(); g.strokeStyle = '#e8c46a'; g.lineWidth = 7; g.beginPath(); g.arc(cx2, cy2, r + 4, 0, 7); g.stroke();
      if (photo) for (const [a, sz] of [[-2.5, 22], [-0.6, 16], [0.9, 20]]) { const x = cx2 + Math.cos(a) * (r + 30), y = cy2 + Math.sin(a) * (r + 30); g.fillStyle = '#ffe9a0'; g.beginPath(); for (let k = 0; k < 8; k++) { const rr = k % 2 ? sz * .25 : sz, an = k / 8 * 6.283; g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); } g.fill(); }
    }
  }
}
const blob = () => new Promise(res => cv.toBlob(res, 'image/png'));
$('save').onclick = async () => { const a = document.createElement('a'); a.href = URL.createObjectURL(await blob()); a.download = 'rozhdestvo-otkrytka.png'; document.body.appendChild(a); a.click(); a.remove(); };
$('share').onclick = async () => {
  const file = new File([await blob()], 'rozhdestvo-otkrytka.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: 'С Рождеством!', text: 'С Рождеством! ar.nativity.top' }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  $('save').click();   // the phone cannot share files from the browser: save it instead
};
mark(); draw();
document.fonts?.ready.then(draw);

// the child's photo: stays in the browser, never uploaded; drag to move, slider to zoom
const fit = f => new Promise(res => { const i = new Image(); i.onload = () => { const m = Math.min(1, 1000 / Math.max(i.width, i.height)), c = document.createElement('canvas'); c.width = i.width * m; c.height = i.height * m; c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); URL.revokeObjectURL(i.src); res(c); }; i.onerror = () => res(null); i.src = URL.createObjectURL(f); });
const phUI = on => { $('phtools').hidden = $('phhint').hidden = !on; cv.classList.toggle('ph', on); $('pick').textContent = on ? '📷 Другое фото' : '📷 Моё фото в кружке'; };
$('pick').onclick = () => $('file').click();
$('file').onchange = async e => { const f = e.target.files[0]; if (!f) return; const c = await fit(f); if (!c) return; Object.assign(ph, { img: c, x: 0, y: 0, z: 1 }); $('zoom').value = 1; phUI(true); draw(); e.target.value = ''; };
$('unph').onclick = () => { ph.img = null; phUI(false); draw(); };
$('zoom').oninput = e => { ph.z = +e.target.value; draw(); }; $('halo').onchange = e => { ph.halo = e.target.checked; draw(); };
let drag = null;
cv.onpointerdown = e => { if (ph.img) { drag = { x: e.clientX, y: e.clientY, px: ph.x, py: ph.y }; cv.setPointerCapture(e.pointerId); } };
cv.onpointermove = e => { if (!drag) return; const k = S / cv.getBoundingClientRect().width; ph.x = drag.px + (e.clientX - drag.x) * k; ph.y = drag.py + (e.clientY - drag.y) * k; draw(); };
cv.onpointerup = cv.onpointercancel = () => drag = null;
