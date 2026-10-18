// the camera works only on https: send an insecure visitor to the secure address (not for localhost / the local network)
if (location.protocol === 'http:' && !/^(localhost|127\.|192\.168\.|10\.|172\.)/.test(location.hostname)) location.replace('https:' + location.href.slice(5));
import { Stage } from './stage.js';
import { AR } from './ar.js';
import { initWord } from './word.js';
import { initRoom } from './room.js';
import { initGame } from './game.js';
import { initQuiz } from './quiz.js';
import { initBethlehem } from './bethlehem.js';
import { chooseMode } from './start.js';

const $ = id => document.getElementById(id);
const id = new URLSearchParams(location.search).get('id') || 'zechariah';
const BETH = new URLSearchParams(location.search).get('id') === 'bethlehem';   // the diorama of Bethlehem
const QUIZ = new URLSearchParams(location.search).get('id') === 'quiz';   // the Christmas quiz (true or false)
const GAME = new URLSearchParams(location.search).get('id') === 'game';   // the gingerbread game
const ROOM = new URLSearchParams(location.search).get('id') === 'room';   // the Christmas room
const BOOK = new URLSearchParams(location.search).get('id') === 'word';   // the twelfth "witness" is the audiobook
const [all, audioMan] = await Promise.all([fetch('data/witnesses.json').then(r => r.json()), fetch('data/witnesses-audio.json').then(r => r.json())]);
const w = all.find(x => x.id === id) || all[0];
const story = w.lines.filter(l => l.kind === 'story'), answers = w.lines.filter(l => l.kind === 'answer');
const tagOf = t => (t.match(/^\[([^\]]*)\]/) || [, ''])[1];
const plain = t => t.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();

document.title = `${w.name} — свидетель Рождества`;
$('name').textContent = w.name; $('ref').textContent = w.scripture.split(';')[0]; $('startName').textContent = w.name; $('startImg').src = `medallions/thumb/${w.id}.webp`;
$('dots').innerHTML = story.map(() => '<i></i>').join('');
$('questions').innerHTML = answers.map(a => `<button data-id="${a.id}">${a.question}</button>`).join('');
const dots = [...$('dots').children];
const fit = () => stage.setInset($('panel').offsetHeight, ($('modes').hidden ? $('head') : $('modes')).getBoundingClientRect().bottom + 8);   // the UI never covers the figure: the 3D scene is framed in what is left
new ResizeObserver(fit).observe($('panel')); addEventListener('resize', fit);

if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
const stage = new Stage($('c'));
const loading = stage.load(w.id, p => { $('loadbar').style.width = `${Math.round(p * 100)}%`; }).then(() => { $('loadbar').style.width = '100%'; setTimeout(() => ($('loadbar').style.opacity = 0), 400); });

// one shared <audio> element: it is unlocked by the first tap, so lines can chain on phones
const audio = new Audio(); audio.preload = 'auto';
let mode = 'idle', idx = 0, paused = false, timer = null, token = 0;
const setSub = (t, hint = false) => { $('sub').textContent = t; $('sub').classList.toggle('hint', hint); };
const showDots = () => dots.forEach((d, i) => { d.className = i < idx ? 'done' : (i === idx && mode === 'story' ? 'now' : ''); });
const fileOf = l => audioMan[w.id][l.id].file;
let word = null, room = null, game = null;

function playLine(line, onEnd) {
  const my = ++token; clearTimeout(timer);
  audio.pause(); audio.src = fileOf(line); audio.currentTime = 0;
  setSub(plain(line.text)); stage.setSpeaking(true, tagOf(line.text));
  audio.play().catch(() => {});
  audio.onended = () => { if (my !== token) return; stage.setSpeaking(false); onEnd?.(); };
}
function stopAll() { token++; clearTimeout(timer); audio.pause(); audio.onended = null; stage.setSpeaking(false); }

function playStory() {
  if (idx >= story.length) { finishStory(); return; }
  mode = 'story'; showDots(); $('btnStory').hidden = true; $('btnPause').hidden = false; $('btnNext').hidden = false; $('questions').hidden = true; $('btnPause').textContent = '⏸'; paused = false;
  playLine(story[idx], () => { idx++; showDots(); timer = setTimeout(playStory, 650); });
}
function finishStory() {
  mode = 'done'; idx = story.length; showDots(); $('btnPause').hidden = true; $('btnNext').hidden = true; $('btnStory').hidden = false; $('btnStory').textContent = '↺ Сначала';
  setSub('Вот как это было. Спроси меня о чём хочешь.', true); openQuestions(true);
}
function openQuestions(show = true) { $('questions').hidden = !show; }

$('btnStory').onclick = () => { if (mode === 'done') idx = 0; playStory(); };
$('btnPause').onclick = () => { if (paused) { audio.play(); stage.setSpeaking(true, ''); paused = false; $('btnPause').textContent = '⏸'; } else { audio.pause(); stage.setSpeaking(false); clearTimeout(timer); paused = true; $('btnPause').textContent = '▶'; } };
$('btnNext').onclick = () => { stopAll(); idx = Math.min(story.length, idx + 1); showDots(); paused = false; playStory(); };
$('btnAsk').onclick = () => { const open = $('questions').hidden; openQuestions(open); if (open && mode === 'story' && !paused) $('btnPause').click(); };
// an answer or a reaction in the middle of the story: the story is held, then offered again
function aside(line) {
  stopAll(); const resume = (mode === 'story' || mode === 'story-paused') && idx < story.length; mode = resume ? 'story-paused' : mode;
  playLine(line, () => { if (resume) { mode = 'story'; setSub('Продолжить рассказ?', true); $('btnStory').hidden = false; $('btnStory').textContent = '▶ Продолжить'; $('btnPause').hidden = true; $('btnNext').hidden = true; } else setSub('Спроси ещё что-нибудь.', true); });
}
$('questions').onclick = e => {
  const b = e.target.closest('button'); if (!b) return; b.classList.add('asked'); aside(answers.find(a => a.id === b.dataset.id));
};

