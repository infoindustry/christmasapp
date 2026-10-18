// "The Word of God" — the twelfth witness: the whole Christmas story read aloud from the Gospels, in two translations.
// A glowing book on the medallion; chapters, translation switch, rewind. Static files only.
const fmt = s => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export async function initWord({ stage, $ }) {
  const data = await fetch('data/word.json').then(r => r.json());
  const NAMES = { synodal: 'Синодальный', wgt: 'Современный (WGT)' };
  let tr = 'synodal', loadedTr = null;
  const audio = new Audio(); audio.preload = 'none';
  document.body.classList.add('book');
  const panel = $('panel');
  panel.insertAdjacentHTML('afterbegin', `<div id="player">
    <div id="wsub">Вся история Рождества: от Захарии до Назарета</div>
    <div id="wbar"><input id="seek" type="range" min="0" max="1000" value="0" aria-label="Перемотка"><span id="tm">0:00 / ${fmt(data[tr].sec)}</span></div>
    <div id="wctl"><button id="wb" aria-label="Назад на 15 секунд">↺ 15</button><button id="wp" class="primary">▶ Слушать</button><button id="wf" aria-label="Вперёд на 15 секунд">15 ↻</button></div>
    <div id="wtr">${Object.entries(NAMES).map(([k, n]) => `<button data-tr="${k}" class="${k === tr ? 'on' : ''}">${n}</button>`).join('')}</div>
  </div>`);
  const chapters = () => data[tr].chapters, total = () => data[tr].sec;
  const chIndex = t => { let i = 0; chapters().forEach((c, k) => { if (t >= c.start - 0.05) i = k; }); return i; };
  const buildChapters = () => { $('questions').innerHTML = chapters().map((c, i) => `<button data-i="${i}">${i + 1}. ${c.title}</button>`).join(''); $('questions').hidden = false; };
  buildChapters();

  const ensure = () => { if (loadedTr !== tr) { const t = audio.currentTime || 0; audio.src = data[tr].file; loadedTr = tr; return t; } return null; };
  const play = () => { const t = ensure(); if (t !== null) audio.currentTime = t; audio.play().catch(() => {}); };
  const seekTo = t => { ensure(); audio.currentTime = Math.max(0, Math.min(total() - 1, t)); };
  const setPlaying = on => { $('wp').textContent = on ? '⏸ Пауза' : '▶ Слушать'; stage.setSpeaking(on, on ? 'calm' : ''); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = on ? 'playing' : 'paused'; };

  $('wp').onclick = () => { if (audio.paused) play(); else audio.pause(); };
  $('wb').onclick = () => seekTo(audio.currentTime - 15);
  $('wf').onclick = () => seekTo(audio.currentTime + 15);
  audio.onplay = () => setPlaying(true); audio.onpause = () => setPlaying(false);
  audio.onended = () => { setPlaying(false); $('wsub').textContent = 'Вот и вся история. Послушай ещё раз?'; };
  audio.ontimeupdate = () => {
    const t = audio.currentTime, i = chIndex(t); $('seek').value = Math.round(t / total() * 1000); $('tm').textContent = `${fmt(t)} / ${fmt(total())}`;
    $('wsub').textContent = `${i + 1}. ${chapters()[i].title}`;
    for (const b of $('questions').children) b.classList.toggle('asked', +b.dataset.i === i);
  };
  $('seek').oninput = e => { seekTo(e.target.value / 1000 * total()); };
  $('questions').onclick = e => { const b = e.target.closest('button'); if (!b) return; seekTo(chapters()[+b.dataset.i].start); play(); };
  $('wtr').onclick = e => {   // switch the translation, keep the place in the story: same chapter, same offset inside it
    const b = e.target.closest('button'); if (!b || b.dataset.tr === tr) return;
    const was = !audio.paused, t = audio.currentTime || 0, i = chIndex(t), off = t - chapters()[i].start;
    tr = b.dataset.tr; for (const x of $('wtr').children) x.classList.toggle('on', x === b);
    const nc = chapters()[i], nextEnd = chapters()[i + 1]?.start ?? total();
    loadedTr = null; audio.src = data[tr].file; loadedTr = tr; audio.currentTime = Math.min(nc.start + off, nextEnd - 1);
    $('tm').textContent = `${fmt(audio.currentTime)} / ${fmt(total())}`; if (was) audio.play().catch(() => {});
  };
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: 'Рождество: от Захарии до Назарета', artist: 'Слово Божье', album: 'Свидетели Рождества', artwork: [{ src: 'medallions/word.webp', sizes: '1024x1024', type: 'image/webp' }] });
    navigator.mediaSession.setActionHandler('play', play); navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    navigator.mediaSession.setActionHandler('seekbackward', () => seekTo(audio.currentTime - 15)); navigator.mediaSession.setActionHandler('seekforward', () => seekTo(audio.currentTime + 15));
  }
  return { audio, play, stop: () => audio.pause() };
}
