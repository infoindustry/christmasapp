// The Christmas room: Meshy diorama + living effects on top of it (fire, tree lights, snow, smoke, lamp, dust).
// Everything is procedural and cheap (a handful of additive sprites / one Points cloud per effect), so it runs on a phone.
import * as THREE from 'three';

// where things are, in the model's own units (the model spans x ±0.92, y ±0.78, z ±0.95). Add ?debug to see the markers.
export const ANCHORS = {
  fire:    [-0.02, -0.40, -0.60],   // centre of the flames in the fireplace opening
  chimney: [-0.02, 0.77, -0.70],    // top of the chimney (smoke starts here)
  lantern: [-0.43, 0.36, -0.60],    // lantern on the mantel
  lamp:    [0.61, -0.06, 0.60],     // lampshade on the side table
  tree:    { x: 0.50, z: -0.42, yBase: -0.45, yTop: 0.42, rBase: 0.26 },
  star:    [0.50, 0.46, -0.42],
  pictures: [[-0.58, 0.37, -0.84], [0.47, 0.37, -0.84]],   // the two framed winter pictures on the back wall
  dog:     [0.22, -0.45, 0.25],
};

const sprite = (draw, size = 128) => { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const glowTex = sprite((x, s) => { const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); });
const flameTex = sprite((x, s) => {   // a teardrop flame: white-yellow core, orange body, red edge
  const g = x.createRadialGradient(s / 2, s * .62, 2, s / 2, s * .55, s * .46); g.addColorStop(0, 'rgba(255,250,200,1)'); g.addColorStop(.3, 'rgba(255,190,60,.95)'); g.addColorStop(.65, 'rgba(255,100,20,.55)'); g.addColorStop(1, 'rgba(200,30,0,0)');
  x.fillStyle = g; x.beginPath(); x.moveTo(s / 2, s * .02); x.bezierCurveTo(s * .92, s * .42, s * .86, s * .95, s / 2, s * .97); x.bezierCurveTo(s * .14, s * .95, s * .08, s * .42, s / 2, s * .02); x.fill();
}, 128);
const flakeTex = sprite((x, s) => { const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.5, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); }, 32);

const add = (map, color, size, opacity = 1) => new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity }));
const rnd = (a, b) => a + Math.random() * (b - a);

