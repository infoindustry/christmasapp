// The film player: one MP4, big friendly captions, chapters.
const $ = id => document.getElementById(id), v = $('v');
const info = await fetch('film/story.json').then(r => r.json());
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
$('chapters').innerHTML = info.chapters.map((c, i) => `<button class="ch" data-t="${c.start}" data-i="${c.ch}"><img src="film/ch${c.ch}.jpg" alt="" loading="lazy"><b>${i + 1}. ${c.title}</b><small>${fmt(c.start)}</small></button>`).join('');
$('tm').textContent = fmt(info.duration);
const tt = v.textTracks[0]; if (tt) tt.mode = 'hidden';   // cues still fire, the browser does not draw them
let cc = true;
if (tt) tt.addEventListener('cuechange', () => { const c = tt.activeCues?.[0]; $('cap').innerHTML = c && cc ? `<span>${c.text.replace(/</g, '&lt;')}</span>` : ''; });
$('cc').onclick = () => { cc = !cc; $('cc').classList.toggle('on', cc); if (!cc) $('cap').innerHTML = ''; };
const toggle = () => (v.paused ? v.play() : v.pause());
$('big').onclick = $('pp').onclick = toggle; v.onclick = toggle;
v.onplay = () => { $('stage').classList.add('playing'); $('pp').textContent = '⏸'; }; v.onpause = () => { $('pp').textContent = '▶'; };
v.onended = () => { $('stage').classList.remove('playing'); $('pp').textContent = '▶'; $('cap').innerHTML = ''; };
const chapterAt = t => { let k = info.chapters[0]; for (const c of info.chapters) if (t >= c.start - 0.05) k = c; return k; };
v.ontimeupdate = () => {
  const t = v.currentTime; $('seek').value = Math.round(t / info.duration * 1000); $('tm').textContent = `${fmt(t)} / ${fmt(info.duration)}`;
  const c = chapterAt(t); $('now').textContent = c.title; for (const b of $('chapters').children) b.classList.toggle('now', +b.dataset.i === c.ch);
};
$('seek').oninput = e => { v.currentTime = e.target.value / 1000 * info.duration; };
$('chapters').onclick = e => { const b = e.target.closest('.ch'); if (!b) return; v.currentTime = +b.dataset.t; v.play(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
$('fs').onclick = () => { const el = $('stage'); if (document.fullscreenElement) document.exitFullscreen(); else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el); };
if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: 'История Рождества', artist: 'Свидетели Рождества', artwork: [{ src: 'film/poster.jpg', sizes: '1280x720', type: 'image/jpeg' }] });
