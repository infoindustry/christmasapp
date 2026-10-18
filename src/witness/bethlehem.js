// The diorama of Bethlehem: day / night, glowing windows, the Bethlehem star; "К яслям" flies to the manger and the narrator tells who was born there.
import * as THREE from 'three';

export function initBethlehem({ stage, $ }) {
  document.body.classList.add('beth');
  const fx = stage.bethFx;
  $('panel').insertAdjacentHTML('afterbegin', `<div id="bpanel"><div id="bsub">Это Вифлеем, маленький город, где родился Иисус. Нажми «Ночь», а потом загляни в ясли.</div><div id="bctl"><button id="bnight" class="primary">🌙 Ночь</button><button id="bmanger">👀 Заглянуть в ясли</button><button id="bchoir" hidden>👼 Ангелы поют</button><button id="bsnd">🔊</button></div></div>`);
  const say = t => { $('bsub').textContent = t; };
  let sound = true; const music = new Audio('audio/theme-nativity.mp3'); music.loop = true; music.volume = 0; const vp = new Audio();
  const speak = (k, text) => { if (text) say(text); if (!sound) return; vp.src = `audio/beth/${k}.mp3`; vp.volume = 0.95; vp.play().catch(() => {}); };
  const chime = () => { if (!sound) return; const a = new Audio('audio/room/chime.mp3'); a.volume = 0.5; a.play().catch(() => {}); };
  let fade = null; const fadeMusic = to => { clearInterval(fade); if (to > 0 && sound) music.play().catch(() => {}); fade = setInterval(() => { music.volume += (to - music.volume) * 0.1; if (Math.abs(music.volume - to) < 0.01) { music.volume = to; clearInterval(fade); if (!to) music.pause(); } }, 80); };
  let first = true;
  // the Holy Family appears at the manger: tap Mary, Joseph or the Baby
  const LINES = { mary: [['mary1', 'Мария: «Вот Он, мой Сын. Я назвала Его Иисус, как сказал ангел».'], ['mary2', 'Мария: «Я храню всё в сердце: слова ангела и слова пастухов. Он Спаситель».']], joseph: [['joseph1', 'Иосиф: «Он не мой по крови. Он Сын Божий. А мне доверили Его беречь».'], ['joseph2', 'Иосиф: «Я простой плотник, но больше всего хочу уберечь этого Младенца».']], baby: [['baby1', 'Это Иисус, Сын Божий. Он родился, чтобы стать нашим Спасителем.'], ['baby2', 'Бог пришёл на землю маленьким Младенцем, чтобы быть рядом с каждым из нас.']] };
  const idx = { mary: 0, joseph: 0, baby: 0 }; const choir = new Audio('audio/family/choir.mp3'); choir.volume = 0.5;
  const speakFam = who => { const [k, t] = LINES[who][idx[who]++ % 2]; say(t); if (who === 'baby') fx.family.glow(); if (!sound) return; vp.pause(); vp.src = `audio/family/${k}.mp3`; vp.volume = 0.95; vp.play().catch(() => {}); };
  $('bchoir').onclick = () => { fx.family.sing(); say('Ангелы поют: «Слава в вышних Богу, и на земле мир, в человеках благоволение!»'); if (sound) { choir.currentTime = 0; choir.play().catch(() => {}); } };
  $('bnight').onclick = () => {
    const night = !fx.isNight(); fx.setNight(night); $('bnight').textContent = night ? '☀️ День' : '🌙 Ночь'; fadeMusic(night && sound ? 0.18 : 0);
    if (night) { say('Вот ночь над Вифлеемом. В окнах загораются огоньки, а над домиком сияет звезда.'); if (first) { first = false; speak('n1'); } } else say('Снова день. Коснись домика: зажжётся окошко.');
  };
  // fly to the manger and back
  const cam = stage.camera, ctl = stage.controls; let anim = null, near = false, out = { p: new THREE.Vector3(), t: new THREE.Vector3(), fov: 34 };
  const local = (x, y, z) => fx.group.localToWorld(new THREE.Vector3(x, y, z));
  const flyTo = (pos, tgt, fov, minD) => { const p0 = cam.position.clone(), t0 = ctl.target.clone(), f0 = cam.fov, T = performance.now(); ctl.minDistance = minD; anim = now => { const k = Math.min(1, (now - T) / 1800), e = k * k * (3 - 2 * k); cam.position.lerpVectors(p0, pos, e); ctl.target.lerpVectors(t0, tgt, e); cam.fov = f0 + (fov - f0) * e; cam.updateProjectionMatrix(); if (k >= 1) anim = null; }; };
  // "look into the manger": the camera comes close and the Holy Family appears
  const goManger = () => { if (!near) { out.p.copy(cam.position); out.t.copy(ctl.target); out.fov = cam.fov; } near = true; $('bmanger').textContent = '↩ Назад'; if (!fx.isNight()) $('bnight').click(); flyTo(local(0.28, 0.24, 2.25), local(0.28, 0.1, 0.65), 40, 0.2); speak('n2', 'Когда Иосиф и Мария пришли на перепись, в жилых комнатах для них не нашлось места. Здесь родился Иисус, и Мария положила Его в ясли, в кормушку для скота. Коснись Марии, Иосифа или Младенца.'); fx.flashAt({ x: 0.28, z: 0.6 }); setTimeout(() => { fx.showFamily(true); $('bchoir').hidden = false; }, 900); };
  $('bmanger').onclick = () => { if (!near) goManger(); else { near = false; fx.showFamily(false); $('bchoir').hidden = true; $('bmanger').textContent = '👀 Заглянуть в ясли'; flyTo(out.p.clone(), out.t.clone(), out.fov, 0.5); } };
  const prev = stage.onFrame; stage.onFrame = (...a) => { prev?.(...a); if (anim) anim(performance.now()); };
  $('bsnd').onclick = () => { sound = !sound; $('bsnd').textContent = sound ? '🔊' : '🔇'; if (!sound) { music.pause(); vp.pause(); choir.pause(); } else if (fx.isNight()) fadeMusic(0.18); };
  speak('n0');
  return { tap(worldPoint, object) {
    if (object && fx.inFamily(object) && fx.familyShown()) { speakFam(fx.family.who(fx.family.group.worldToLocal(worldPoint.clone()))); return; }
    const p = fx.group.worldToLocal(worldPoint.clone());
    if (fx.isManger(p)) { goManger(); return; }
    fx.flashAt(p); chime(); if (!fx.isNight()) say('Коснись домика ночью: окошки светятся ярче.');
  } };
}
