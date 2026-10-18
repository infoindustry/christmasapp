// The Christmas room: tap the fire, the tree, the lamp, the dog; "Заглянуть" flies the camera inside the room.
import * as THREE from 'three';

export function initRoom({ stage, $ }) {
  document.body.classList.add('room');
  const fx = stage.roomFx;
  $('panel').insertAdjacentHTML('afterbegin', `<div id="rpanel"><div id="rsub">Коснись камина, ёлки, лампы или собаки</div><div id="rctl"><button id="rpeek" class="primary">👀 Заглянуть внутрь</button><button id="rsnd">🔊 Звук</button></div></div>`);
  const say = t => { $('rsub').textContent = t; };
  const SND = { fire: 'audio/room/fire-burst.mp3', tree: 'audio/room/jingle.mp3', lamp: 'audio/room/chime.mp3', dog: 'audio/room/woof.mp3', lantern: 'audio/room/bell.mp3' };
  const SAY = { fire: 'Огонь вспыхнул ярче!', tree: 'Огоньки побежали вверх по ёлке', dog: 'Гав! Он проснулся', lantern: 'Звонкий колокольчик' };
  let sound = true; const amb = new Audio('audio/room/fire-loop.mp3'); amb.loop = true; amb.volume = 0.35;
  const sfx = f => { if (!sound) return; const a = new Audio(f); a.volume = 0.8; a.play().catch(() => {}); };
  const startAmb = () => { if (sound && amb.paused) amb.play().catch(() => {}); };
  $('rsnd').onclick = () => { sound = !sound; $('rsnd').textContent = sound ? '🔊 Звук' : '🔇 Звук'; if (sound) amb.play().catch(() => {}); else amb.pause(); };
  startAmb();

  // fly into the room and back (the camera moves on a smooth path; you can still look around by dragging)
  let inside = false, anim = null; const cam = stage.camera, ctl = stage.controls;
  const outPos = new THREE.Vector3(), outTgt = new THREE.Vector3(); let outFov = 34;
  const local = (x, y, z) => fx.group.localToWorld(new THREE.Vector3(x, y, z));
  const flyTo = (pos, tgt, minD, fov) => { const p0 = cam.position.clone(), t0 = ctl.target.clone(), f0 = cam.fov, T = performance.now(); ctl.minDistance = minD; anim = now => { const k = Math.min(1, (now - T) / 1600), e = k * k * (3 - 2 * k); cam.position.lerpVectors(p0, pos, e); ctl.target.lerpVectors(t0, tgt, e); cam.fov = f0 + (fov - f0) * e; cam.updateProjectionMatrix(); if (k >= 1) anim = null; }; };
  $('rpeek').onclick = () => {
    if (!inside) { outPos.copy(cam.position); outTgt.copy(ctl.target); outFov = cam.fov; flyTo(local(0.25, 0.05, 1.05), local(0.0, -0.05, -0.5), 0.05, 66); inside = true; $('rpeek').textContent = '↩ Выйти'; say('Ты внутри! Оглядись: води пальцем'); }
    else { flyTo(outPos.clone(), outTgt.clone(), 0.9, outFov); inside = false; $('rpeek').textContent = '👀 Заглянуть внутрь'; say('Коснись камина, ёлки, лампы или собаки'); }
  };
  const prev = stage.onFrame; stage.onFrame = (...a) => { prev?.(...a); if (anim) anim(performance.now()); };

  return {
    tap(worldPoint) {
      startAmb();
      const p = fx.group.worldToLocal(worldPoint.clone()), what = fx.classify(p); if (!what) return;
      if (what === 'fire') fx.burst(); else if (what === 'tree') fx.chase(); else if (what === 'lamp') { const on = fx.toggleLamp(); say(on ? 'Лампа светит' : 'Лампа погасла. Коснись снова'); sfx(SND.lamp); return; }
      say(SAY[what]); sfx(SND[what]);
    },
  };
}
