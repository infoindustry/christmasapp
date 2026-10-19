// «Портал в Вифлеем»: a glowing doorway opens in the room; through it you see the night over Bethlehem, and you can step inside.
//  Android (WebXR): the doorway stands on the floor in real size, walk through it. Other phones: a "window" (camera + gyroscope), the "Шагнуть внутрь" button flies the view in.
//  The trick: the doorway is a stencil mask. The whole night world is drawn only where the mask is (while you stand outside), and everywhere once you are inside.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { makeDate, skyAt, dirOf } from '../sky/astro.js';
const $ = id => document.getElementById(id), D = Math.PI / 180, ease = x => x * x * (3 - 2 * x), easeBack = x => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }, clamp = x => Math.max(0, Math.min(1, x));
const DOOR_W = 1.2, DOOR_H = 2.1, EYE = 1.35;
let subs = false; try { subs = localStorage.getItem('subs') === '1'; } catch { }
const win = new URLSearchParams(location.search).has('window');

// ---------- renderer / scene ----------
const canvas = $('gl'), renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, stencil: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor(0x000000, 0); renderer.localClippingEnabled = true;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(65, 1, 0.05, 200); scene.add(camera);
const P = new THREE.Group(); scene.add(P);                  // the portal: its local frame has the doorway at the origin, facing +z; the night lies behind it (-z)
const door = new THREE.Group(); P.add(door); const W = new THREE.Group(); P.add(W);   // W = the night world
const clipP = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), mats = [];
/** a material of the night world: drawn only inside the doorway (stencil) until the viewer is inside; near geometry is also cut at the doorway plane */
const night = (m, clip = true) => { m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.EqualStencilFunc; m.stencilFail = m.stencilZFail = m.stencilZPass = THREE.KeepStencilOp; if (clip) m.clippingPlanes = [clipP]; mats.push(m); return m; };
const nightTree = root => root.traverse(o => { if (o.isMesh) { for (const m of Array.isArray(o.material) ? o.material : [o.material]) night(m); o.frustumCulled = false; } });
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); } addEventListener('resize', resize); resize();

// ---------- the doorway ----------
(function buildDoor() {
  const sh = new THREE.Shape(); sh.moveTo(-DOOR_W / 2, 0); sh.lineTo(-DOOR_W / 2, DOOR_H - DOOR_W / 2); sh.absarc(0, DOOR_H - DOOR_W / 2, DOOR_W / 2, Math.PI, 0, true); sh.lineTo(DOOR_W / 2, 0); sh.closePath();
  const mask = new THREE.Mesh(new THREE.ShapeGeometry(sh, 24), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp, side: THREE.DoubleSide })); mask.renderOrder = -10; door.add(mask);
  const pts = []; for (let y = 0; y <= DOOR_H - DOOR_W / 2; y += 0.1) pts.push(new THREE.Vector3(-DOOR_W / 2, y, 0)); for (let a = 180; a >= 0; a -= 6) pts.push(new THREE.Vector3(Math.cos(a * D) * DOOR_W / 2, DOOR_H - DOOR_W / 2 + Math.sin(a * D) * DOOR_W / 2, 0)); for (let y = DOOR_H - DOOR_W / 2; y >= 0; y -= 0.1) pts.push(new THREE.Vector3(DOOR_W / 2, y, 0));
  const curve = new THREE.CatmullRomCurve3(pts), add = (r, c, o) => { const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, r, 8), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false })); m.renderOrder = 5; door.add(m); return m; };
  add(0.03, 0xffe08a, 1); door.glow1 = add(0.09, 0xffc850, 0.35); door.glow2 = add(0.13, 0xffb040, 0.12);
})();
door.scale.y = 0.001;

