// "Lantern" mechanic: the phone is the tool. Aim the camera crosshair at a candle on the printed page and hold —
// it ignites and floods the temple with light. Seven candles → the angel's light and the real narration.
import * as THREE from 'three';

function ringTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.strokeStyle = 'rgba(255,225,140,.95)'; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 46, 0, 7); g.stroke();
  g.strokeStyle = 'rgba(255,180,60,.35)'; g.lineWidth = 14; g.beginPath(); g.arc(64, 64, 46, 0, 7); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function setupLantern({ paint, cfg, base, group, camera, anchor, ui }) {
  const n = cfg.flames.x.length, PH = paint.PH;
  const lit = Array(n).fill(0), target = Array(n).fill(0), dwell = Array(n).fill(0);
  const U = paint.uniforms;
  U.uAmb.value = 0.05; U.uLit.value.fill(0);
  let count = 0, finale = false, shown = false;

  const ambient = Object.assign(new Audio(`${base}/${cfg.ambient}`), { loop: true, volume: 0.35 });
  const story = Object.assign(new Audio(`${base}/${cfg.story}`), { volume: 1 });
  const whoosh = () => { const a = new Audio(`${base}/${cfg.whoosh}`); a.volume = 0.9; a.play().catch(() => {}); };

  // pulsing rings that show where the candles are (until lit)
  const tex = ringTexture();
  const rings = paint.flamePos.map(([u, v]) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.position.set((u - .5), (.5 - v) * PH, -cfg.relief * 0.78); sp.scale.setScalar(0.09); sp.renderOrder = 9; group.add(sp); return sp;
  });

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const hit = aim => {
    // camera sits at the origin looking down -Z; build the ray from the projection matrix (setFromCamera rejects our bare Camera)
    const dir = new THREE.Vector3(aim.x, aim.y, 0.5).applyMatrix4(camera.projectionMatrixInverse).normalize();
    ray.set(new THREE.Vector3(), dir);
    anchor.updateMatrixWorld(true);
    const h = ray.intersectObject(paint.mask)[0];
    return h && h.uv ? { u: h.uv.x, v: 1 - h.uv.y } : null;       // uv origin: u→right, v→down (matches flame coordinates)
  };

  const ignite = i => {
    target[i] = 1; count++; whoosh();
    ui.count(count, n);
    if (count === n) { finale = true; ambient.volume = 0.12; setTimeout(() => story.play().catch(() => {}), 1400); ui.finale(); }
  };

  return {
    show() { if (shown) return; shown = true; ambient.play().catch(() => {}); ui.hint(cfg.hint); ui.count(count, n); },
    hide() { ambient.pause(); },
    /** aim in NDC (screen centre by default), dt seconds, tracking = page currently visible */
    update(aim, dt, tracking, t) {
      let progress = 0;
      if (tracking && shown) {
        const p = hit(aim);
        let best = -1, bd = 1e9;
        if (p) for (let i = 0; i < n; i++) { if (target[i]) continue; const [fu, fv] = paint.flamePos[i];
          const d = Math.hypot(p.u - fu, (p.v - fv) * PH); if (d < bd) { bd = d; best = i; } }
        for (let i = 0; i < n; i++) {
          if (target[i]) continue;
          if (i === best && bd < 0.075) { dwell[i] += dt; progress = Math.max(progress, dwell[i] / 0.9); if (dwell[i] > 0.9) ignite(i); }
          else dwell[i] = Math.max(0, dwell[i] - dt * 2);
        }
      }
      ui.reticle(progress, tracking && shown);
      for (let i = 0; i < n; i++) {
        lit[i] += (target[i] - lit[i]) * Math.min(1, dt * 3.2); U.uLit.value[i] = lit[i];
        rings[i].visible = !target[i];
        if (!target[i]) { const k = 1 + Math.sin(t * 3 + i) * 0.12 + dwell[i] * 0.4; rings[i].scale.setScalar(0.085 * k); }
      }
      U.uAmb.value = 0.05 + (finale ? Math.min(0.5, (U.uAmb.value - 0.05) + dt * 0.25) : 0);
      if (finale) paint.halo.material.opacity = 0.9;
    },
  };
}
