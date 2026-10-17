// "The Shepherd's Night" — a short film. The user's shepherd boy, choreographed by code.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const $ = id => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const ramp = (t, a, b) => smooth((t - a) / (b - a));
const lerp = (a, b, u) => a + (b - a) * u;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, u) => a.clone().lerp(b, u);
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------- renderer / post ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x070b20); scene.fog = new THREE.FogExp2(0x0a1230, 0.014);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.7, 0.6, 0.9); composer.addPass(bloom); composer.addPass(new OutputPass());
const fit = () => { renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
fit(); addEventListener('resize', fit);

// ---------- procedural textures ----------
const canvasTex = (w, h, draw, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
const glowTex = canvasTex(128, 128, (g, w) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.2, 'rgba(255,236,180,.75)'); r.addColorStop(1, 'rgba(255,200,110,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
const haloTex = canvasTex(256, 256, (g, w) => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); for (let i = 0; i <= 10; i++) { const x = i / 10; r.addColorStop(x, `rgba(255,225,160,${Math.pow(1 - x, 3.2) * .9})`); } g.fillStyle = r; g.fillRect(0, 0, w, w); });
const flareTex = canvasTex(512, 512, g => { const c = 256; const r = g.createRadialGradient(c, c, 0, c, c, 70); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.4, 'rgba(255,235,170,.55)'); r.addColorStop(1, 'rgba(255,210,120,0)'); g.fillStyle = r; g.fillRect(0, 0, 512, 512);
  for (const [dx, dy, len] of [[1, 0, 250], [0, 1, 250], [.7, .7, 110], [.7, -.7, 110]]) { const gr = g.createLinearGradient(c - dx * len, c - dy * len, c + dx * len, c + dy * len); gr.addColorStop(0, 'rgba(255,230,160,0)'); gr.addColorStop(.5, 'rgba(255,248,225,.95)'); gr.addColorStop(1, 'rgba(255,230,160,0)'); g.strokeStyle = gr; g.lineWidth = dx && dy ? 2 : 3; g.beginPath(); g.moveTo(c - dx * len, c - dy * len); g.lineTo(c + dx * len, c + dy * len); g.stroke(); } });
const grassBump = canvasTex(256, 256, (g, w, h) => { const id = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = 128 + (Math.random() - .5) * 90; const i = (y * w + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } g.putImageData(id, 0, 0); }, false);
grassBump.repeat.set(60, 60);

// ---------- sky ----------
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uGlow: { value: 0 }, uAngel: { value: 0 } },
  vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `varying vec3 p; uniform float uGlow, uAngel;
    void main(){ float h = clamp(p.y, 0.0, 1.0);
      vec3 horizon = vec3(0.07,0.11,0.26), mid = vec3(0.04,0.06,0.20), top = vec3(0.01,0.02,0.09);
      vec3 c = mix(horizon, mid, smoothstep(0.0,0.22,h)); c = mix(c, top, smoothstep(0.18,0.85,h));
      c += vec3(1.0,0.66,0.26) * uAngel * (0.04 + 0.5*smoothstep(0.3,1.0,h));         // heaven opens: gold from above
      float toward = smoothstep(0.0, 1.0, -p.z) * (1.0 - smoothstep(0.0, 0.3, h));       // warm glow over Bethlehem
      c += vec3(1.0,0.62,0.28) * toward * uGlow * 0.5;
      gl_FragColor = vec4(c,1.0); }` });
scene.add(new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), skyMat));
{ const n = 1500, pos = new Float32Array(n * 3), col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = rnd() * 6.283, e = Math.pow(rnd(), .8) * 1.35 + 0.04, r = 280; pos[i*3] = Math.cos(a) * Math.cos(e) * r; pos[i*3+1] = Math.sin(e) * r; pos[i*3+2] = Math.sin(a) * Math.cos(e) * r; const b = .5 + rnd() * 1.6; col[i*3] = b; col[i*3+1] = b * .95; col[i*3+2] = b * .85; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, size: 7, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); }

