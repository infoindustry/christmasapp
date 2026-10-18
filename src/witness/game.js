// The gingerbread game: two modes (collect stars on the plate / endless run), HUD (stars, hearts), sounds, the little voice, results.
import { FACTS } from './jesus.js';
export function initGame({ stage, $ }) {
  document.body.classList.add('game');
  const fx = stage.gameFx, S = fx.S;
  document.body.insertAdjacentHTML('beforeend', `<div id="hud" hidden><div id="score">⭐ <b>0</b></div><div id="dist" hidden><b>0</b> м</div><div id="hearts">❤️❤️❤️</div><div id="timer"><i></i></div></div>`);
  $('panel').insertAdjacentHTML('afterbegin', `<div id="gpanel"><div id="gsub">Выбери игру</div><div id="gres" hidden></div><div id="gctl"><button id="gplay" class="primary">⭐ Собирать звёзды</button><button id="grun" class="primary alt">🏃 Бесконечный бег</button><button id="gsnd">🔊</button></div></div>`);
  const say = t => { $('gsub').textContent = t; };
  let sound = true, best = 0, bestRun = 0; try { best = +localStorage.getItem('gingerBest') || 0; bestRun = +localStorage.getItem('gingerRun') || 0; } catch (e) {}
  const music = new Audio('audio/theme-joy.mp3'); music.loop = true; music.volume = 0.2;
  const vp = new Audio(); const sfx = (f, v = 0.7) => { if (!sound) return; const a = new Audio(f); a.volume = v; a.play().catch(() => {}); };
  let lastVoice = 0; const voice = (k, force = false) => { const now = performance.now(); if (!sound || (!force && now - lastVoice < 1800)) return false; lastVoice = now; vp.src = `audio/game/${k}.mp3`; vp.volume = 0.95; vp.play().catch(() => {}); return true; };
  let ci = 0, wi = 0, bi = 0, fi = 0, kind = 'collect', factsOn = false;
  // after a win the gingerbread can tell more about Jesus (short, optional, one by one)
  const showResult = (win, lines, again) => { $('hud').hidden = true; $('gpanel').classList.remove('playing'); $('gres').hidden = false; $('gres').innerHTML = lines; $('gplay').hidden = $('grun').hidden = false; };
  fx.on((name, d) => {
    if (name === 'start') { const run = fx.mode === 'run'; kind = run ? 'run' : 'collect'; factsOn = false; $('hearts').textContent = '❤️❤️❤️'; $('hud').hidden = false; $('gres').hidden = true; $('gpanel').classList.add('playing'); $('gplay').hidden = $('grun').hidden = true; $('score').querySelector('b').textContent = 0; $('dist').hidden = !run; $('timer').hidden = run; say(run ? 'Свайп влево и вправо: перебегай. Свайп вверх или касание: прыжок!' : 'Собирай звёздочки, а от снежков прыгай: коснись пряничка!'); voice('start', true); if (sound) music.play().catch(() => {}); }
    if (name === 'collect') { $('score').querySelector('b').textContent = d.score; $('score').classList.remove('pop'); void $('score').offsetWidth; $('score').classList.add('pop'); sfx('audio/game/pop.mp3', 0.6); if (d.jump) sfx('audio/game/boing.mp3', 0.6); if (d.big) voice('big', true); else if (Math.random() < 0.4) voice(Math.random() < 0.5 ? `c${(ci++ % 4) + 1}` : `b${(bi++ % 8) + 1}`); }
    if (name === 'dist') $('dist').querySelector('b').textContent = d.dist;
    if (name === 'hit') { $('hearts').textContent = '❤️'.repeat(Math.max(0, d.hearts)) + '🤍'.repeat(3 - Math.max(0, d.hearts)); sfx('audio/game/splat.mp3', 0.8); voice(Math.random() < 0.5 ? 'oops1' : 'oops2', true); }
    if (name === 'jump') { sfx('audio/game/boing.mp3', 0.5); voice('jump'); }
    if (name === 'tickle') { sfx('audio/game/boing.mp3', 0.5); voice('tickle', true); }
    if (name === 'idle') voice('idle', true);
    if (name === 'end') {
      music.pause(); const n = d.score, win = d.win, run = !!d.run; sfx(win ? 'audio/game/fanfare.mp3' : 'audio/game/boing.mp3', 0.8);
      // the winner tells, very briefly, about the main star of Christmas
      setTimeout(() => voice(win ? `w${(wi++ % 4) + 1}` : 'lose', true), 1300);
      const main = run ? d.dist : n, rec = run ? main > bestRun : main > best; if (rec) { if (run) bestRun = main; else best = main; try { localStorage.setItem(run ? 'gingerRun' : 'gingerBest', main); } catch (e) {} }
      const stars = !win ? 1 : (run ? (main >= 150 ? 3 : main >= 90 ? 2 : 1) : (n >= 28 ? 3 : n >= 18 ? 2 : 1));
      showResult(win, `<div class="gstars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><b>${win ? 'Ура, победа!' : 'Пряничек устал'}</b><small>${run ? `Пробежал ${d.dist} м · звёздочек: ${n}` : `Звёздочек: ${n}`}${rec ? ' · новый рекорд!' : ` · лучший результат: ${run ? bestRun : best}`}</small>${win ? '<p class="gjesus">Главная звезда Рождества — Иисус, наш Спаситель. Он любит тебя!</p><button id="gmore" class="alt">💬 Послушать про Иисуса</button>' : ''}`);
      say(win ? 'Сыграем ещё?' : 'Ничего, попробуем ещё раз!'); $('gplay').textContent = '⭐ Собирать звёзды'; $('grun').textContent = '🏃 Бесконечный бег';
      const more = $('gmore'); if (more) more.onclick = () => { if (!sound) return; const k = fi % FACTS.length; fi++; vp.src = `audio/game/f${k + 1}.mp3`; vp.volume = 0.95; vp.play().catch(() => {}); $('gres').querySelector('.gjesus').textContent = FACTS[k]; more.textContent = '💬 Ещё про Иисуса'; };
    }
  });
  stage.onFrame = () => { const p = S.playing && fx.mode !== 'run' ? S.left / S.total : 0; $('timer').firstElementChild.style.width = `${p * 100}%`; $('timer').classList.toggle('low', S.playing && S.left < 10); };
  $('gplay').onclick = () => fx.start();
  $('grun').onclick = () => fx.startRun();
  $('gsnd').onclick = () => { sound = !sound; $('gsnd').textContent = sound ? '🔊' : '🔇'; if (!sound) { music.pause(); vp.pause(); } else if (S.playing) music.play().catch(() => {}); };

  // runner controls: swipe left / right = lane, swipe up or tap = jump (arrow keys on a computer)
  let down = null; const cv = stage.canvas;
  cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  cv.addEventListener('pointerup', e => {
    if (!down || fx.mode !== 'run' || !S.playing) { down = null; return; }
    const dx = e.clientX - down.x, dy = e.clientY - down.y; down = null;
    if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) fx.lane(dx > 0 ? 1 : -1); else fx.jump();
  });
  addEventListener('keydown', e => { if (fx.mode !== 'run' || !S.playing) return; if (e.key === 'ArrowLeft') fx.lane(-1); else if (e.key === 'ArrowRight') fx.lane(1); else if (e.key === 'ArrowUp' || e.key === ' ') fx.jump(); });
  return { tap: hit => { if (!hit || fx.mode === 'run') return; fx.tap(hit.point, hit.object); } };
}
