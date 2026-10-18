// The diorama of Bethlehem: day turns into night, the windows light up (found automatically from the texture), the Bethlehem star shines over the manger.
import * as THREE from 'three';
import { buildFamily } from './familyfx.js';

export const MANGER = [0.28, -0.08, 0.6];   // the thatched shelter at the front (model units: x ±0.62, y ±0.36, z ±0.95)
const rnd = (a, b) => a + Math.random() * (b - a);
const sprite = (draw, size = 128) => { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const glowTex = sprite((x, s) => { const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); });
const rayTex = sprite((x, s) => { x.translate(s / 2, s / 2); const g = x.createRadialGradient(0, 0, 0, 0, 0, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; for (let i = 0; i < 8; i++) { x.save(); x.rotate(i * Math.PI / 4); x.beginPath(); x.moveTo(-s * 0.025, 0); x.lineTo(0, -s / 2); x.lineTo(s * 0.025, 0); x.fill(); x.restore(); } }, 256);
const mk = (map, color, size, op = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op })); s.scale.setScalar(size); return s; };

// dark, unsaturated, vertical spots of the texture = windows and doorways
function findWindows(mesh, max = 70) {
  const img = mesh.material.map.image, W = img.width, H = img.height, c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, W, H).data, g = mesh.geometry, P = g.attributes.position, N = g.attributes.normal, UV = g.attributes.uv, I = g.index;
  const tri = I ? I.count / 3 : P.count / 3, cells = new Map(), a = new THREE.Vector3(), b = new THREE.Vector3(), cc = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let t = 0; t < tri; t++) for (let rep = 0; rep < 2; rep++) {
    const i0 = I ? I.getX(t * 3) : t * 3, i1 = I ? I.getX(t * 3 + 1) : t * 3 + 1, i2 = I ? I.getX(t * 3 + 2) : t * 3 + 2;
    let u = Math.random(), v = Math.random(); if (u + v > 1) { u = 1 - u; v = 1 - v; } const w = 1 - u - v;
    nn.set(N.getX(i0) * w + N.getX(i1) * u + N.getX(i2) * v, N.getY(i0) * w + N.getY(i1) * u + N.getY(i2) * v, N.getZ(i0) * w + N.getZ(i1) * u + N.getZ(i2) * v).normalize();
    if (Math.abs(nn.y) > 0.45) continue;   // walls only
    const tu = UV.getX(i0) * w + UV.getX(i1) * u + UV.getX(i2) * v, tv = UV.getY(i0) * w + UV.getY(i1) * u + UV.getY(i2) * v, px = Math.min(W - 1, Math.max(0, (tu * W) | 0)), py = Math.min(H - 1, Math.max(0, (tv * H) | 0)), o = (py * W + px) * 4;
    const r = data[o], gg = data[o + 1], bl = data[o + 2], lum = (r + gg + bl) / 765, sat = (Math.max(r, gg, bl) - Math.min(r, gg, bl)) / 255;
    if (lum > 0.2 || sat > 0.3) continue;
    a.set(P.getX(i0), P.getY(i0), P.getZ(i0)).multiplyScalar(w); b.set(P.getX(i1), P.getY(i1), P.getZ(i1)).multiplyScalar(u); cc.set(P.getX(i2), P.getY(i2), P.getZ(i2)).multiplyScalar(v); a.add(b).add(cc);
    const key = `${Math.round(a.x / 0.04)},${Math.round(a.y / 0.04)},${Math.round(a.z / 0.04)}`; let e = cells.get(key); if (!e) cells.set(key, e = { n: 0, p: new THREE.Vector3(), nrm: new THREE.Vector3() }); e.n++; e.p.add(a); e.nrm.add(nn);
  }
  return [...cells.values()].filter(e => e.n >= 4).sort((x, y) => y.n - x.n).slice(0, max).map(e => ({ p: e.p.clone().multiplyScalar(1 / e.n), n: e.nrm.normalize(), w: e.n }));
}