// ---------- terrain ----------
const BETH = V(0, 0, -80);
const hgt = (x, z) => {
  const n = Math.sin(x * .05 + 1.1) * Math.cos(z * .045) * 4.4 + Math.sin(x * .11 + z * .08) * 1.6 + Math.sin(x * .27 - z * .23) * .4 + Math.cos(z * .02 + x * .03) * 3;
  const flatFire = smooth((Math.hypot(x, z) - 9) / 14);
  const corridor = smooth((Math.abs(x) - 5) / 16), onPath = lerp(1, corridor, smooth((-z - 8) / 10));
  const nearB = smooth((Math.hypot(x - BETH.x, z - BETH.z) - 14) / 16);
  const rim = smooth((Math.hypot(x, z + 35) - 62) / 25) * 12;
  return n * flatFire * onPath * nearB + rim * 0.5 + (Math.sin(x * 2.1 + n) * .02) * flatFire;
};
{ const g = new THREE.PlaneGeometry(300, 300, 240, 240); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, hgt(p.getX(i), p.getZ(i) - 45)); g.translate(0, 0, -45); g.computeVertexNormals();
  const t = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x35573f, roughness: 1, bumpMap: grassBump, bumpScale: 1.4 })); t.receiveShadow = true; scene.add(t); }
{ // grass tufts
  const N = 16000, geo = new THREE.ConeGeometry(.016, .26, 3), mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 1, color: 0xffffff }), N); const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  for (let i = 0; i < N; i++) { let x, z; do { x = (rnd() - .5) * 60; z = 14 - rnd() * 80; } while (Math.hypot(x, z) < 1.2); const s = .6 + rnd() * .9; e.set((rnd() - .5) * .35, rnd() * 6, (rnd() - .5) * .35); q.setFromEuler(e); m.compose(V(x, hgt(x, z) + .15 * s, z), q, V(s, s * (.8 + rnd() * .8), s)); mesh.setMatrixAt(i, m); mesh.setColorAt(i, c.setHSL(.3 + rnd() * .07, .38 + rnd() * .2, .2 + rnd() * .12)); }
  scene.add(mesh); }
// olive trees
const bark = new THREE.MeshStandardMaterial({ color: 0x3a2e26, roughness: 1 }), leaf = new THREE.MeshStandardMaterial({ color: 0x41594a, roughness: 1 });
for (let i = 0; i < 16; i++) { const side = i % 2 ? 1 : -1, x = side * (8 + rnd() * 16), z = 8 - rnd() * 70, g = new THREE.Group(); const t = new THREE.Mesh(new THREE.CylinderGeometry(.12, .22, 1.8, 7), bark); t.position.y = .9; t.castShadow = true; g.add(t);
  for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(.9 + rnd() * .5, 1), leaf); b.position.set((rnd() - .5) * 1.3, 2 + rnd() * .8, (rnd() - .5) * 1.3); b.scale.set(1.3, .75, 1.3); b.castShadow = true; g.add(b); }
  g.position.set(x, hgt(x, z), z); g.rotation.y = rnd() * 6; const s = .9 + rnd() * .8; g.scale.setScalar(s); scene.add(g); }

// ---------- light ----------
scene.add(new THREE.HemisphereLight(0x5b72c8, 0x1f2a22, 0.55));
const moon = new THREE.DirectionalLight(0xa9bbff, 1.0); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 50 }); moon.shadow.bias = -0.0004; scene.add(moon, moon.target);
const fire = new THREE.PointLight(0xff9a3c, 9, 16, 1.6); fire.position.set(0, .8, 0); scene.add(fire);
const angelLight = new THREE.DirectionalLight(0xffe3aa, 0); angelLight.position.set(1.5, 14, 2); scene.add(angelLight, angelLight.target); angelLight.target.position.set(0, 1, -1.3);