// ---------- the night world ----------
const cat = await fetch('sky/sky.json').then(r => r.json());
const dotTex = canvasTex(64, 64, x => { const r = x.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = r; x.fillRect(0, 0, 64, 64); });
// the sky: a gradient dome and the real stars (Bethlehem, a December night)
{
  const dome = new THREE.SphereGeometry(70, 32, 20), col = new Float32Array(dome.attributes.position.count * 3), pos = dome.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 70, k = clamp(y * 1.4); const c = new THREE.Color().setRGB(0.012 + (1 - k) * .06, 0.02 + (1 - k) * .09, 0.07 + (1 - k) * .22); col.set([c.r, c.g, c.b], i * 3); }
  dome.setAttribute('color', new THREE.BufferAttribute(col, 3)); const dm = new THREE.Mesh(dome, night(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }), false)); dm.renderOrder = -5; W.add(dm);
  const sky = skyAt(makeDate(-4, 12, 20, 22, 35.2), 31.7, 35.2, cat), n = sky.mags.length, p = new Float32Array(n * 3), sz = new Float32Array(n), al = new Float32Array(n);
  for (let i = 0; i < n; i++) { p[i * 3] = sky.stars[i * 3] * 64; p[i * 3 + 1] = Math.max(0.5, sky.stars[i * 3 + 1] * 64 + 0); p[i * 3 + 2] = sky.stars[i * 3 + 2] * 64; sz[i] = Math.max(2.2, (5.8 - sky.mags[i]) * 1.4) * Math.min(2, devicePixelRatio); al[i] = clamp(1.05 - sky.mags[i] * 0.16); if (sky.stars[i * 3 + 1] < 0.01) al[i] = 0; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('size', new THREE.BufferAttribute(sz, 1)); g.setAttribute('alpha', new THREE.BufferAttribute(al, 1));
  const sm = night(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexShader: 'attribute float size; attribute float alpha; varying float vA; void main(){ vA = alpha; gl_PointSize = size; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(1.0, 0.97, 0.9, smoothstep(0.5, 0.0, d) * vA); }' }), false);
  const pts = new THREE.Points(g, sm); pts.frustumCulled = false; pts.renderOrder = -4; W.add(pts);
}
const lit = (c, o = {}) => night(new THREE.MeshStandardMaterial({ color: c, roughness: 1, ...o }));
// ground, rocks, grass, olive trees: the near things that give depth and parallax
{
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48).rotateX(-Math.PI / 2), lit(0x1b2a1c)); W.add(ground);
  let s = 11; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const rocks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), lit(0x3a3a40), 90), grass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.05, 0.32, 4), lit(0x2d4a2a), 500), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  for (let i = 0; i < 90; i++) { const a = R() * 6.283, r = 2 + R() * 24, z = -Math.abs(Math.cos(a)) * r * 0.9 - 1; v.set(Math.sin(a) * r, 0, -Math.abs(Math.cos(a)) * r - 1.5 + (R() < .3 ? 6 : 0)); const k = 0.08 + R() * R() * 0.28; e.set(R() * 3, R() * 3, R() * 3); q.setFromEuler(e); sc.set(k * 1.3, k * 0.8, k); v.y = k * 0.3; void z; m4.compose(v, q, sc); rocks.setMatrixAt(i, m4); }
  for (let i = 0; i < 500; i++) { const a = R() * 6.283, r = 1.5 + R() * 20; v.set(Math.sin(a) * r, 0.14, Math.cos(a) * r - 2.5); e.set((R() - .5) * .3, R() * 6, (R() - .5) * .3); q.setFromEuler(e); sc.setScalar(0.5 + R() * 0.6); m4.compose(v, q, sc); grass.setMatrixAt(i, m4); }
  W.add(rocks, grass);
  const trunk = lit(0x2a1d14), leaf = lit(0x2b3f2a);
  for (let i = 0; i < 9; i++) { const a = (R() - .5) * 4 - 0.3, r = 9 + R() * 18, g = new THREE.Group(); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 2.2, 6), trunk); t.position.y = 1.1; const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), leaf); c.position.y = 3; c.scale.y = 0.7; g.add(t, c); g.position.set(Math.sin(a) * r, 0, -Math.cos(a) * r); W.add(g); }
  // hills around the horizon, a dark silhouette
  const N = 160, hp = [], hi = []; for (let i = 0; i <= N; i++) { const a = i / N * 6.283, h = 3.5 + 2.6 * Math.sin(a * 3 + 1) + 1.6 * Math.sin(a * 7) + 1.1 * Math.sin(a * 13 + 2); hp.push(Math.sin(a) * 52, 0, -Math.cos(a) * 52, Math.sin(a) * 52, h, -Math.cos(a) * 52); if (i < N) { const b = i * 2; hi.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); } }
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3)); hg.setIndex(hi); W.add(new THREE.Mesh(hg, night(new THREE.MeshBasicMaterial({ color: 0x050816, side: THREE.DoubleSide }))));
  // Bethlehem: a town of lit windows on a hill straight ahead
  const houses = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), night(new THREE.MeshBasicMaterial({ color: 0x0a0e22 })), 70), wins = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.2, 0.28), night(new THREE.MeshBasicMaterial({ color: 0xffc860, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })), 140), roofs = new THREE.InstancedMesh(new THREE.ConeGeometry(0.8, 0.5, 4), night(new THREE.MeshBasicMaterial({ color: 0x080b1c })), 70);
  let wi = 0; for (let i = 0; i < 70; i++) { const a = (R() - .5) * 0.9, r = 34 + R() * 12, w = 1.6 + R() * 2.2, h = 1.4 + R() * 1.6, y = (r - 32) * 0.18; v.set(Math.sin(a) * r, y + h / 2, -Math.cos(a) * r); e.set(0, a * 0.6 + R() * 0.4, 0); q.setFromEuler(e); sc.set(w, h, w); m4.compose(v, q, sc); houses.setMatrixAt(i, m4);
    v.y = y + h + 0.2; sc.set(w * 0.75, 1, w * 0.75); m4.compose(v, q, sc); roofs.setMatrixAt(i, m4);
    for (let k = 0; k < 2 && wi < 140; k++) { if (R() < .75) { v.set(Math.sin(a) * (r - w / 2 - 0.02) + (k ? 0.5 : -0.5) * w * 0.4, y + h * 0.5, -Math.cos(a) * (r - w / 2 - 0.02)); e.set(0, a * 0.6 * 0, 0); q.setFromEuler(e); sc.set(w * 0.5, w * 0.5, 1); m4.compose(v, q, sc); wins.setMatrixAt(wi++, m4); } } }
  wins.count = wi; houses.instanceMatrix.needsUpdate = roofs.instanceMatrix.needsUpdate = wins.instanceMatrix.needsUpdate = true; houses.frustumCulled = roofs.frustumCulled = wins.frustumCulled = false; W.add(houses, roofs, wins);
}
// light of the night: moon-blue from above and the shepherds' fire
const hemi = new THREE.HemisphereLight(0x5a6ab8, 0x1a2418, 1.3); W.add(hemi);
const FIRE = new THREE.Vector3(1.6, 0, -6.5), fireL = new THREE.PointLight(0xff8a3a, 12, 14, 2); fireL.position.copy(FIRE).setY(0.7); W.add(fireL);
const flameTex = canvasTex(128, 128, x => { const r = x.createRadialGradient(64, 90, 4, 64, 70, 56); r.addColorStop(0, 'rgba(255,240,170,1)'); r.addColorStop(.4, 'rgba(255,150,50,.85)'); r.addColorStop(1, 'rgba(255,80,20,0)'); x.fillStyle = r; x.fillRect(0, 0, 128, 128); });
const flames = [0, 1, 2].map(i => { const sp = new THREE.Sprite(night(new THREE.SpriteMaterial({ map: flameTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }), false)); sp.position.copy(FIRE).add(new THREE.Vector3((i - 1) * 0.12, 0.35 + i * .05, 0)); W.add(sp); return sp; });
const logs = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.12, 8), lit(0x2a1a10)); logs.position.copy(FIRE).setY(0.06); W.add(logs);
// the shepherd and his sheep (the same models as in the app)
const mixers = [], sheep = [], loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const fit = (obj, h) => { const b = new THREE.Box3().setFromObject(obj), s = b.getSize(new THREE.Vector3()), k = h / s.y; obj.scale.setScalar(k); const b2 = new THREE.Box3().setFromObject(obj), c = b2.getCenter(new THREE.Vector3()); obj.position.set(-c.x, -b2.min.y, -c.z); };
loader.loadAsync('witnesses/shepherd/model.glb').then(g => { const h = new THREE.Group(); h.add(g.scene); fit(g.scene, 1.65); h.position.set(FIRE.x - 1.1, 0, FIRE.z + 0.6); h.rotation.y = 0.5; nightTree(h); W.add(h); const talk = g.animations.find(a => /Talk/.test(a.name)), idle = g.animations.find(a => /Idle/.test(a.name)) || (talk && THREE.AnimationUtils.subclip(talk, 'idleFromTalk', 0, 2, 30)); if (idle) { const m = new THREE.AnimationMixer(g.scene); m.clipAction(idle).play(); mixers.push(m); } }).catch(() => { });
loader.loadAsync('animals/sheep.glb').then(g => { for (let i = 0; i < 7; i++) { const o = g.scene.clone(true), h = new THREE.Group(); h.add(o); fit(o, 0.62 + Math.random() * 0.12); const a = i / 7 * 6.283 + 0.4, r = 2.4 + Math.random() * 2.2; h.position.set(FIRE.x + Math.cos(a) * r, 0, FIRE.z + Math.sin(a) * r * 0.8); h.rotation.y = Math.random() * 6.28; nightTree(h); W.add(h); sheep.push({ h, p: Math.random() * 6 }); } }).catch(() => { });
// the star of Bethlehem and the angels
const STAR = dirOf(46, 300).map(x => x * 48), starV = new THREE.Vector3(STAR[0], STAR[1], STAR[2]);   // 60° to the left of straight ahead (az 300 = 60° west of north = forward is -z)
const starTex = canvasTex(256, 256, (x, w) => { const r = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,245,1)'); r.addColorStop(.15, 'rgba(255,240,180,.8)'); r.addColorStop(1, 'rgba(255,220,120,0)'); x.fillStyle = r; x.fillRect(0, 0, w, w); x.strokeStyle = 'rgba(255,248,215,.95)'; x.lineWidth = 3; x.beginPath(); x.moveTo(w * .08, w / 2); x.lineTo(w * .92, w / 2); x.moveTo(w / 2, w * .02); x.lineTo(w / 2, w * .98); x.stroke(); });
const star = new THREE.Sprite(night(new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }), false)); star.position.copy(starV); star.scale.setScalar(7); star.renderOrder = 2; W.add(star);
const beamTex = canvasTex(64, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,240,170,.8)'); g.addColorStop(1, 'rgba(255,240,170,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 3.5, starV.y, 24, 1, true), night(new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), false)); beam.position.set(starV.x, starV.y / 2, starV.z); W.add(beam);
const angelTex = canvasTex(256, 256, (g, w) => { g.translate(w / 2, w * .56); const s = w * .62; const gr = g.createRadialGradient(0, 0, 0, 0, 0, s * 1.2); gr.addColorStop(0, 'rgba(255,238,190,.6)'); gr.addColorStop(1, 'rgba(255,238,190,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s * 1.2, 0, 7); g.fill();
  for (const sd of [-1, 1]) { g.save(); g.scale(sd, 1); g.rotate(-.55); g.fillStyle = 'rgba(255,253,245,.95)'; g.beginPath(); g.ellipse(s * .38, -s * .2, s * .5, s * .17, 0, 0, 7); g.fill(); g.rotate(.4); g.fillStyle = 'rgba(255,250,235,.85)'; g.beginPath(); g.ellipse(s * .34, -s * .04, s * .42, s * .13, 0, 0, 7); g.fill(); g.restore(); }
  g.fillStyle = '#fffaf0'; g.beginPath(); g.moveTo(-s * .12, -s * .24); g.quadraticCurveTo(-s * .3, s * .22, -s * .34, s * .55); g.quadraticCurveTo(0, s * .66, s * .34, s * .55); g.quadraticCurveTo(s * .3, s * .22, s * .12, -s * .24); g.fill(); g.fillStyle = '#ffe2bd'; g.beginPath(); g.arc(0, -s * .36, s * .13, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,215,100,.95)'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, -s * .56, s * .13, s * .04, 0, 0, 7); g.stroke(); });
const angels = Array.from({ length: 16 }, (_, i) => { const sp = new THREE.Sprite(night(new THREE.SpriteMaterial({ map: angelTex, transparent: true, depthWrite: false, opacity: 0 }), false)); sp.visible = false; sp.renderOrder = 3; W.add(sp); return { sp, i, a0: i / 16 * 6.283, r: 9 + (i % 4) * 2.2, h: 6 + (i % 5) * 1.8, w: .12 + (i % 3) * .04, big: i === 0 }; });

// ---------- sound ----------
const AC = window.AudioContext || window.webkitAudioContext; let ac, pan, choir; const voice = new Audio(), amb = new Audio('audio/theme-nativity.mp3'); amb.loop = true; amb.volume = 0; let voiceEnd = null;
voice.onended = () => { const f = voiceEnd; voiceEnd = null; f?.(); };
const speak = (src, onend) => { voice.pause(); voiceEnd = onend || null; voice.src = src; voice.play().catch(() => onend && setTimeout(() => { if (voiceEnd === onend) { voiceEnd = null; onend(); } }, 4000)); };
function unlockAudio() { try { ac ||= new AC(); ac.resume(); choir = new Audio('audio/family/choir.mp3'); choir.loop = true; const s = ac.createMediaElementSource(choir); pan = ac.createPanner(); pan.panningModel = 'HRTF'; pan.distanceModel = 'inverse'; pan.refDistance = 6; pan.rolloffFactor = 0.4; s.connect(pan); pan.connect(ac.destination); choir.muted = true; choir.play().then(() => { choir.pause(); choir.muted = false; }).catch(() => { choir.muted = false; }); amb.play().then(() => amb.pause()).catch(() => { }); } catch { } }
const caption = t => { $('cap').textContent = t; $('cap').hidden = !subs || !t; };
const hint = t => { $('hint').textContent = t; };

// ---------- state ----------
let mode = null, session = null, placed = false, inside = false, prevZ = 1, openT = 0, phase = 'seek', hold = 0, angelT = 0, flashEl = null, t0 = performance.now();
const camW = new THREE.Vector3(), lp = new THREE.Vector3(), fwd = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), starW = new THREE.Vector3();
function setInside(v) {
  const changed = v !== inside; inside = v; for (const m of mats) m.stencilFunc = v ? THREE.AlwaysStencilFunc : THREE.EqualStencilFunc; clipP.constant = v ? 1e4 : 0;
  $('enter').hidden = !(mode === 'window' && placed && !v); $('leave').hidden = !(mode === 'window' && v);
  if (changed) { const f = document.createElement('div'); f.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:.85;pointer-events:none;transition:opacity 1.2s;z-index:3'; document.body.append(f); requestAnimationFrame(() => f.style.opacity = 0); setTimeout(() => f.remove(), 1400); }
  if (v) { amb.volume = .22; amb.play().catch(() => { }); phase = 'seek'; hold = 0; hint('Оглянись вокруг и найди яркую звезду'); caption('Найди Вифлеемскую звезду.'); speak('audio/sky/s0.mp3'); beam.material.opacity = 0; angels.forEach(a => { a.sp.visible = false; a.sp.material.opacity = 0; }); star.scale.setScalar(7); }
  else { amb.pause(); choir?.pause(); voice.pause(); caption(''); hint('Ты снова в комнате. Шагни в портал ещё раз.'); }
}
function story() {
  phase = 'found'; hint(''); caption('Вот она, Вифлеемская звезда! Её увидели мудрецы с востока. А пастухам в ту ночь явился ангел.'); if (navigator.vibrate) navigator.vibrate(60);
  speak('audio/sky/s1.mp3', () => { phase = 'announce'; angelT = 0; angels.forEach(a => a.sp.visible = true); caption('«Не бойтесь; я возвещаю вам великую радость, которая будет всем людям: ибо ныне родился вам в городе Давидовом Спаситель, Который есть Христос Господь».');
    speak('audio/sky/s2.mp3', () => { phase = 'sing'; try { ac?.resume(); choir.currentTime = 0; choir.play(); } catch { } caption('«Слава в вышних Богу, и на земле мир, в человеках благоволение!»');
      speak('audio/sky/s3.mp3', () => { phase = 'done'; caption(''); hint('Шагни назад в портал, чтобы вернуться в комнату.'); }); }); });
}

// ---------- per-frame ----------
const camWorld = () => { const c = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera; c.updateMatrixWorld(); return c; };
function frame(now, xrFrame) {
  const dt = Math.min(0.05, (now - t0) / 1000); t0 = now; const t = now / 1000;
  if (mode === 'window') updateWindowCam(dt);
  if (xrFrame && xrHit) xrHit(xrFrame);
  if (!placed) { renderer.render(scene, camera); return; }
  openT = Math.min(1.4, openT + dt); door.scale.y = Math.max(0.001, easeBack(clamp(openT / 1.2))); door.glow1.material.opacity = .3 + .15 * Math.sin(t * 3); door.glow2.material.opacity = .1 + .06 * Math.sin(t * 2.1);
  P.updateMatrixWorld(true); const c = camWorld(); camW.setFromMatrixPosition(c.matrixWorld); lp.copy(camW); P.worldToLocal(lp);
  // walking through the doorway flips the world: outside = a window, inside = the whole night
  const inRect = Math.abs(lp.x) < DOOR_W / 2 + 0.12 && lp.y > -0.3 && lp.y < DOOR_H + 0.2;
  if (openT > 0.3 && inRect) { if (!inside && prevZ > 0 && lp.z <= 0) setInside(true); else if (inside && prevZ < 0 && lp.z >= 0) setInside(false); }
  prevZ = lp.z; W.visible = inside || lp.z > 0;
  tmpV.set(0, 0, -1).transformDirection(P.matrixWorld); if (inside) { clipP.normal.copy(tmpV); clipP.constant = 1e4; } else clipP.setFromNormalAndCoplanarPoint(tmpV, starW.setFromMatrixPosition(P.matrixWorld));
  // life of the night: fire, sheep, the star
  fireL.intensity = 12 + Math.sin(t * 13) * 2 + Math.sin(t * 7.3) * 1.5; flames.forEach((f, i) => { const k = 0.7 + 0.25 * Math.sin(t * (9 + i * 3) + i); f.scale.set(0.55 * k, 0.9 * k + 0.2, 1); f.material.opacity = 0.75 + .25 * Math.sin(t * 11 + i); });
  mixers.forEach(m => m.update(dt)); sheep.forEach(s => { s.h.position.y = Math.max(0, Math.sin(t * 1.3 + s.p)) * 0.01; });
  star.scale.setScalar((phase === 'seek' ? 7 : 14) * (1 + Math.sin(t * 2.2) * 0.06)); beam.material.opacity = phase === 'seek' ? 0 : Math.min(.55, beam.material.opacity + dt * .5);
  // seeking the star: an arrow at the screen edge, hold it in the middle of the view
  if (inside && phase === 'seek') {
    starW.copy(starV); P.localToWorld(starW); fwd.set(0, 0, -1).transformDirection(c.matrixWorld); const toStar = starW.clone().sub(camW).normalize(), ang = Math.acos(clamp(fwd.dot(toStar) * .5 + .5) * 2 - 1) / D;
    const near = ang < 9; hold = near ? hold + dt : Math.max(0, hold - dt * 2); $('ring').hidden = !near && hold < 0.05; $('ring').style.setProperty('--p', Math.min(1, hold / 1.4)); if (hold > 1.4) { $('ring').hidden = true; $('arrow').hidden = true; story(); }
    // arrow: the star in camera space
    const cs = toStar.clone().applyQuaternion(tmpQ.setFromRotationMatrix(c.matrixWorld).invert()), a = $('arrow'); const visible = cs.z < -0.2 && Math.abs(cs.x / -cs.z) < 0.5 && Math.abs(cs.y / -cs.z) < 0.8; a.hidden = visible || phase !== 'seek';
    if (!a.hidden) { const th = Math.atan2(-cs.y, cs.x), rx = innerWidth / 2 - 40, ry = innerHeight / 2 - 110, k = 1 / Math.max(Math.abs(Math.cos(th)) / rx, Math.abs(Math.sin(th)) / ry); a.style.transform = `translate(${innerWidth / 2 + Math.cos(th) * k - 19}px,${innerHeight / 2 + Math.sin(th) * k - 19}px) rotate(${th}rad)`; }
  } else $('arrow').hidden = true;
  // the angels fly over (and the choir sings from where they are)
  if (phase === 'announce' || phase === 'sing' || phase === 'done') {
    angelT += dt; let cx = 0, cy = 0, cz = 0, w = 0;
    for (const a of angels) { const k = ease(clamp((angelT - a.i * 0.45) / 1.6)); const th = a.a0 + t * a.w * (a.i % 2 ? 1 : -1); const r = a.big ? 6 : a.r; a.sp.position.set(Math.sin(th) * r * 1.0, (a.big ? 9 : a.h) + Math.sin(t * .9 + a.i) * 0.6, -Math.cos(th) * r - 3); a.sp.material.opacity = k; a.sp.scale.setScalar(a.big ? 5.5 : 2.6 + (a.i % 3) * 0.4); cx += a.sp.position.x * k; cy += a.sp.position.y * k; cz += a.sp.position.z * k; w += k; }
    if (pan && w) { tmpV.set(cx / w, cy / w, cz / w); P.localToWorld(tmpV); const L = ac.listener; if (L.positionX) { L.positionX.value = camW.x; L.positionY.value = camW.y; L.positionZ.value = camW.z; fwd.set(0, 0, -1).transformDirection(c.matrixWorld); L.forwardX.value = fwd.x; L.forwardY.value = fwd.y; L.forwardZ.value = fwd.z; tmpQ.setFromRotationMatrix(c.matrixWorld); const up = new THREE.Vector3(0, 1, 0).applyQuaternion(tmpQ); L.upX.value = up.x; L.upY.value = up.y; L.upZ.value = up.z; } if (pan.positionX) { pan.positionX.value = tmpV.x; pan.positionY.value = tmpV.y; pan.positionZ.value = tmpV.z; } }
  }
  renderer.render(scene, camera);
}

// ---------- window mode (no WebXR): camera + gyroscope, the doorway hangs 2.6 m in front of you ----------
const view = { yaw: 0, pitch: -4, off: 0 }, sens = { on: false, has: false, q: new THREE.Quaternion() }, _e = new THREE.Euler(), _q1 = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2), _z = new THREE.Vector3(0, 0, 1), _t = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
let walk = { z: 0, goal: 0 };
function onOri(e) { if (e.beta == null || (e.alpha == null && e.webkitCompassHeading == null)) return; const a = e.webkitCompassHeading != null ? 360 - e.webkitCompassHeading : e.alpha, scr = (screen.orientation?.angle ?? window.orientation ?? 0) * D; _e.set(e.beta * D, a * D, -e.gamma * D, 'YXZ'); sens.q.setFromEuler(_e); sens.q.multiply(_q1); sens.q.multiply(_t.setFromAxisAngle(_z, -scr)); sens.has = true; }
async function startSensors() { try { if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) { if (await DeviceOrientationEvent.requestPermission() !== 'granted') return; } } catch { return; } addEventListener('deviceorientationabsolute', e => { sens.abs = true; onOri(e); }); addEventListener('deviceorientation', e => { if (!sens.abs) onOri(e); }); await new Promise(r => setTimeout(r, 600)); sens.on = sens.has; }
let drag = null; canvas.addEventListener('pointerdown', e => { if (mode === 'window') { drag = { x: e.clientX, y: e.clientY, yaw: view.yaw, pitch: view.pitch, off: view.off }; canvas.setPointerCapture(e.pointerId); } });
canvas.addEventListener('pointermove', e => { if (!drag) return; const k = 65 / Math.max(innerWidth, innerHeight), dx = (e.clientX - drag.x) * k, dy = (e.clientY - drag.y) * k; if (sens.on) view.off = drag.off + dx; else { view.yaw = drag.yaw + dx; view.pitch = Math.max(-89, Math.min(89, drag.pitch + dy)); } }); canvas.addEventListener('pointerup', () => drag = null);
function updateWindowCam(dt) {
  walk.z += (walk.goal - walk.z) * Math.min(1, dt * 1.6); camera.position.set(0, EYE, -walk.z);   // walk.z = metres walked toward the doorway
  if (sens.on) { tmpQ.copy(sens.q); if (view.off) tmpQ.premultiply(_t.setFromAxisAngle(_up, view.off * D)); camera.quaternion.slerp(tmpQ, 0.4); } else camera.quaternion.setFromEuler(_e.set(view.pitch * D, view.yaw * D, 0, 'YXZ'));
}
$('enter').onclick = () => { walk.goal = 3.6; hint(''); }; $('leave').onclick = () => { walk.goal = 0; };
async function startWindow() {
  mode = 'window'; await startSensors();
  try { $('cam').srcObject = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }); $('cam').classList.add('on'); $('cam').play(); } catch { }
  P.position.set(0, 0, -2.6); P.rotation.set(0, 0, 0); placed = true; openT = 0; prevZ = 1; walk = { z: 0, goal: 0 }; camera.position.set(0, EYE, 0); setInside(false); $('hint').textContent = 'Смотри в портал. Нажми «Шагнуть внутрь».';
}