export async function buildBethlehem(loader, { debug = false } = {}) {
  const gltf = await loader.loadAsync('bethlehem/bethlehem.glb'); const model = gltf.scene; let mesh; model.traverse(o => { if (o.isMesh) mesh = o; });
  const mat = mesh.material; mat.emissive = new THREE.Color(0xffffff); mat.emissiveMap = mat.map; mat.emissiveIntensity = 0.5; mat.roughness = 0.95; mat.metalness = 0; mesh.frustumCulled = false;
  const group = new THREE.Group(); group.add(model); const fx = new THREE.Group(); group.add(fx);
  // the Holy Family: appears in front of the manger shelter when you come close ("К яслям")
  const fam = await buildFamily(loader), FS = 0.4; fam.group.position.set(MANGER[0], -0.26 + 0.95 * FS, MANGER[2] + 0.12); fam.group.scale.setScalar(0.001); fam.group.visible = false; group.add(fam.group);
  const famState = { k: 0, target: 0 }; const inFamily = o => { while (o) { if (o === fam.group) return true; o = o.parent; } return false; };
  const state = { night: 0, target: 0, flash: 0 };
  const DAY = new THREE.Color(0xffffff), NIGHT = new THREE.Color(0x8e9ed6), EDAY = new THREE.Color(0xffffff).multiplyScalar(0.5), ENIGHT = new THREE.Color(0xa6b6f0).multiplyScalar(0.24);   // night: bluish, but you can still see the houses

  // windows
  let wins = []; try { wins = findWindows(mesh); } catch (e) { console.warn('window search failed', e); }
  const lights = wins.map((w, i) => { const s = mk(glowTex, 0xffb54a, 0.095, 0), core = mk(glowTex, 0xfff0c0, 0.036, 0); s.position.copy(w.p).addScaledVector(w.n, 0.006); core.position.copy(s.position); fx.add(s, core); return { s, core, ph: Math.random() * 9, on: rnd(0.05, 0.95), w }; });

  // the Bethlehem star + a beam onto the manger
  const starPos = new THREE.Vector3(MANGER[0], 0.72, MANGER[2]);
  const star = mk(glowTex, 0xfff2b0, 0.34, 0), rays = mk(rayTex, 0xffe9a0, 0.62, 0), core = mk(glowTex, 0xffffff, 0.12, 0); star.position.copy(starPos); rays.position.copy(starPos); core.position.copy(starPos); fx.add(star, rays, core);
  const beamTex = sprite((x, s) => { const gr = x.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, 'rgba(255,240,170,.9)'); gr.addColorStop(1, 'rgba(255,240,170,0)'); x.fillStyle = gr; x.fillRect(0, 0, s, s); const gx = x.createLinearGradient(0, 0, s, 0); gx.addColorStop(0, '#0000'); gx.addColorStop(.5, '#000'); gx.addColorStop(1, '#0000'); x.globalCompositeOperation = 'destination-in'; x.fillStyle = gx; x.fillRect(0, 0, s, s); }, 128);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.1, 0.78, 24, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0 })); beam.position.set(MANGER[0], 0.3, MANGER[2]); fx.add(beam);
  const mangerGlow = mk(glowTex, 0xffc070, 0.34, 0); mangerGlow.position.set(MANGER[0], MANGER[1] + 0.06, MANGER[2] + 0.02); fx.add(mangerGlow);
  const mangerLight = new THREE.PointLight(0xffb060, 0, 1.2, 1.8); mangerLight.position.set(MANGER[0], MANGER[1] + 0.12, MANGER[2] + 0.1); fx.add(mangerLight);

  // night sky: stars, fireflies, a shooting star now and then
  const NS = 220, sp = new Float32Array(NS * 3), sSeed = [];
  for (let i = 0; i < NS; i++) { const a = Math.random() * 6.283, el = Math.acos(1 - Math.random() * 0.85), r = rnd(1.1, 1.5); sp.set([Math.sin(el) * Math.cos(a) * r, Math.cos(el) * r * 0.9 + 0.1, Math.sin(el) * Math.sin(a) * r], i * 3); sSeed.push(Math.random() * 6); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ map: glowTex, color: 0xffffff, size: 0.035, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); stars.frustumCulled = false; fx.add(stars);
  const FF = 36, fp = new Float32Array(FF * 3), fSeed = Array.from({ length: FF }, () => ({ x: rnd(-0.6, 0.6), y: rnd(-0.2, 0.15), z: rnd(-0.9, 0.9), ph: Math.random() * 6, sp: rnd(0.2, 0.6) }));
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
  const flies = new THREE.Points(fg, new THREE.PointsMaterial({ map: glowTex, color: 0xd6ff7a, size: 0.026, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); flies.frustumCulled = false; fx.add(flies);
  const shoot = mk(glowTex, 0xffffff, 0.05, 0); fx.add(shoot); let shootT = 5, shootLive = 0, sv = new THREE.Vector3();

  if (debug) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.02), new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false })); m.position.set(...MANGER); fx.add(m); console.log('windows found:', wins.length); }

  function update(t, dt) {
    // pk = how far we are "inside the manger" (the town dims while the Family shows)
    famState.k += (famState.target - famState.k) * Math.min(1, dt * 2.6); const pk = famState.k; const fk = Math.min(1, famState.k), pop = fk < 0.98 ? fk * (1 + (1 - fk) * 0.25) : 1; fam.group.visible = fk > 0.01; fam.group.scale.setScalar(Math.max(0.001, FS * pop)); if (fam.group.visible) fam.update(t, dt);
    state.night += (state.target - state.night) * Math.min(1, dt * 1.6); const n = state.night;
    mat.color.lerpColors(DAY, NIGHT, n).multiplyScalar(1 - 0.72 * pk); mat.emissive.lerpColors(EDAY, ENIGHT, n).multiplyScalar(1 - 0.85 * pk); mat.emissiveIntensity = 1;   // the town dims while you look at the Family
    // windows come on one after another as it gets dark
    for (const L of lights) { const k = Math.min(1, Math.max(0, (n - 0.25) / 0.55 - L.on * 0.6)), fl = 0.85 + 0.15 * Math.sin(t * 7 + L.ph) * Math.sin(t * 2.3 + L.ph * 2); const o = k * fl + state.flash * Math.exp(-((L.w.p.x - state.fx) ** 2 + (L.w.p.z - state.fz) ** 2) * 18); L.s.material.opacity = Math.min(1, o) * 0.95 * (1 - 0.55 * pk); L.core.material.opacity = Math.min(1, o) * (1 - 0.55 * pk); }
    state.flash = Math.max(0, state.flash - dt * 1.4);
    // star + beam
    const sk = Math.max(0, (n - 0.5) / 0.5), pulse = 1 + Math.sin(t * 2.4) * 0.06; star.material.opacity = sk * 0.95; star.scale.setScalar(0.34 * pulse); rays.material.opacity = sk * 0.8; rays.scale.setScalar(0.62 * pulse); rays.material.rotation = t * 0.12; core.material.opacity = sk; beam.material.opacity = sk * 0.55;
    mangerGlow.material.opacity = sk * (0.8 + Math.sin(t * 3.1) * 0.12); mangerLight.intensity = sk * (1.1 + Math.sin(t * 5.3) * 0.12);
    stars.material.opacity = Math.min(1, n * 1.4) * (0.75 + Math.sin(t * 2.1) * 0.12); stars.material.size = 0.032 + Math.sin(t * 1.7) * 0.004;
    for (let i = 0; i < FF; i++) { const f = fSeed[i]; fp[i * 3] = f.x + Math.sin(t * f.sp + f.ph) * 0.06; fp[i * 3 + 1] = f.y + Math.sin(t * f.sp * 1.7 + f.ph) * 0.03; fp[i * 3 + 2] = f.z + Math.cos(t * f.sp + f.ph) * 0.06; }
    fg.attributes.position.needsUpdate = true; flies.material.opacity = Math.max(0, n - 0.4) * (0.6 + Math.sin(t * 3) * 0.3);
    shootT -= dt; if (shootT <= 0 && n > 0.8 && !shootLive) { shootLive = 1; shoot.position.set(rnd(-0.6, 0.2), rnd(0.65, 0.95), rnd(-0.7, 0.2)); sv.set(rnd(0.5, 0.9), rnd(-0.35, -0.2), rnd(-0.1, 0.2)); shootT = rnd(7, 12); }
    if (shootLive > 0) { shootLive -= dt * 1.5; shoot.position.addScaledVector(sv, dt); shoot.material.opacity = Math.max(0, shootLive); shoot.scale.set(0.09, 0.03, 1); if (shootLive <= 0) shoot.material.opacity = 0; }
  }
  state.fx = 0; state.fz = 0;
  return {
    group, model, update, state, windows: lights.length,
    setNight(on) { state.target = on ? 1 : 0; },
    isNight: () => state.target > 0.5,
    flashAt(p) { state.fx = p.x; state.fz = p.z; state.flash = 1.2; },
    family: fam, inFamily,
    showFamily(on) { famState.target = on ? 1 : 0; if (on) fam.glow(); },
    familyShown: () => famState.target > 0.5,
    isManger: p => Math.hypot(p.x - MANGER[0], p.z - MANGER[2]) < 0.22 && p.y < 0.15,
  };
}