// ---------- campfire ----------
for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, .95, 6), new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 1 })); l.position.set(Math.cos(i) * .3, .13, Math.sin(i) * .3); l.rotation.set(Math.sin(i) * .9, 0, Math.cos(i) * .9); l.castShadow = true; scene.add(l); }
const flames = []; for (let i = 0; i < 22; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.6, .75, .25), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.userData = { ph: rnd() * 9, sp: .6 + rnd() * .8 }; scene.add(s); flames.push(s); }
const SPN = 80, spPos = new Float32Array(SPN * 3), spSeed = Array.from({ length: SPN }, () => ({ ph: rnd() * 9, sp: .3 + rnd() * .5, a: rnd() * 6.28 })); const spGeo = new THREE.BufferGeometry(); spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
scene.add(new THREE.Points(spGeo, new THREE.PointsMaterial({ map: glowTex, color: new THREE.Color(2, 1, .4), size: .09, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));

// ---------- sheep ----------
const woolM = new THREE.MeshStandardMaterial({ color: 0xf3ecdc, roughness: 1, emissive: 0x211a10 }), skinM = new THREE.MeshStandardMaterial({ color: 0x3b3430, roughness: .9 });
function makeSheep(lying) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  for (const [x, y, z, r] of [[0, .38, 0, .3], [.2, .4, .02, .24], [-.2, .4, 0, .25], [0, .52, .05, .24], [.12, .3, .16, .2], [-.14, .3, -.14, .2], [0, .3, -.18, .22]]) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), woolM); s.position.set(x, y, z); s.castShadow = true; body.add(s); }
  const head = new THREE.Group(); head.position.set(.42, .5, .02); const hm = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 10), skinM); hm.scale.set(1.2, 1, .9); head.add(hm);
  for (const sz of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), skinM); ear.scale.set(1.5, .5, 1); ear.position.set(-.05, .03, sz * .13); ear.rotation.x = sz * .5; head.add(ear); const eye = new THREE.Mesh(new THREE.SphereGeometry(.025, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); eye.position.set(.1, .04, sz * .07); head.add(eye); }
  head.rotation.z = lying ? -.2 : 0; body.add(head); g.userData.head = head; g.userData.body = body;
  if (!lying) for (const [x, z] of [[.2, .1], [.2, -.1], [-.2, .1], [-.2, -.1]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.035, .03, .32, 6), skinM); l.position.set(x, .16, z); body.add(l); }
  else body.position.y = -.08;
  return g;
}
const sheep = []; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283 + .3, r = 3.2 + rnd() * 3.4, s = makeSheep(i % 3 !== 0); s.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 0.5); s.position.y = hgt(s.position.x, s.position.z); s.rotation.y = rnd() * 6; s.scale.setScalar(.95 + rnd() * .3); s.userData.ph = rnd() * 9; scene.add(s); sheep.push(s); }

// ---------- Bethlehem + guiding star ----------
const mud = new THREE.MeshStandardMaterial({ color: 0x7a6650, roughness: 1 }), warmM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, .9, .38), toneMapped: false });
const village = new THREE.Group(); village.position.copy(BETH); scene.add(village);
const addHouse = (x, z, w, h, d, ry = 0) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mud); b.position.y = h / 2; g.add(b); const par = new THREE.Mesh(new THREE.BoxGeometry(w + .25, .22, d + .25), mud); par.position.y = h + .1; g.add(par);
  const arch = new THREE.Mesh(new THREE.CircleGeometry(.55, 20, 0, Math.PI), warmM); arch.position.set(0, 1.05, d / 2 + .02); g.add(arch); const low = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.05), warmM); low.position.set(0, .52, d / 2 + .02); g.add(low);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(.5, .6), warmM); win.position.set(w * .3, h * .62, d / 2 + .02); g.add(win); village.add(g); };
addHouse(0, 0, 5.4, 3, 4.2); addHouse(-7, 2.5, 4.2, 2.4, 3.4, .25); addHouse(7.2, 1.8, 3.8, 2.6, 3.2, -.3); addHouse(-12, -3, 3.4, 2, 3, .4); addHouse(12.5, -2.5, 3.6, 2.2, 3, -.5); addHouse(-4, 8, 3.5, 2.2, 3, .2); addHouse(4.5, 9, 3.2, 2.3, 3, -.2);
const bl = new THREE.PointLight(0xffa850, 30, 36, 1.4); bl.position.set(0, 2, 6); village.add(bl);
const gstar = new THREE.Group(); gstar.position.set(0, 30, -92); scene.add(gstar);
const gflare = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex, color: new THREE.Color(3, 2.6, 1.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false })); gstar.add(gflare);
const ghalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: new THREE.Color(1.5, 1.15, .65), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false })); gstar.add(ghalo);

