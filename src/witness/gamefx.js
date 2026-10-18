// "Пряничек и звёзды Вифлеема": the gingerbread runs to where you tap and collects stars. The board is the medallion (the printed one in AR).
import * as THREE from 'three';

const R = 0.5, BOARD = 0.42;   // playable radius on the disc
const rnd = (a, b) => a + Math.random() * (b - a);
const star = (outer, inner, depth) => {
  const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? inner : outer, a = i / 10 * Math.PI * 2 - Math.PI / 2; (i ? s.lineTo : s.moveTo).call(s, Math.cos(a) * r, Math.sin(a) * r); } s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2 }); g.center(); return g;
};

export async function buildGame(loader, discTop, hooks = {}) {
  const gltf = await loader.loadAsync('game/gingerbread.glb'); const model = gltf.scene;
  // the candy models (Meshy): normalised to a target size, standing on y = 0
  const SIZES = { marshmallow: 0.13, tree: 0.2, snowflake: 0.12, ornament: 0.075, cane: 0.11, lollipop: 0.11 }, TPL = {};
  await Promise.all(Object.entries(SIZES).map(async ([k, h]) => { try { const g = (await loader.loadAsync(`game/items/${k}.glb`)).scene; const bb = new THREE.Box3().setFromObject(g), sz = bb.getSize(new THREE.Vector3()), kk = h / Math.max(sz.x, sz.y, sz.z); g.scale.setScalar(kk); g.updateMatrixWorld(true); const b2 = new THREE.Box3().setFromObject(g), c = b2.getCenter(new THREE.Vector3()); const wrap = new THREE.Group(); g.position.set(-c.x, -b2.min.y, -c.z); wrap.add(g); g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } }); TPL[k] = wrap; } catch (e) { console.warn('item model missing', k); } }));
  const inst = k => TPL[k] ? TPL[k].clone(true) : null;
  const b = new THREE.Box3().setFromObject(model), sz = b.getSize(new THREE.Vector3()); model.scale.setScalar(0.24 / sz.y); model.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(model), c = b2.getCenter(new THREE.Vector3()); model.position.set(-c.x, -b2.min.y, -c.z);
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  const gb = new THREE.Group(); gb.add(model); gb.position.set(0, discTop, 0.12);
  const root = new THREE.Group(); root.add(gb);

  // animations from the Meshy rig
  const mixer = new THREE.AnimationMixer(model), by = rx => gltf.animations.find(a => rx.test(a.name));
  const act = {}; for (const [k, rx] of Object.entries({ idle: /Idle/, run: /^Run_02/, walk: /Walking/, jump: /Jump/, cheer: /Victory/, dance: /Dancing/, wave: /Wave/, fall: /Stand_Up/ })) { const cl = by(rx); if (cl) act[k] = mixer.clipAction(cl); }
  const ONCE = new Set(['jump', 'cheer', 'wave', 'fall']); for (const k of ONCE) if (act[k]) { act[k].setLoop(THREE.LoopOnce, 1); act[k].clampWhenFinished = true; }
  let cur = null, lock = 0;
  const play = (name, fade = 0.18) => { const a = act[name]; if (!a || cur === a) return; a.reset().setEffectiveWeight(1).play(); if (cur) cur.crossFadeTo(a, fade, false); cur = a; };
  const once = (name, len) => { if (!act[name]) return; play(name, 0.12); lock = len ?? act[name].getClip().duration; };
  play('idle');

  // items
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc933, emissive: 0xffa000, emissiveIntensity: 0.7, metalness: 0.5, roughness: 0.35 });
  const white = new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xffe9a0, emissiveIntensity: 1.1, metalness: 0.3, roughness: 0.3 });
  const ballCols = [0xe03a3a, 0x3a7be0, 0x3ac26a, 0xd94fd0].map(col => new THREE.MeshStandardMaterial({ color: col, metalness: 0.7, roughness: 0.25, emissive: col, emissiveIntensity: 0.18 }));
  const starG = star(0.05, 0.022, 0.014), bigG = star(0.085, 0.036, 0.02), ballG = new THREE.SphereGeometry(0.03, 20, 14);
  const collectible = type => { const k = type === 'big' ? 'snowflake' : type; let m = type === 'star' ? null : inst(k); if (!m) { const st = new THREE.Mesh(type === 'big' ? bigG : starG, type === 'big' ? white : gold); st.castShadow = true; st.position.y = type === 'big' ? 0.08 : 0.055; m = new THREE.Group(); m.add(st); } m.userData.type = type; return m; };   // stars are drawn centred, the candies stand on y = 0
  const items = []; let spawnT = 0;
  const spawn = () => {
    let x, z, tries = 0; do { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * BOARD; x = Math.cos(a) * r; z = Math.sin(a) * r; tries++; } while (tries < 12 && (Math.hypot(x - gb.position.x, z - gb.position.z) < 0.15 || items.some(i => Math.hypot(i.x - x, i.z - z) < 0.1)));
    const roll = Math.random(), type = roll < 0.08 ? 'big' : roll < 0.3 ? 'star' : roll < 0.5 ? 'ornament' : roll < 0.75 ? 'lollipop' : 'cane';
    const mesh = collectible(type); mesh.position.set(x, discTop + 0.02, z); mesh.scale.setScalar(0.01); root.add(mesh);
    items.push({ mesh, type, x, z, ph: Math.random() * 6, born: 0 });
  };
  // sparkles
  const SP = 90, spPos = new Float32Array(SP * 3), spV = Array.from({ length: SP }, () => ({ v: new THREE.Vector3(), life: 0 })), spGeo = new THREE.BufferGeometry(); spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  const sparks = new THREE.Points(spGeo, new THREE.PointsMaterial({ color: 0xffe27a, size: 0.022, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sparks.frustumCulled = false; root.add(sparks);
  let spI = 0; const burst = (p, n = 14, big = false) => { for (let k = 0; k < n; k++) { const s = spV[spI++ % SP]; s.life = big ? 1.1 : 0.7; s.v.set(rnd(-0.25, 0.25), rnd(0.2, 0.55), rnd(-0.25, 0.25)).multiplyScalar(big ? 1.5 : 1); spPos.set([p.x, p.y, p.z], ((spI - 1) % SP) * 3); } };
  for (let i = 0; i < SP; i++) spPos[i * 3 + 1] = -9;

  // ---------------- endless runner: the track scrolls under the running gingerbread; swipe to change lane, tap / swipe up to jump
  const LANES = [-0.22, 0, 0.22], TRACK_L = 3.4;
  const trackTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d'); x.fillStyle = '#eaf3fb'; x.fillRect(0, 0, 512, 512);
    x.fillStyle = '#ffffff'; for (let i = 0; i < 70; i++) { x.globalAlpha = 0.5; x.beginPath(); x.arc(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 5, 0, 7); x.fill(); } x.globalAlpha = 1;
    x.fillStyle = '#d93a3a'; for (let y = 0; y < 512; y += 64) { x.fillRect(0, y, 22, 32); x.fillRect(490, y + 32, 22, 32); x.fillStyle = '#fff'; x.fillRect(0, y + 32, 22, 32); x.fillRect(490, y, 22, 32); x.fillStyle = '#d93a3a'; }
    x.fillStyle = '#b8d4ee'; for (const lx of [175, 337]) for (let y = 0; y < 512; y += 64) x.fillRect(lx - 3, y + 8, 6, 36);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, TRACK_L / 0.8); t.anisotropy = 4; return t; })();
  const track = new THREE.Mesh(new THREE.PlaneGeometry(0.8, TRACK_L).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: trackTex, roughness: 0.9 })); track.position.set(0, discTop + 0.002, -TRACK_L / 2 + 0.35); track.receiveShadow = true; track.visible = false; root.add(track);
  const decor = []; const treeM = new THREE.MeshStandardMaterial({ color: 0x2f9e5a, roughness: 0.8 }), snowTop = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), trunkM = new THREE.MeshStandardMaterial({ color: 0x7a4a24 });
  for (let i = 0; i < 8; i++) { const real = TPL.tree && (i % 3 !== 2) ? inst('tree') : (TPL.cane && i % 3 === 2 ? inst('cane') : null); if (real) { real.scale.setScalar(rnd(1.0, 1.4)); real.position.set((i % 2 ? 1 : -1) * rnd(0.56, 0.68), discTop, -(i >> 1) * (TRACK_L / 4) + 0.3); real.visible = false; root.add(real); decor.push(real); continue; } const t = new THREE.Group(); const sz = rnd(0.9, 1.25); for (let k = 0; k < 3; k++) { const cone = new THREE.Mesh(new THREE.ConeGeometry(0.09 - k * 0.02, 0.12, 10), treeM); cone.position.y = 0.09 + k * 0.07; t.add(cone); } const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 6), trunkM); tr.position.y = 0.03; t.add(tr); const top = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), snowTop); top.position.y = 0.3; t.add(top); t.scale.setScalar(sz); t.position.set((i % 2 ? 1 : -1) * rnd(0.56, 0.68), discTop, -(i >> 1) * (TRACK_L / 4) + 0.3); t.visible = false; t.userData.side = i % 2; root.add(t); decor.push(t); }
  const RUN = { on: false, dist: 0, speed: 0.6, lane: 1, jump: 0, row: 0, obs: [], pick: [] };
  const giftM = [0xd93a3a, 0x2f9e5a, 0x3a7be0].map(col => new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 })), ribbonM = new THREE.MeshStandardMaterial({ color: 0xffe27a, metalness: 0.5, roughness: 0.4 });
  const iceM = new THREE.MeshStandardMaterial({ color: 0xcfeaff, roughness: 0.15, metalness: 0.2, emissive: 0x7fbfff, emissiveIntensity: 0.25, transparent: true, opacity: 0.92 });
  const addObs = (kind, lane, z) => {
    let mesh; if (kind === 'ball') { mesh = inst('marshmallow') || new THREE.Mesh(snowG, snowM); mesh.scale.setScalar(1.15); mesh.position.set(LANES[lane], discTop, z); }
    else if (kind === 'gift' && TPL.tree) { mesh = inst('tree'); mesh.position.set(LANES[lane], discTop, z); }
    else if (kind === 'gift') { mesh = new THREE.Group(); const box = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), giftM[(Math.random() * 3) | 0]); box.position.y = 0.06; const rb = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.125, 0.026), ribbonM); rb.position.y = 0.06; mesh.add(box, rb); mesh.position.set(LANES[lane], discTop, z); }
    else { mesh = new THREE.Group(); for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 8), iceM); c.position.set((k - 1) * 0.045, 0.05, 0); mesh.add(c); } mesh.position.set(LANES[lane], discTop, z); }
    mesh.castShadow = true; root.add(mesh); RUN.obs.push({ kind, lane, mesh, z });
  };
  const POOL = ['star', 'ornament', 'lollipop', 'cane', 'ornament']; let pi = 0;
  const addStar = (lane, z, high = false) => { const m = collectible(POOL[pi++ % POOL.length]); m.position.set(LANES[lane], discTop + (high ? 0.2 : 0.03), z); root.add(m); RUN.pick.push({ mesh: m, lane, z, high }); };
  let lastHard = false;
  const spawnRow = () => {
    const z = -TRACK_L + 0.4, lane = (Math.random() * 3) | 0, other = (lane + 1 + ((Math.random() * 2) | 0)) % 3, third = 3 - lane - other;
    let r = Math.random(); if (lastHard) r = r * 0.35;   // after an obstacle: a calm row of candies first
    if (r < 0.35) { const n = 3; for (let k = 0; k < n; k++) addStar(lane, z - k * 0.14); lastHard = false; }
    else if (r < 0.65) { addObs(Math.random() < 0.5 ? 'ball' : 'gift', lane, z); for (let k = 0; k < 2; k++) addStar(other, z - k * 0.14); lastHard = true; }   // one block, candies in another lane
    else if (r < 0.85) { const full = Math.random() < 0.4; for (const l of (full ? [0, 1, 2] : [lane])) addObs('ice', l, z); for (let k = -1; k <= 1; k++) addStar(full ? 1 : lane, z + k * 0.1, true); lastHard = true; }   // spikes: jump (the candies are up in the air)
    else { addObs('ball', lane, z); addObs('gift', other, z); addStar(third, z - 0.07); lastHard = true; }   // two blocks, one free lane
  };
  const clearRun = () => { for (const o of RUN.obs) root.remove(o.mesh); for (const p of RUN.pick) root.remove(p.mesh); RUN.obs.length = 0; RUN.pick.length = 0; };

  // game state
  const S = { playing: false, score: 0, left: 45, total: 45, collected: 0, idle: 0, hearts: 3, inv: 0, air: 0 }, listeners = [];
  const emit = (name, d) => listeners.forEach(f => f(name, d));
  // danger: snowballs roll across the board (a red glow warns where they come from); a tap on the gingerbread makes him jump over them
  const snowM = new THREE.MeshStandardMaterial({ color: 0xf4f9ff, roughness: 0.95, emissive: 0x9fb8d8, emissiveIntensity: 0.18 }), snowG = new THREE.SphereGeometry(0.05, 18, 14);
  const warnTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,80,60,.95)'); g.addColorStop(1, 'rgba(255,80,60,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const balls = []; let ballT = 3;
  const spawnBall = () => {
    const a = Math.random() * 6.283, sp = 0.3 + 0.2 * (1 - S.left / S.total) + Math.random() * 0.08;
    const sx = Math.cos(a) * (R - 0.04), sz = Math.sin(a) * (R - 0.04), aim = (Math.random() - 0.5) * 0.9, tx = Math.cos(a + Math.PI + aim) * (R - 0.04), tz = Math.sin(a + Math.PI + aim) * (R - 0.04), d = Math.hypot(tx - sx, tz - sz);
    const mesh = inst('marshmallow') || new THREE.Mesh(snowG, snowM); mesh.castShadow = true; mesh.position.set(sx, discTop, sz); mesh.visible = false; root.add(mesh);
    const warn = new THREE.Sprite(new THREE.SpriteMaterial({ map: warnTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); warn.position.set(sx * 0.93, discTop + 0.04, sz * 0.93); warn.scale.setScalar(0.16); root.add(warn);
    balls.push({ mesh, warn, x: sx, z: sz, vx: (tx - sx) / d * sp, vz: (tz - sz) / d * sp, wait: 0.9, life: d / sp + 0.2 });
  };
  let target = null, yaw = 0; const LOCAL = new THREE.Vector3(); let mode = 'collect';

  function update(t, dt) {
    mixer.update(dt);
    if (mode === 'run') { runUpdate(t, dt); return; }
    if (lock > 0) { lock -= dt; if (lock <= 0) { lock = 0; cur = null; play(target ? 'run' : 'idle'); } }
    // run to the tapped point
    if (target) {
      const dx = target.x - gb.position.x, dz = target.z - gb.position.z, d = Math.hypot(dx, dz);
      if (d < 0.015) { target = null; if (!lock) play('idle'); }
      else { const step = Math.min(d, 0.62 * dt); gb.position.x += dx / d * step; gb.position.z += dz / d * step; const want = Math.atan2(dx, dz); let dy = want - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); yaw += dy * Math.min(1, dt * 12); gb.rotation.y = yaw; if (!lock) play('run'); }
    }
    S.inv = Math.max(0, S.inv - dt); S.air = Math.max(0, S.air - dt); model.visible = !(S.inv > 0 && S.air <= 0 && Math.floor(t * 12) % 2 === 0);   // blink after a hit
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      if (b.wait > 0) { b.wait -= dt; b.warn.material.opacity = 0.5 + 0.5 * Math.sin(t * 16); if (b.wait <= 0) { b.mesh.visible = true; root.remove(b.warn); } continue; }
      b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt; b.mesh.position.x = b.x; b.mesh.position.z = b.z; b.mesh.rotation.x += dt * 6; b.mesh.rotation.z += dt * 4;
      if (S.playing && S.inv <= 0 && S.air <= 0 && Math.hypot(b.x - gb.position.x, b.z - gb.position.z) < 0.075) {
        S.hearts--; S.inv = 1.6; burst(b.mesh.position, 16); once('fall', 1.5); target = null; emit('hit', { hearts: S.hearts });
        root.remove(b.mesh); balls.splice(i, 1);
        if (S.hearts <= 0) { S.playing = false; for (const o of balls) { root.remove(o.mesh); root.remove(o.warn); } balls.length = 0; emit('end', { score: S.score, win: false }); }
        continue;
      }
      if (b.life <= 0) { root.remove(b.mesh); balls.splice(i, 1); }
    }
    // items bob and spin; collect on touch
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i]; it.born += dt; const sc = Math.min(1, it.born * 4); it.mesh.scale.setScalar(Math.max(0.01, sc)); it.mesh.position.y = discTop + 0.02 + Math.abs(Math.sin(t * 2.2 + it.ph)) * 0.02; it.mesh.rotation.y += dt * 1.6;
      if (S.playing && Math.hypot(it.x - gb.position.x, it.z - gb.position.z) < (it.type === 'big' ? 0.11 : 0.085)) {
        const pts = it.type === 'big' ? 5 : 1; S.score += pts; S.collected++; burst(it.mesh.position, it.type === 'big' ? 30 : 14, it.type === 'big'); root.remove(it.mesh); items.splice(i, 1);
        if (S.collected % 5 === 0) once('jump', 1.1);
        emit('collect', { pts, big: it.type === 'big', score: S.score, jump: S.collected % 5 === 0 });
      }
    }
    if (S.playing) {
      spawnT -= dt; if (spawnT <= 0 && items.length < 7) { spawn(); spawnT = rnd(0.7, 1.3); }
      ballT -= dt; if (ballT <= 0) { spawnBall(); ballT = Math.max(1.3, 3.4 - 2 * (1 - S.left / S.total)) * rnd(0.8, 1.2); }
      S.left -= dt; S.idle += target ? -S.idle : dt; if (S.idle > 6) { S.idle = 0; once('wave', 1.6); emit('idle'); }
      if (S.left <= 0) { S.left = 0; S.playing = false; for (const o of balls) { root.remove(o.mesh); root.remove(o.warn); } balls.length = 0; const win = S.score >= 10; once(win ? 'cheer' : 'wave', 3); if (win) setTimeout(() => play('dance'), 3000); emit('end', { score: S.score, win }); }
    }
    for (let i = 0; i < SP; i++) { const s = spV[i]; if (s.life > 0) { s.life -= dt; spPos[i * 3] += s.v.x * dt; spPos[i * 3 + 1] += s.v.y * dt; spPos[i * 3 + 2] += s.v.z * dt; s.v.y -= 0.9 * dt; if (s.life <= 0) spPos[i * 3 + 1] = -9; } }
    spGeo.attributes.position.needsUpdate = true;
  }
  function runUpdate(t, dt) {
    mixer.update(0);   // (mixer was advanced above)
    if (lock > 0) { lock -= dt; if (lock <= 0) { lock = 0; cur = null; play('run'); } }
    S.inv = Math.max(0, S.inv - dt); model.visible = !(S.inv > 0 && Math.floor(t * 12) % 2 === 0);
    if (RUN.on) { RUN.speed = Math.min(1.25, 0.55 + RUN.dist * 0.0035); }
    const v = RUN.on ? RUN.speed : 0.18;   // the track scrolls toward the camera
    if (RUN.on) RUN.dist += v * dt * 1.0;
    trackTex.offset.y += (v * dt) / 0.8;
    for (const d of decor) { d.position.z += v * dt; if (d.position.z > 0.45) d.position.z -= TRACK_L + 0.15; }
    // lane change and jump (the clip itself runs in place, so the height is applied here)
    gb.position.x += (LANES[RUN.lane] - gb.position.x) * Math.min(1, dt * 12); gb.position.z = 0.1; gb.rotation.y = Math.PI;
    if (RUN.jump > 0) { RUN.jump -= dt; const k = 1 - Math.max(0, RUN.jump) / 0.75; gb.position.y = discTop + 0.2 * Math.sin(Math.PI * Math.min(1, k)); if (RUN.jump <= 0) gb.position.y = discTop; }
    const air = gb.position.y - discTop;
    if (RUN.on) {
      RUN.row -= v * dt; if (RUN.row <= 0) { spawnRow(); RUN.row = rnd(1.05, 1.45); }
      for (let i = RUN.obs.length - 1; i >= 0; i--) {
        const o = RUN.obs[i]; o.z += v * dt; o.mesh.position.z = o.z; if (o.kind === 'ball') o.mesh.rotation.x += v * dt * 14;
        if (S.inv <= 0 && Math.abs(o.z - gb.position.z) < 0.07 && Math.abs(o.mesh.position.x - gb.position.x) < 0.11 && !(o.kind === 'ice' && air > 0.07)) {
          S.hearts--; S.inv = 1.4; once('fall', 1.2); play('fall'); burst(o.mesh.position, 16); emit('hit', { hearts: S.hearts });
          if (S.hearts <= 0) { RUN.on = false; S.playing = false; emit('end', { score: S.score, dist: Math.floor(RUN.dist * 10), win: RUN.dist * 10 >= 60, run: true }); }
        }
        if (o.z > 0.5) { root.remove(o.mesh); RUN.obs.splice(i, 1); }
      }
      for (let i = RUN.pick.length - 1; i >= 0; i--) {
        const p = RUN.pick[i]; p.z += v * dt; p.mesh.position.z = p.z; p.mesh.rotation.y += dt * 3;
        if (Math.abs(p.z - gb.position.z) < 0.08 && Math.abs(p.mesh.position.x - gb.position.x) < 0.11 && (!p.high || air > 0.08)) { S.score++; S.collected++; burst(p.mesh.position, 12); root.remove(p.mesh); RUN.pick.splice(i, 1); emit('collect', { pts: 1, big: false, score: S.score, jump: false }); }
        else if (p.z > 0.5) { root.remove(p.mesh); RUN.pick.splice(i, 1); }
      }
      emit('dist', { dist: Math.floor(RUN.dist * 10) });
    }
    for (let i = 0; i < SP; i++) { const s = spV[i]; if (s.life > 0) { s.life -= dt; spPos[i * 3] += s.v.x * dt; spPos[i * 3 + 1] += s.v.y * dt; spPos[i * 3 + 2] += s.v.z * dt; s.v.y -= 0.9 * dt; if (s.life <= 0) spPos[i * 3 + 1] = -9; } }
    spGeo.attributes.position.needsUpdate = true;
  }
  const setMode = m => { mode = m; const run = m === 'run'; track.visible = run; for (const d of decor) d.visible = run; hooks.setView?.(m); };
  return {
    group: root, model: gb, update, S, items, on: f => listeners.push(f),
    setMode, get mode() { return mode; },
    get runInfo() { return { obs: RUN.obs.length, pick: RUN.pick.length, speed: +RUN.speed.toFixed(2), dist: +RUN.dist.toFixed(1) }; },
    // the quiz host: the gingerbread reacts to answers
    react(kind) { if (kind === 'ok') { once('cheer', 2.2); burst(new THREE.Vector3(gb.position.x, discTop + 0.22, gb.position.z), 26, true); } else if (kind === 'no') { once('fall', 1.4); } else if (kind === 'win') { once('cheer', 3); burst(new THREE.Vector3(gb.position.x, discTop + 0.22, gb.position.z), 40, true); setTimeout(() => play('dance'), 3000); } else if (kind === 'idle') { play('idle'); } else if (kind === 'think') { once('wave', 1.6); } },
    // runner controls
    lane(d) { RUN.lane = Math.max(0, Math.min(2, RUN.lane + d)); },
    jump() { if (RUN.jump <= 0 && RUN.on) { RUN.jump = 0.75; once('jump', 0.75); emit('jump'); } },
    startRun() { setMode('run'); for (const it of items) root.remove(it.mesh); items.length = 0; clearRun(); Object.assign(S, { playing: true, score: 0, hearts: 3, inv: 0, air: 0, collected: 0 }); lastHard = false; Object.assign(RUN, { on: true, dist: 0, speed: 0.55, lane: 1, jump: 0, row: 1.2 }); gb.position.set(0, discTop, 0.1); target = null; model.visible = true; cur = null; play('run'); emit('start'); },
    start() { setMode('collect'); clearRun(); RUN.on = false; for (const it of items) root.remove(it.mesh); items.length = 0; Object.assign(S, { playing: true, score: 0, left: S.total, collected: 0, idle: 0, hearts: 3, inv: 0, air: 0 }); for (const o of balls) { root.remove(o.mesh); root.remove(o.warn); } balls.length = 0; ballT = 3; model.visible = true; gb.position.set(0, discTop, 0.12); target = null; cur = null; play('idle'); once('jump', 1.0); spawnT = 0; emit('start'); },
    tap(worldPoint, obj) {   // a tap on the gingerbread tickles it; a tap on the board sends it there
      let o = obj, onGb = false; while (o) { if (o === gb) { onGb = true; break; } o = o.parent; }
      if (onGb) { once('jump', 1.0); S.air = 0.9; emit(S.playing ? 'jump' : 'tickle'); burst(new THREE.Vector3(gb.position.x, discTop + 0.2, gb.position.z), 8); return; }
      root.worldToLocal(LOCAL.copy(worldPoint)); const r = Math.hypot(LOCAL.x, LOCAL.z), k = r > BOARD ? BOARD / r : 1;
      target = { x: LOCAL.x * k, z: LOCAL.z * k }; S.idle = 0; if (!lock) play('run');
    },
    finish() { play('cheer'); },
  };
}
