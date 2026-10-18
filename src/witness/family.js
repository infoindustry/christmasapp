// The Holy Family: tap Mary, Joseph or the Baby; the angels can sing.
export function initFamily({ stage, $ }) {
  document.body.classList.add('family');
  const fx = stage.familyFx;
  $('panel').insertAdjacentHTML('afterbegin', `<div id="fpanel"><div id="fsub">Святое семейство: Мария, Иосиф и Младенец Иисус. Коснись, кого хочешь послушать.</div><div id="fctl"><button id="fchoir" class="primary">👼 Ангелы поют</button><button id="fsnd">🔊</button></div></div>`);
  const say = t => { $('fsub').textContent = t; };
  let sound = true; const vp = new Audio(); const choir = new Audio('audio/family/choir.mp3'); choir.volume = 0.5;
  const LINES = { mary: [['mary1', 'Мария: «Вот Он, мой Сын. Я назвала Его Иисус, как сказал ангел».'], ['mary2', 'Мария: «Я храню всё в сердце: слова ангела и слова пастухов. Он Спаситель».']],
    joseph: [['joseph1', 'Иосиф: «Он не мой по крови. Он Сын Божий. А мне доверили Его беречь».'], ['joseph2', 'Иосиф: «Я простой плотник, но больше всего хочу уберечь этого Младенца».']],
    baby: [['baby1', 'Это Иисус, Сын Божий. Он родился, чтобы стать нашим Спасителем.'], ['baby2', 'Бог пришёл на землю маленьким Младенцем, чтобы быть рядом с каждым из нас.']] };
  const idx = { mary: 0, joseph: 0, baby: 0 };
  const speak = who => { const [k, t] = LINES[who][idx[who]++ % 2]; say(t); if (who === 'baby') fx.glow(); if (!sound) return; vp.pause(); vp.src = `audio/family/${k}.mp3`; vp.volume = 0.95; vp.play().catch(() => {}); };
  $('fchoir').onclick = () => { fx.sing(); say('Ангелы поют: «Слава в вышних Богу, и на земле мир, в человеках благоволение!»'); if (sound) { choir.currentTime = 0; choir.play().catch(() => {}); } };
  $('fsnd').onclick = () => { sound = !sound; $('fsnd').textContent = sound ? '🔊' : '🔇'; if (!sound) { vp.pause(); choir.pause(); } };
  if (sound) { vp.src = 'audio/family/intro.mp3'; vp.play().catch(() => {}); }
  return { tap(worldPoint) { speak(fx.who(fx.group.worldToLocal(worldPoint.clone()))); } };
}