// ---------- the angel's light ----------
const colMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { uA: { value: 0 }, uT: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `varying vec2 vUv; uniform float uA, uT;
    void main(){ float edge = 1.0 - abs(vUv.x*2.0-1.0); float streak = 0.65 + 0.35*sin(vUv.x*60.0 + uT*1.5)*sin(vUv.x*23.0 - uT*.9);
      float a = pow(edge,1.4) * streak * (0.2 + 0.8*vUv.y) * uA; gl_FragColor = vec4(vec3(1.0,0.84,0.52)*1.5, a*0.55); }` });
const column = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 7.5, 70, 48, 1, true), colMat); column.position.set(0, 35, -1.3); scene.add(column);
const glory = new THREE.Group(); glory.position.set(0, 32, -1.3); scene.add(glory);
const gloryFlare = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex, color: new THREE.Color(3, 2.5, 1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false })); gloryFlare.scale.setScalar(46); glory.add(gloryFlare);
const gloryHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: new THREE.Color(1.6, 1.2, .7), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false })); gloryHalo.scale.setScalar(64); glory.add(gloryHalo);
const SN = 360, sPos = new Float32Array(SN * 3), sSeed = Array.from({ length: SN }, () => ({ a: rnd() * 6.28, r: 1 + rnd() * 4.2, sp: .5 + rnd() * 1.6, ph: rnd() })); const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
const sparkles = new THREE.Points(sGeo, new THREE.PointsMaterial({ map: glowTex, color: new THREE.Color(2.2, 1.6, .7), size: .16, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); scene.add(sparkles);

// ---------- the boy ----------
const gltf = await new GLTFLoader().loadAsync('/models/shepherd-full.glb'); $('load').style.width = '100%';
const boy = new THREE.Group(); scene.add(boy); boy.add(gltf.scene);
{ const b = new THREE.Box3().setFromObject(gltf.scene), s = b.getSize(new THREE.Vector3()), k = 1.3 / s.y; gltf.scene.scale.setScalar(k); const b2 = new THREE.Box3().setFromObject(gltf.scene); gltf.scene.position.y -= b2.min.y; }
gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
const bones = {}; gltf.scene.traverse(o => { if (o.isBone) bones[o.name] = o; });
const rest = Object.fromEntries(Object.entries(bones).map(([n, b]) => [n, b.quaternion.clone()]));
const mixer = new THREE.AnimationMixer(gltf.scene); const clips = Object.fromEntries(gltf.animations.map(a => [a.name, a]));
const NAMES = ['Idle_02', '360_Power_Spin_Jump', 'Big_Wave_Hello', 'Running']; const act = {}; for (const n of NAMES) act[n] = mixer.clipAction(clips[n]);
for (const n of ['360_Power_Spin_Jump', 'Big_Wave_Hello']) { act[n].setLoop(THREE.LoopOnce); act[n].clampWhenFinished = true; }
const T_STAND = 8.0, T_IDLE = 9.9, T_JUMP = 26, T_WAVE = 29.1, T_RUN = 31.6, T_RUN_END = 45.6, END = 56, RUN_SPEED = 3.4;
const STATES = [{ t: 0, c: 'Idle_02' }, { t: T_JUMP, c: '360_Power_Spin_Jump' }, { t: T_WAVE, c: 'Big_Wave_Hello' }, { t: T_RUN, c: 'Running' }, { t: T_RUN_END, c: 'Idle_02' }];
let curState = -1;
const BOY0 = V(0, 0, -1.3);
const runD = T => RUN_SPEED * lerp(clamp(T - T_RUN, 0, T_RUN_END - T_RUN), smooth((T - T_RUN) / 1.6) * 1.6 + clamp(T - T_RUN - 1.6, 0, T_RUN_END - T_RUN), 1) ;
const boyPos = T => V(0, 0, BOY0.z - (T < T_RUN ? 0 : runD(Math.min(T, T_RUN_END))));
function setState(T, force) {
  let i = 0; for (let k = 0; k < STATES.length; k++) if (T >= STATES[k].t) i = k;
  if (i === curState && !force) return; const s = STATES[i], a = act[s.c];
  if (force) { for (const x of Object.values(act)) x.stop(); a.reset(); a.setEffectiveWeight(1); a.setEffectiveTimeScale(s.scrub ? 0 : 1); a.play(); a.time = s.scrub ? s.scrub(T) : Math.max(0, T - s.t) % a.getClip().duration; mixer.update(0); }
  else { for (const x of Object.values(act)) if (x !== a) x.fadeOut(0.4); a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.setEffectiveTimeScale(s.scrub ? 0 : 1); a.fadeIn(0.4).play(); }
  curState = i;
}
const E = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x * Math.PI / 180, y * Math.PI / 180, z * Math.PI / 180, 'XYZ'));
const blend = (n, e, w) => { if (w > 0.001 && bones[n]) bones[n].quaternion.slerp(rest[n].clone().multiply(e), w); };
function acting(T) {
  if (window.__noact) return;
  const warm = ramp(T, 0.3, 1.4) * (1 - ramp(T, 8.1, 8.7));
  blend('LeftArm', E(56, 0, 34), warm); blend('LeftForeArm', E(0, 0, 66), warm); blend('RightArm', E(56, 0, -34), warm); blend('RightForeArm', E(0, 0, -66), warm); blend('Head', E(9, -6, 0), warm * .8); blend('Spine', E(5, 0, 0), warm);
  const shield = ramp(T, 8.3, 8.9) * (1 - ramp(T, 15.4, 17.0));
  const wonder = ramp(T, 15.6, 17.6) * (1 - ramp(T, 25.3, 25.9));
  blend('LeftArm', E(-22, 0, 52), shield); blend('LeftForeArm', E(0, 0, 118), shield); blend('RightArm', E(-22, 0, -52), shield); blend('RightForeArm', E(0, 0, -118), shield);
  blend('Spine', E(-7, 0, 0), shield); blend('Head', E(8, 26, 0), shield);
  blend('LeftArm', E(66, 0, 16), wonder); blend('LeftForeArm', E(0, 0, 18), wonder); blend('RightArm', E(66, 0, -16), wonder); blend('RightForeArm', E(0, 0, -18), wonder);
  blend('Head', E(-30, 0, 0), wonder); blend('Neck', E(-10, 0, 0), wonder);
}

