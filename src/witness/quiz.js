// Рождественская викторина «Правда или нет»: все 50 вопросов подряд в случайном порядке, пряничек читает вопрос и объясняет ответ.
import { FACTS } from './jesus.js';
export async function initQuiz({ stage, $ }) {
  document.body.classList.add('quiz');
  const fx = stage.gameFx; fx.setMode('quiz');
  const bank = await fetch('data/quiz.json').then(r => r.json());
  $('panel').insertAdjacentHTML('afterbegin', `<div id="qpanel"><div id="qprog"></div><div id="qcard">Готов проверить, что ты знаешь о Рождестве?</div><div id="qans" hidden><button id="qT" class="ans yes">✅ Правда</button><button id="qF" class="ans no">❌ Неправда</button></div><div id="qexp" hidden></div><div id="qctl"><button id="qstart" class="primary">▶ Играть</button><button id="qnext" class="primary" hidden>Дальше →</button><button id="qmore" class="alt" hidden>💬 Про Иисуса</button><button id="qend" hidden>⏹ Закончить</button><button id="qsnd">🔊</button></div></div>`);
  let sound = true, best = 0; try { best = +localStorage.getItem('quizBest') || 0; } catch (e) {}
  const music = new Audio('audio/theme-joy.mp3'); music.loop = true; music.volume = 0.12;
  const vp = new Audio(); let vtok = 0;
  const say = (src, onEnd) => { vp.onended = null; if (!sound) { onEnd?.(); return; } const my = ++vtok; vp.src = src; vp.volume = 0.95; vp.onended = () => { if (my === vtok) onEnd?.(); }; vp.play().catch(() => onEnd?.()); };
  const sfx = f => { if (!sound) return; const a = new Audio(f); a.volume = 0.6; a.play().catch(() => {}); };
  const pad = n => String(n).padStart(3, '0');
  const R = bank.length; let round = [], idx = 0, score = 0, done = 0, cur = null, answered = false, fi = 0;
  const pick = () => { const a = bank.map((_, i) => i); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };   // every question once, in a new order
  const prog = () => { $('qprog').textContent = `Вопрос ${idx + 1} из ${R} · ⭐ ${score}`; };
  function ask() {
    cur = round[idx]; answered = false; const q = bank[cur]; prog(); $('qend').hidden = false; $('qcard').textContent = q.q; $('qcard').className = ''; $('qans').hidden = false; $('qexp').hidden = true; $('qnext').hidden = true; $('qstart').hidden = true; $('qmore').hidden = true;
    for (const b of $('qans').children) { b.disabled = false; b.classList.remove('right', 'wrong'); }
    fx.react('think'); say(`audio/quiz/q${pad(cur + 1)}.mp3`);
  }
  function answer(val) {
    if (answered) return; answered = true; done++; const q = bank[cur], ok = val === q.a; if (ok) score++; prog();
    for (const b of $('qans').children) b.disabled = true; (val ? $('qT') : $('qF')).classList.add(ok ? 'right' : 'wrong'); if (!ok) (q.a ? $('qT') : $('qF')).classList.add('right');
    $('qcard').classList.add(ok ? 'good' : 'bad'); sfx(ok ? 'audio/game/pop.mp3' : 'audio/game/boing.mp3'); fx.react(ok ? 'ok' : 'no');
    $('qexp').hidden = false; $('qexp').textContent = (ok ? '✓ ' : '✗ ') + q.e;
    const reaction = ok ? `audio/quiz/ok${1 + ((Math.random() * 6) | 0)}.mp3` : `audio/quiz/no${1 + ((Math.random() * 5) | 0)}.mp3`;
    say(reaction, () => say(`audio/quiz/e${pad(cur + 1)}.mp3`, () => { $('qnext').hidden = false; })); $('qnext').hidden = false;
    $('qnext').textContent = idx + 1 < R ? 'Дальше →' : 'Результат →';
  }
  function finish() {
    $('qans').hidden = true; $('qexp').hidden = true; $('qnext').hidden = true; $('qend').hidden = true; music.pause(); vtok++; vp.pause();
    const n = Math.max(done, 1), ratio = score / n, win = done >= 5 && ratio >= 0.7, stars = done >= 5 && ratio >= 0.9 ? 3 : win ? 2 : 1, rec = score > best; if (rec) { best = score; try { localStorage.setItem('quizBest', score); } catch (e) {} }
    $('qprog').textContent = `Результат: ${score} из ${done}`;
    $('qcard').className = win ? 'good' : ''; $('qcard').innerHTML = `<div class="gstars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><b>${win ? 'Ура, ты молодец!' : 'Хорошая попытка!'}</b><br><small>Верных ответов: ${score} из ${done}${rec ? ' · новый рекорд!' : ' · лучший: ' + best}</small>${win ? '<p class="gjesus">Главная радость Рождества — Иисус, наш Спаситель. Он любит тебя!</p>' : ''}`;
    fx.react(win ? 'win' : 'no'); sfx(win ? 'audio/game/fanfare.mp3' : 'audio/game/boing.mp3'); setTimeout(() => say(win ? `audio/game/w${1 + ((Math.random() * 4) | 0)}.mp3` : 'audio/game/lose.mp3'), 1300);
    $('qstart').textContent = '↺ Ещё раз'; $('qstart').hidden = false; $('qmore').hidden = !win;
  }
  $('qT').onclick = () => answer(true); $('qF').onclick = () => answer(false);
  $('qnext').onclick = () => { vtok++; vp.pause(); idx++; if (idx < R) ask(); else finish(); };
  $('qend').onclick = finish;
  $('qstart').onclick = () => { round = pick(); idx = 0; score = 0; done = 0; $('qstart').hidden = true; if (sound) music.play().catch(() => {}); if (round && !localStorage.getItem('quizIntro')) { try { localStorage.setItem('quizIntro', 1); } catch (e) {} say('audio/quiz/intro.mp3', ask); $('qcard').textContent = 'Давай проверим, что ты знаешь о Рождестве! Правда или нет?'; $('qprog').textContent = ''; } else ask(); };
  $('qmore').onclick = () => { const k = fi % FACTS.length; fi++; say(`audio/game/f${k + 1}.mp3`); $('qcard').querySelector('.gjesus').textContent = FACTS[k]; $('qmore').textContent = '💬 Ещё про Иисуса'; };
  $('qsnd').onclick = () => { sound = !sound; $('qsnd').textContent = sound ? '🔊' : '🔇'; if (!sound) { music.pause(); vp.pause(); } else music.play().catch(() => {}); };
  return { tap: () => {} };
}
