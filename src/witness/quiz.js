// Рождественская викторина «Правда или нет»: 10 вопросов за раунд из 100, пряничек читает вопрос и объясняет ответ.
import { FACTS } from './jesus.js';
export async function initQuiz({ stage, $ }) {
  document.body.classList.add('quiz');
  const fx = stage.gameFx; fx.setMode('quiz');
  const bank = await fetch('data/quiz.json').then(r => r.json());
  $('panel').insertAdjacentHTML('afterbegin', `<div id="qpanel"><div id="qprog"></div><div id="qcard">Готов проверить, что ты знаешь о Рождестве?</div><div id="qans" hidden><button id="qT" class="ans yes">✅ Правда</button><button id="qF" class="ans no">❌ Неправда</button></div><div id="qexp" hidden></div><div id="qctl"><button id="qstart" class="primary">▶ Играть</button><button id="qnext" class="primary" hidden>Дальше →</button><button id="qmore" class="alt" hidden>💬 Про Иисуса</button><button id="qsnd">🔊</button></div></div>`);
  let sound = true, best = 0; try { best = +localStorage.getItem('quizBest') || 0; } catch (e) {}
  const music = new Audio('audio/theme-joy.mp3'); music.loop = true; music.volume = 0.12;
  const vp = new Audio(); let vtok = 0;
  const say = (src, onEnd) => { vp.onended = null; if (!sound) { onEnd?.(); return; } const my = ++vtok; vp.src = src; vp.volume = 0.95; vp.onended = () => { if (my === vtok) onEnd?.(); }; vp.play().catch(() => onEnd?.()); };
  const sfx = f => { if (!sound) return; const a = new Audio(f); a.volume = 0.6; a.play().catch(() => {}); };
  const pad = n => String(n).padStart(3, '0');
  let seen = []; try { seen = JSON.parse(localStorage.getItem('quizSeen') || '[]'); } catch (e) {}
  const R = 10; let round = [], idx = 0, score = 0, cur = null, answered = false, fi = 0;
  const pick = () => { let pool = bank.map((_, i) => i).filter(i => !seen.includes(i)); if (pool.length < R) { seen = []; pool = bank.map((_, i) => i); } const out = []; while (out.length < R) out.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]); seen.push(...out); try { localStorage.setItem('quizSeen', JSON.stringify(seen)); } catch (e) {} return out; };
  const prog = () => { $('qprog').textContent = `Вопрос ${idx + 1} из ${R} · ⭐ ${score}`; };
  function ask() {
    cur = round[idx]; answered = false; const q = bank[cur]; prog(); $('qcard').textContent = q.q; $('qcard').className = ''; $('qans').hidden = false; $('qexp').hidden = true; $('qnext').hidden = true; $('qstart').hidden = true; $('qmore').hidden = true;
    for (const b of $('qans').children) { b.disabled = false; b.classList.remove('right', 'wrong'); }
    fx.react('think'); say(`audio/quiz/q${pad(cur + 1)}.mp3`);
  }
  function answer(val) {
    if (answered) return; answered = true; const q = bank[cur], ok = val === q.a; if (ok) score++; prog();
    for (const b of $('qans').children) b.disabled = true; (val ? $('qT') : $('qF')).classList.add(ok ? 'right' : 'wrong'); if (!ok) (q.a ? $('qT') : $('qF')).classList.add('right');
    $('qcard').classList.add(ok ? 'good' : 'bad'); sfx(ok ? 'audio/game/pop.mp3' : 'audio/game/boing.mp3'); fx.react(ok ? 'ok' : 'no');
    $('qexp').hidden = false; $('qexp').textContent = (ok ? '✓ ' : '✗ ') + q.e;
    const reaction = ok ? `audio/quiz/ok${1 + ((Math.random() * 6) | 0)}.mp3` : `audio/quiz/no${1 + ((Math.random() * 5) | 0)}.mp3`;
    say(reaction, () => say(`audio/quiz/e${pad(cur + 1)}.mp3`, () => { $('qnext').hidden = false; })); $('qnext').hidden = false;
    $('qnext').textContent = idx + 1 < R ? 'Дальше →' : 'Результат →';
  }
  function finish() {
    $('qans').hidden = true; $('qexp').hidden = true; $('qnext').hidden = true; music.pause();
    const win = score >= 7, stars = score >= 9 ? 3 : score >= 7 ? 2 : 1, rec = score > best; if (rec) { best = score; try { localStorage.setItem('quizBest', score); } catch (e) {} }
    $('qprog').textContent = `Результат: ${score} из ${R}`;
    $('qcard').className = win ? 'good' : ''; $('qcard').innerHTML = `<div class="gstars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><b>${win ? 'Ура, ты молодец!' : 'Хорошая попытка!'}</b><br><small>Верных ответов: ${score} из ${R}${rec ? ' · новый рекорд!' : ' · лучший: ' + best}</small>${win ? '<p class="gjesus">Главная радость Рождества — Иисус, наш Спаситель. Он любит тебя!</p>' : ''}`;
    fx.react(win ? 'win' : 'no'); sfx(win ? 'audio/game/fanfare.mp3' : 'audio/game/boing.mp3'); setTimeout(() => say(win ? `audio/game/w${1 + ((Math.random() * 4) | 0)}.mp3` : 'audio/game/lose.mp3'), 1300);
    $('qstart').textContent = '↺ Ещё раз'; $('qstart').hidden = false; $('qmore').hidden = !win;
  }
  $('qT').onclick = () => answer(true); $('qF').onclick = () => answer(false);
  $('qnext').onclick = () => { vtok++; vp.pause(); idx++; if (idx < R) ask(); else finish(); };
  $('qstart').onclick = () => { round = pick(); idx = 0; score = 0; $('qstart').hidden = true; if (sound) music.play().catch(() => {}); if (round && !localStorage.getItem('quizIntro')) { try { localStorage.setItem('quizIntro', 1); } catch (e) {} say('audio/quiz/intro.mp3', ask); $('qcard').textContent = 'Давай проверим, что ты знаешь о Рождестве! Правда или нет?'; $('qprog').textContent = ''; } else ask(); };
  $('qmore').onclick = () => { const k = fi % FACTS.length; fi++; say(`audio/game/f${k + 1}.mp3`); $('qcard').querySelector('.gjesus').textContent = FACTS[k]; $('qmore').textContent = '💬 Ещё про Иисуса'; };
  $('qsnd').onclick = () => { sound = !sound; $('qsnd').textContent = sound ? '🔊' : '🔇'; if (!sound) { music.pause(); vp.pause(); } else music.play().catch(() => {}); };
  return { tap: () => {} };
}