// ---------- directing ----------
const M = T => boyPos(T);
function camera_(T) {
  const m = M(T);
  if (T < 8)  { const u = smooth(T / 8); return [lerpV(V(4.6, 1.2, 3.4), V(3.2, 1.25, 2.9), u), V(0, .85, -.8), 38]; }
  if (T < 16) { const u = smooth((T - 8) / 8); return [lerpV(V(2.6, .9, 2.6), V(2.1, 1.05, 2.4), u), lerpV(V(-.2, 1.2, -1.3), V(-.2, 2.7, -1.4), u), 52]; }
  if (T < 26) { const u = (T - 16) / 10; return [lerpV(V(.9, 1.05, 1.3), V(.6, 1.1, .9), u), V(0, 1.0, -1.3), 34]; }
  if (T < T_RUN) { const u = smooth((T - 26) / 5.6); return [lerpV(V(-3.2, 1.2, 2.6), V(-2.4, 1.4, 2.2), u), V(0, 1.0, -1.3), 40]; }
  if (T < T_RUN_END + .4) { const u = (T - T_RUN) / 14; return [m.clone().add(lerpV(V(2.8, 1.3, 3.8), V(3.4, 1.6, 4.6), u)), m.clone().add(V(0, 1.0, -3.5)), 42]; }
  const u = smooth((T - 46) / 10); const mm = M(T_RUN_END); return [lerpV(mm.clone().add(V(3.4, 1.6, 4.6)), mm.clone().add(V(2.2, 1.6, 6.2)), u), lerpV(mm.clone().add(V(0, 1, -4)), V(.6, 6.5, -80), u), lerp(42, 52, u)];
}
const CUTS = [8, 16, 26, T_RUN, 46];
const SUBS = [[2.5, 7.5, 'В той стране были на поле пастухи, которые содержали ночную стражу у стада своего.'], [9.2, 15.4, 'Вдруг предстал им Ангел Господень, и слава Господня осияла их; и убоялись страхом великим.'],
  [17.2, 25, 'И сказал им Ангел: не бойтесь; я возвещаю вам великую радость, которая будет всем людям.'], [29.2, 34.5, 'Пойдём в Вифлеем и посмотрим, что там случилось.'], [47, 51, 'Лк 2:8–15']];