export async function buildRoom(loader, { debug = false } = {}) {
  const gltf = await loader.loadAsync('room/room.glb'); const model = gltf.scene;
  // the texture already holds the baked light: show it a little self-lit so the dark corners stay readable, and let the fire add on top
  model.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; const m = o.material; m.emissive = new THREE.Color(0xffffff); m.emissiveMap = m.map; m.emissiveIntensity = 0.55; m.roughness = 0.9; m.metalness = 0; o.frustumCulled = false; } });
  const group = new THREE.Group(); group.add(model);
  const fx = new THREE.Group(); group.add(fx);
  const state = { fireBoost: 0, chase: 0, lamp: 1, lampTarget: 1 };

  // ---- fire: flame sprites + embers + a flickering warm light that lights the room
  const A = ANCHORS, flames = [];
  for (let i = 0; i < 7; i++) { const s = add(flameTex, 0xffffff, 0.2, 0.95); s.position.set(A.fire[0] + rnd(-0.07, 0.07), A.fire[1] + rnd(0, 0.04), A.fire[2] + rnd(-0.02, 0.04)); fx.add(s); flames.push({ s, ph: Math.random() * 9, sp: rnd(5, 9), bw: rnd(0.12, 0.2), x0: s.position.x }); }
  const fireLight = new THREE.PointLight(0xff8a3a, 0.9, 2.4, 1.6); fireLight.position.set(A.fire[0], A.fire[1] + 0.15, A.fire[2] + 0.25); fx.add(fireLight);
  const fireGlow = add(glowTex, 0xff7a20, 0.7, 0.45); fireGlow.position.set(A.fire[0], A.fire[1] + 0.05, A.fire[2] + 0.06); fx.add(fireGlow);
  const EM = 40, emPos = new Float32Array(EM * 3), emSeed = Array.from({ length: EM }, () => ({ t: Math.random(), sp: rnd(0.25, 0.6), dx: rnd(-0.05, 0.05) }));
  const emGeo = new THREE.BufferGeometry(); emGeo.setAttribute('position', new THREE.BufferAttribute(emPos, 3));
  const embers = new THREE.Points(emGeo, new THREE.PointsMaterial({ map: flakeTex, color: 0xffa040, size: 0.022, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); embers.frustumCulled = false; fx.add(embers);

  // ---- smoke from the chimney (the room is open at the top, so it simply drifts up and fades)
  const smoke = []; for (let i = 0; i < 9; i++) { const s = add(glowTex, 0xcfd3dd, 0.16, 0.0); fx.add(s); smoke.push({ s, t: i / 9 }); }

  // ---- Christmas tree lights: small coloured glows on the cone, each twinkling on its own rhythm
  const T = A.tree, COL = [0xff4040, 0xffd24a, 0x58b8ff, 0x7dff7a, 0xff7ad9], lights = [];
  for (let i = 0; i < 34; i++) { const u = Math.pow(Math.random(), 0.8), y = T.yBase + (T.yTop - T.yBase) * (0.08 + 0.86 * u), r = T.rBase * (1 - (y - T.yBase) / (T.yTop - T.yBase)) * 1.02, a = Math.random() * 6.283;
    const s = add(glowTex, COL[i % COL.length], 0.065, 0.9); s.position.set(T.x + Math.cos(a) * r, y, T.z + Math.sin(a) * r); fx.add(s); lights.push({ s, ph: Math.random() * 6.283, sp: rnd(1.5, 4), y }); }
  const star = add(glowTex, 0xffe9a0, 0.2, 0.9); star.position.set(...A.star); fx.add(star);

  // ---- lamp + lantern: warm halos that breathe
  const lampGlow = add(glowTex, 0xffc870, 0.42, 0.55); lampGlow.position.set(...A.lamp); fx.add(lampGlow);
  const lampLight = new THREE.PointLight(0xffc474, 0.7, 1.6, 1.8); lampLight.position.set(A.lamp[0], A.lamp[1] + 0.08, A.lamp[2] - 0.05); fx.add(lampLight);
  const lanternGlow = add(glowTex, 0xffd28a, 0.25, 0.6); lanternGlow.position.set(...A.lantern); fx.add(lanternGlow);

  // ---- falling snow (a snow globe: the room is open at the top) and drifting dust in the firelight
  const SN = 140, snowPos = new Float32Array(SN * 3), snow = Array.from({ length: SN }, () => ({ x: rnd(-0.9, 0.9), y: rnd(-0.5, 1.1), z: rnd(-0.8, 0.9), v: rnd(0.05, 0.13), w: rnd(0.6, 2), ph: Math.random() * 6 }));
  const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snowPts = new THREE.Points(snowGeo, new THREE.PointsMaterial({ map: flakeTex, color: 0xffffff, size: 0.026, transparent: true, opacity: 0.9, depthWrite: false })); snowPts.frustumCulled = false; fx.add(snowPts);

  // the framed pictures: snow falling inside the frames
  const picFlakes = A.pictures.map(p => { const N = 14, pos = new Float32Array(N * 3), seed = Array.from({ length: N }, () => ({ x: rnd(-0.07, 0.07), y: rnd(-0.07, 0.07), v: rnd(0.02, 0.05) }));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: flakeTex, color: 0xffffff, size: 0.012, transparent: true, depthWrite: false })); pts.frustumCulled = false; fx.add(pts); return { pts, pos, seed, p }; });

  if (debug) { const C = { fire: 0xff0000, chimney: 0xffffff, lantern: 0x3377ff, lamp: 0xffff00, tree: 0x00ff00, star: 0xff00ff, pictures: 0x00ffff, dog: 0xff8800 };
    for (const [k, v] of Object.entries(A)) { const pts = Array.isArray(v) ? (Array.isArray(v[0]) ? v : [v]) : [[v.x, (v.yBase + v.yTop) / 2, v.z]]; for (const p of pts) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.035), new THREE.MeshBasicMaterial({ color: C[k], depthTest: false })); m.position.set(...p); m.renderOrder = 99; fx.add(m); } } }

  let tPrev = 0;
  function update(t, dt, speaking = 0) {
    const f = Math.min(1.8, 1 + state.fireBoost); state.fireBoost = Math.max(0, state.fireBoost - dt * 0.8);
    // fire
    for (const fl of flames) { const k = Math.sin(t * fl.sp + fl.ph), k2 = Math.sin(t * fl.sp * 1.7 + fl.ph * 2); const h = fl.bw * (1 + 0.35 * k + 0.15 * k2) * f; fl.s.scale.set(h * 0.8, h * 1.5, 1); fl.s.position.x = fl.x0 + Math.sin(t * 3 + fl.ph) * 0.012; fl.s.position.y = A.fire[1] + h * 0.5; fl.s.material.opacity = 0.55 + 0.2 * k2; }
    fireLight.intensity = (0.8 + Math.sin(t * 11) * 0.2 + Math.sin(t * 5.3) * 0.2 + Math.random() * 0.15) * f; fireGlow.material.opacity = 0.28 * f + Math.sin(t * 9) * 0.05; fireGlow.scale.setScalar(0.7 * f);
    for (let i = 0; i < EM; i++) { const e = emSeed[i]; e.t += dt * e.sp * (f > 1.2 ? 1.8 : 1); if (e.t > 1) { e.t = 0; e.dx = rnd(-0.05, 0.05); } emPos[i * 3] = A.fire[0] + e.dx + Math.sin(e.t * 9 + i) * 0.02; emPos[i * 3 + 1] = A.fire[1] + 0.05 + e.t * 0.4; emPos[i * 3 + 2] = A.fire[2] + 0.04; }
    emGeo.attributes.position.needsUpdate = true; embers.material.opacity = 0.9;
    // smoke
    for (const sm of smoke) { sm.t += dt * 0.12; if (sm.t > 1) sm.t = 0; const k = sm.t; sm.s.position.set(A.chimney[0] + Math.sin(k * 5 + sm.s.id) * 0.05 + k * 0.12, A.chimney[1] + k * 0.45, A.chimney[2]); sm.s.scale.setScalar(0.14 + k * 0.32); sm.s.material.opacity = Math.sin(k * Math.PI) * 0.22; }
    // tree lights: each one twinkles; a tap makes a chase run up the tree
    state.chase = Math.max(0, state.chase - dt * 0.7);
    for (const L of lights) { const base = 0.55 + 0.45 * Math.sin(t * L.sp + L.ph); const wave = state.chase > 0 ? Math.max(0, Math.sin((L.y - A.tree.yBase) * 9 - t * 14)) * state.chase * 2 : 0; L.s.material.opacity = Math.min(1, base + wave); L.s.scale.setScalar(0.055 + 0.03 * (base + wave)); }
    star.material.opacity = 0.7 + Math.sin(t * 2.3) * 0.2 + state.chase * 0.3; star.scale.setScalar(0.18 + Math.sin(t * 3.1) * 0.02 + state.chase * 0.1);
    // lamp / lantern
    state.lamp += (state.lampTarget - state.lamp) * Math.min(1, dt * 6);
    lampGlow.material.opacity = 0.5 * state.lamp * (0.95 + Math.sin(t * 1.3) * 0.05); lampLight.intensity = 0.7 * state.lamp;
    lanternGlow.material.opacity = 0.5 + Math.sin(t * 7) * 0.08 + Math.sin(t * 3.3) * 0.06;
    // snow
    for (let i = 0; i < SN; i++) { const s = snow[i]; s.y -= s.v * dt; s.x += Math.sin(t * s.w + s.ph) * 0.03 * dt; if (s.y < -0.52) { s.y = 1.1; s.x = rnd(-0.9, 0.9); s.z = rnd(-0.8, 0.9); } snowPos[i * 3] = s.x; snowPos[i * 3 + 1] = s.y; snowPos[i * 3 + 2] = s.z; }
    snowGeo.attributes.position.needsUpdate = true;
    for (const pf of picFlakes) { pf.seed.forEach((s, i) => { s.y -= s.v * dt; if (s.y < -0.07) { s.y = 0.07; s.x = rnd(-0.07, 0.07); } pf.pos[i * 3] = pf.p[0] + s.x; pf.pos[i * 3 + 1] = pf.p[1] + s.y; pf.pos[i * 3 + 2] = pf.p[2] + 0.012; }); pf.pts.geometry.attributes.position.needsUpdate = true; }
  }

  return {
    group, model, update,
    burst: () => { state.fireBoost = 1.2; },
    chase: () => { state.chase = 1.2; },
    toggleLamp: () => { state.lampTarget = state.lampTarget > 0.5 ? 0.12 : 1; return state.lampTarget > 0.5; },
    // which thing was tapped? (room-local point → a name)
    classify(p) {
      const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      if (p.y > -0.47 && p.y < 0.25 && p.z < -0.45 && Math.abs(p.x - A.fire[0]) < 0.28) return 'fire';
      if (Math.hypot(p.x - A.tree.x, p.z - A.tree.z) < A.tree.rBase + 0.12 && p.y > A.tree.yBase) return 'tree';
      if (Math.hypot(p.x - A.lamp[0], p.z - A.lamp[2]) < 0.3 && p.y > -0.5 && p.y < 0.2) return 'lamp';
      if (Math.hypot(p.x - A.dog[0], p.z - A.dog[2]) < 0.2 && p.y < -0.3) return 'dog';
      if (d([p.x, p.y, p.z], A.lantern) < 0.15) return 'lantern';
      return null;
    },
  };
}