// tapping the character: a short in-character reaction; tapping an animal: its sound
const pokes = w.lines.filter(l => l.kind === 'poke'); let pokeI = 0, soundI = {};
const play = (el, f) => { try { el.src = f; el.currentTime = 0; el.play().catch(() => {}); } catch (e) {} };
const animalAudio = new Audio();
const cv = $('c'); let down = null;
cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
cv.addEventListener('pointerup', e => {
  if (!down || $('start')) return;   // not before the start screen is gone
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null;
  if (moved > 8 || dt > 500) return;   // a drag turns the view, it is not a tap
  const hit = stage.pick(e.clientX, e.clientY); if (!hit) return;
  if (hit.companion) {
    const n = hit.companion.cfg.sound; if (n) { soundI[n] = ((soundI[n] ?? -1) + 1) % 2; play(animalAudio, `audio/animals/${n}-${soundI[n] + 1}.mp3`); }
    hit.companion.react();
  } else if (BETH) { window.__w.beth?.tap(hit.point, hit.object); } else if (QUIZ) { /* the quiz is answered with the buttons */ } else if (GAME) { game?.tap(hit); } else if (ROOM) { room?.tap(hit.point); } else if (pokes.length) { aside(pokes[pokeI++ % pokes.length]); }
});

// the first screen asks HOW to look (in the magazine / on the table / on the phone) and explains it; that tap also unlocks the sound
const startMode = chooseMode({ $, kind: BETH ? 'room' : QUIZ ? 'quiz' : GAME ? 'game' : ROOM ? 'room' : BOOK ? 'word' : 'witness', name: w.name, ref: w.scripture.split(';')[0], preset: new URLSearchParams(location.search).get('mode') });
(async () => {
  const mode = await startMode;
  $('go').disabled = true; await loading; $('start').remove();
  if (BETH) { window.__w.beth = initBethlehem({ stage, $ }); if (mode !== 'scene') setMode(mode); return; }
  if (QUIZ) { window.__w.quiz = await initQuiz({ stage, $ }); if (mode !== 'scene') setMode(mode); return; }
  if (GAME) { game = initGame({ stage, $ }); window.__w.game = game; if (mode !== 'scene') setMode(mode); return; }
  if (ROOM) { room = initRoom({ stage, $ }); window.__w.room = room; if (mode !== 'scene') setMode(mode); return; }
  if (BOOK) { word = await initWord({ stage, $ }); window.__w.word = word; if (mode !== 'scene') setMode(mode); return; }
  audio.src = fileOf(story[0]); audio.volume = 0; audio.play().then(() => { audio.pause(); audio.volume = 1; }).catch(() => { audio.volume = 1; }); // unlock audio on this tap
  stage.bow();
  setSub('Нажми «Рассказать», и я расскажу, как всё было.', true); showDots();
  if (mode !== 'scene') setMode(mode);
})();
// view modes: the virtual stage, AR on the printed medallion, AR on any surface
let hintTimer = null;
const ar = new AR(stage, w.id, {
  // hint(text, hideAfterMs, offerAfterMs): a floating note; after offerAfterMs it also offers to stand the witness anywhere, without the medallion
  hint: (t, hide = 0, offer = 0) => {
    clearTimeout(hintTimer); const el = $('arhint'); el.hidden = !t; const pic = offer ? `<img src="medallions/thumb/${w.id}.webp" alt="">` : ''; el.innerHTML = pic; el.append(t);   // while looking for the medallion: show what to look for
    if (t && offer) hintTimer = setTimeout(() => { el.innerHTML = `<img src="medallions/thumb/${w.id}.webp" alt="">`; el.append(t + ' '); const b = Object.assign(document.createElement('button'), { textContent: 'Нет медальона? Поставить здесь' }); b.onclick = () => setMode('surface'); el.append(document.createElement('br'), b); }, offer);
    if (t && hide) hintTimer = setTimeout(() => (el.hidden = true), hide);
  },
  exited: () => setMode('scene', true),
});
const sup = await AR.support(); for (const b of document.querySelectorAll('#modes button[data-mode]')) if (b.dataset.mode !== 'scene') b.hidden = !sup[b.dataset.mode];
if (GAME || QUIZ || BETH) document.querySelector('#modes button[data-mode=marker]').hidden = true;   // no printed medallion for the game
if (document.querySelectorAll('#modes button:not([hidden])').length < 2) $('modes').hidden = true;
fit();
let busy = false;
async function setMode(m, silent = false) {
  if (busy) return; busy = true;
  try {
    if (ar.kind) await ar.stop();
    $('arhint').hidden = true;
    if (m === 'marker') await ar.startMarker(); else if (m === 'surface') await ar.startSurface();
  } catch (e) { console.warn('AR failed', e); await ar.stop(); m = 'scene'; $('arhint').hidden = false; $('arhint').textContent = 'Не удалось включить камеру. Разреши доступ к камере и попробуй ещё раз.'; setTimeout(() => ($('arhint').hidden = true), 4000); }
  for (const b of document.querySelectorAll('#modes button')) b.classList.toggle('on', b.dataset.mode === m);
  busy = false;
}
$('modes').onclick = e => { const b = e.target.closest('button[data-mode]'); if (b) setMode(b.dataset.mode); };

window.__w = { stage, w, audio, ar, setMode };
