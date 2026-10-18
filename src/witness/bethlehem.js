// The diorama of Bethlehem: day / night, glowing windows, the Bethlehem star; "К яслям" flies to the manger and the narrator tells who was born there.
import * as THREE from 'three';

export function initBethlehem({ stage, $ }) {
  document.body.classList.add('beth');
  const fx = stage.bethFx;
  $('panel').insertAdjacentHTML('afterbegin', `<div id="bpanel"><div id="bsub">Это Вифлеем, маленький город, где родился Иисус. Нажми «Ночь».</div><div id="bctl"><button id="bnight" class="primary">🌙 Ночь</button><button id="bmanger">⭐ К яслям</button><button id="bsnd">🔊</button></div></div>`);
  const say = t => { $('bsub').textContent = t; };
  let sound = true; const music = new Audio('audio/theme-nativity.mp3'); music.loop = true; music.volume = 0; const vp = new Audio();
  const speak = (k, text) => { if (text) say(text); if (!sound) return; vp.src = `audio/beth/${k}.mp3`; vp.volume = 0.95; vp.play().catch(() => {}); };
  const chime = () => { if (!sound) return; const a = new Audio('audio/room/chime.mp3'); a.volume = 0.5; a.play().catch(() => {}); };
  let fade = null; const fadeMusic = to => { clearInterval(fade); if (to > 0 && sound) music.play().catch(() => {}); fade = setInterval(() => { music.volume += (to - music.volume) * 0.1; if (Math.abs(music.volume - to) < 0.01) { music.volume = to; clearInterval(fade); if (!to) music.pause(); } }, 80); };
  let first = true;
  $('bnight').onclick = () => {
    const night = !fx.isNight(); fx.setNight(night); $('bnight').textContent = night ? '☀️ День' : '🌙 Ночь'; fadeMusic(night && sound ? 0.18 : 0);
    if (night) { say('Вот ночь над Вифлеемом. В окнах загораются огоньки, а над домиком сияет звезда.'); if (first) { first = false; speak('n1'); } } else say('Снова день. Коснись домика: зажжётся окошко.');
  };
  // fly to the manger and back
  const cam = stage.camera, ctl = stage.controls; let anim = null, near = false, out = { p: new THREE.Vector3(), t: new THREE.Vector3(), fov: 34 };
  const local = (x, y, z) => fx.group.localToWorld(new THREE.Vector3(x, y, z));
  const flyTo = (pos, tgt, fov, minD) => { const p0 = cam.position.clone(), t0 = ctl.target.clone(), f0 = cam.fov, T = performance.now(); ctl.minDistance = minD; anim = now => { const k = Math.min(1, (now - T) / 1800), e = k * k * (3 - 2 * k); cam.position.lerpVectors(p0, pos, e); ctl.target.lerpVectors(t0, tgt, e); cam.fov = f0 + (fov - f0) * e; cam.updateProjectionMatrix(); if (k >= 1) anim = null; }; };
  const goManger = () => { if (!near) { out.p.copy(cam.position); out.t.copy(ctl.target); out.fov = cam.fov; } near = true; $('bmanger').textContent = '↩ Назад'; if (!fx.isNight()) $('bnight').click(); flyTo(local(0.38, 0.16, 1.15), local(0.28, 0.0, 0.6), 38, 0.2); speak('n2', 'Здесь, в простом доме, родился Иисус, Сын Божий и наш Спаситель.'); fx.flashAt({ x: 0.28, z: 0.6 }); };
  $('bmanger').onclick = () => { if (!near) goManger(); else { near = false; $('bmanger').textContent = '⭐ К яслям'; flyTo(out.p.clone(), out.t.clone(), out.fov, 0.5); } };
  const prev = stage.onFrame; stage.onFrame = (...a) => { prev?.(...a); if (anim) anim(performance.now()); };
  $('bsnd').onclick = () => { sound = !sound; $('bsnd').textContent = sound ? '🔊' : '🔇'; if (!sound) { music.pause(); vp.pause(); } else if (fx.isNight()) fadeMusic(0.18); };
  speak('n0');
  return { tap(worldPoint) {
    const p = fx.group.worldToLocal(worldPoint.clone());
    if (fx.isManger(p)) { goManger(); return; }
    fx.flashAt(p); chime(); if (!fx.isNight()) say('Коснись домика ночью: окошки светятся ярче.');
  } };
}