// ---------- WebXR mode (Android): tap the floor to open the doorway ----------
let xrHit = null;
async function startXR() {
  mode = 'xr'; renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local');
  session = await navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay', 'local-floor'], domOverlay: { root: document.body } });
  await renderer.xr.setSession(session); const ref = renderer.xr.getReferenceSpace(), viewer = await session.requestReferenceSpace('viewer'), src = await session.requestHitTestSource({ space: viewer });
  const ret = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.13, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe8c46a })); ret.matrixAutoUpdate = false; ret.visible = false; scene.add(ret); let last = null;
  for (const sel of ['#bar', '#hud']) document.querySelector(sel)?.addEventListener('beforexrselect', e => e.preventDefault());
  hint('Наведи камеру на пол и коснись экрана: откроется портал'); placed = false;
  xrHit = f => { if (placed) return; const h = f.getHitTestResults(src); if (h.length) { const p = h[0].getPose(ref); last = new THREE.Matrix4().fromArray(p.transform.matrix); ret.matrix.copy(last); ret.visible = true; } else { ret.visible = false; last = null; } };
  session.addEventListener('select', () => { if (placed || !last) return; const pos = new THREE.Vector3().setFromMatrixPosition(last), c = camWorld(), cp = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld); P.position.copy(pos); P.rotation.set(0, Math.atan2(cp.x - pos.x, cp.z - pos.z), 0); placed = true; openT = 0; prevZ = 1; ret.visible = false; setInside(false); hint('Подойди к порталу и шагни внутрь'); });
  session.addEventListener('end', () => { xrHit = null; renderer.xr.enabled = false; scene.remove(ret); placed = false; inside = false; stopAll(); }); $('hud').hidden = false; $('start').hidden = true;
}
function stopAll() { voice.pause(); amb.pause(); choir?.pause(); $('hud').hidden = true; $('start').hidden = false; $('cam').classList.remove('on'); try { $('cam').srcObject?.getTracks().forEach(t => t.stop()); } catch { } placed = false; mode = null; setInside(false); P.visible = true; $('enter').hidden = $('leave').hidden = true; }
$('stop').onclick = () => { if (session) { try { session.end(); } catch { } session = null; } else stopAll(); };

// ---------- start ----------
const xrOk = !win && !!navigator.xr && await navigator.xr.isSessionSupported('immersive-ar').catch(() => false);
$('note').textContent = xrOk ? 'На этом телефоне портал встанет на пол в натуральный рост. Освободи немного места вокруг.' : 'На этом телефоне портал откроется как «окно»: камера и поворот телефона. Шагнуть внутрь можно кнопкой.';
$('go').onclick = async () => { unlockAudio(); try { if (xrOk) { await startXR(); } else { $('start').hidden = true; $('hud').hidden = false; await startWindow(); } } catch (e) { console.warn(e); $('start').hidden = false; $('hud').hidden = true; $('note').textContent = 'Не получилось включить камеру. Разреши доступ и попробуй ещё раз.'; } };
window.__portal = { P, view, get inside() { return inside; }, setInside, story, get phase() { return phase; }, walk: () => walk, begin: () => $('go').click() };
renderer.setAnimationLoop(frame);