const controls = new OrbitControls(camera, canvas); controls.enabled = false; Object.assign(controls, { enableDamping: true, maxPolarAngle: Math.PI * .52, minDistance: 2, maxDistance: 40 });
const mk = (f, loop = true) => Object.assign(new Audio(f), { loop, volume: 0 });
const audio = { crackle: mk('/audio/fire-crackle.mp3'), wild: mk('/audio/theme-wilderness.mp3'), sheep: mk('/audio/sheep-flock.mp3'), glory: mk('/audio/theme-glory.mp3'), joy: mk('/audio/theme-joy.mp3'), nat: mk('/audio/theme-nativity.mp3'), shimmer: Object.assign(new Audio('/audio/angel-shimmer.mp3'), { volume: .9 }) };
const vol = (a, v) => { a.volume = clamp(v); };
let T = 0, playing = false, forcedT = null, lastT = -1, shimmerDone = false, ending = false, lastFrame = performance.now();
const fadeEl = $('fade'), subEl = $('sub');

function direct(T) {
  setState(T, Math.abs(T - lastT) > 0.7);
  const dt = Math.max(0, T - lastT); const st = STATES[curState];
  boy.position.copy(M(T)); boy.rotation.y = Math.PI * smooth((T - 29.3) / 1.4);
  if (st.scrub) act[st.c].time = st.scrub(T);
  mixer.update(lastT < 0 || Math.abs(T - lastT) > .7 ? 0 : dt); acting(T);
  // angel light: opens at 8, stays through the joy, then fades as the shepherds go
  const ang = ramp(T, 8.0, 9.2) * (1 - ramp(T, 30, 35)); const glow = ramp(T, 8, 10) * (1 - ramp(T, 30, 36));
  colMat.uniforms.uA.value = ang; colMat.uniforms.uT.value = T; column.visible = ang > .01;
  gloryFlare.material.opacity = ang; gloryHalo.material.opacity = ang * .35; gloryFlare.scale.setScalar(46 + Math.sin(T * 2) * 2); sparkles.material.opacity = ang;
  angelLight.intensity = ang * 1.7; skyMat.uniforms.uAngel.value = ang * .8; bloom.strength = 0.65 + ang * .22 + ramp(T, 36, 50) * .2;
  fire.intensity = (9 + Math.sin(T * 17) * 1.2 + Math.sin(T * 7.3) * 1.4) * (1 - ang * .2);
  moon.position.copy(M(T)).add(V(-9, 12, 8)); moon.target.position.copy(M(T));
  // guiding star over Bethlehem rises as the shepherds leave
  const gs = ramp(T, 27, 33); const cam = camera.position, dG = cam.distanceTo(gstar.position);
  gflare.material.opacity = gs; gflare.scale.setScalar(dG * .3 * (.7 + gs * .3)); ghalo.material.opacity = gs * .65; ghalo.scale.setScalar(dG * .55);
  skyMat.uniforms.uGlow.value = ramp(T, 30, 44); bl.intensity = 28 + Math.sin(T * 8) * 2;
  const [cp, ct, fov] = controls.enabled ? [null, null, null] : camera_(T);
  if (cp) { camera.position.copy(cp); camera.lookAt(ct); if (Math.abs(camera.fov - fov) > .01) { camera.fov = fov; camera.updateProjectionMatrix(); } }
  // fire flames + sparks
  flames.forEach(s => { const u = s.userData, k = ((T * u.sp + u.ph) % 1); s.position.set(Math.sin(u.ph + T * 2) * .12 * (1 - k), .3 + k * 1.1, Math.cos(u.ph * 2 + T * 2) * .12 * (1 - k)); s.scale.setScalar((.6 - k * .5) * 1.15); s.material.opacity = 1 - k; });
  spSeed.forEach((s, i) => { const k = ((T * s.sp + s.ph) % 1); spPos[i*3] = Math.cos(s.a + T) * .25 * k + Math.sin(T * s.sp * 3 + s.ph) * .15; spPos[i*3+1] = .5 + k * 2.6; spPos[i*3+2] = Math.sin(s.a + T) * .25 * k; }); spGeo.attributes.position.needsUpdate = true;
  // light motes rising in the angel's column
  sSeed.forEach((s, i) => { const k = ((T * .08 * s.sp + s.ph) % 1); sPos[i*3] = Math.cos(s.a + T * .2) * s.r * (.6 + k * .5); sPos[i*3+1] = 1 + k * 32; sPos[i*3+2] = -1.3 + Math.sin(s.a + T * .2) * s.r * (.6 + k * .5); }); sGeo.attributes.position.needsUpdate = true;
  // sheep: breathing; when the light comes they lift their heads, and some bounce
  sheep.forEach((s, i) => { const b = s.userData.body, h = s.userData.head, up = ramp(T, 8.2, 9) * (1 - ramp(T, 34, 38)); b.scale.y = 1 + Math.sin(T * 1.6 + s.userData.ph) * .02; h.rotation.z = lerp(i % 3 ? -.2 : 0.05, .45, up); h.rotation.y = Math.sin(T * .8 + s.userData.ph) * .25 * up; s.position.y += 0; });
  // sound
  if (playing) { vol(audio.crackle, .42 * (1 - ramp(T, 33, 37))); vol(audio.wild, .5 * (1 - ramp(T, 7.5, 11))); vol(audio.sheep, .35 * (1 - ramp(T, 8, 14)));
    vol(audio.glory, ramp(T, 8.4, 11) * (1 - ramp(T, 29, 33)) * .85); vol(audio.joy, ramp(T, 29, 32) * (1 - ramp(T, 46, 50)) * .75); vol(audio.nat, ramp(T, 45, 49) * .85);
    if (!shimmerDone && T > 8.1) { shimmerDone = true; audio.shimmer.currentTime = 0; audio.shimmer.play().catch(() => {}); } }
  let dip = 0; for (const c0 of CUTS) { const d = Math.abs(T - c0); if (d < .3) dip = Math.max(dip, 1 - d / .3); } fadeEl.style.opacity = (T < .8 ? 1 - T / .8 : dip) * (T < END + 4 ? 1 : 0);
  const sub = SUBS.find(s => T >= s[0] && T < s[1]); subEl.textContent = sub ? sub[2] : ''; subEl.classList.toggle('on', !!sub);
  $('title').classList.toggle('on', T > 51);
  lastT = T;
}
function frame(now) {
  const dtR = Math.min(0.05, (now - lastFrame) / 1000); lastFrame = now;
  if (forcedT != null) T = forcedT; else if (playing && !ending) { T += dtR; if (T >= END) { ending = true; controls.enabled = true; controls.target.set(0, 4, -50); $('again').style.display = 'block'; } }
  direct(Math.min(T, END)); if (controls.enabled) controls.update();
  composer.render(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
$('go').addEventListener('click', () => { $('start').remove(); playing = true; T = 0; for (const a of Object.values(audio)) if (a !== audio.shimmer) a.play().catch(() => {}); });
$('again').addEventListener('click', () => { $('again').style.display = 'none'; controls.enabled = false; ending = false; T = 0; lastT = -1; shimmerDone = false; });
window.__m = { act, mixer, bones, seek: t => { forcedT = t; }, free: () => { forcedT = null; }, THREE, scene };
