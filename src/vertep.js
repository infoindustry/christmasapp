// Living nativity night: the user's own Meshy characters, posed and moved by code + their baked clips.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0d2e); scene.fog = new THREE.FogExp2(0x0a0d2e, 0.045);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80); camera.position.set(0.5, 1.7, 6.2);
const controls = new OrbitControls(camera, canvas);
Object.assign(controls, { target: new THREE.Vector3(0, 1.3, 0), enableDamping: true, minDistance: 3, maxDistance: 9, maxPolarAngle: Math.PI * 0.52, autoRotate: true, autoRotateSpeed: 0.5, enablePan: false });
const fit = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }; fit(); addEventListener('resize', fit);

// ---- sky: gradient dome + stars ----
const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'varying vec3 p; void main(){ float h = clamp(p.y/60.0*1.4+0.12, 0.0, 1.0); vec3 low = vec3(0.30,0.20,0.45), mid = vec3(0.08,0.10,0.32), top = vec3(0.02,0.03,0.12); vec3 c = mix(low, mid, smoothstep(0.0,0.35,h)); c = mix(c, top, smoothstep(0.3,1.0,h)); gl_FragColor = vec4(c,1.0); }' }));
scene.add(sky);
const sp = new Float32Array(900 * 3); for (let i = 0; i < 900; i++) { const a = Math.random() * 6.283, e = Math.random() * 1.25 + 0.08, r = 55; sp[i*3] = Math.cos(a) * Math.cos(e) * r; sp[i*3+1] = Math.sin(e) * r; sp[i*3+2] = Math.sin(a) * Math.cos(e) * r; }
const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), r = g.createRadialGradient(64,64,0,64,64,64); r.addColorStop(0,'rgba(255,255,255,1)'); r.addColorStop(.25,'rgba(255,235,170,.7)'); r.addColorStop(1,'rgba(255,200,100,0)'); g.fillStyle = r; g.fillRect(0,0,128,128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ map: glowTex, size: 0.9, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, sizeAttenuation: false, opacity: .9 })));

// ---- Star of Bethlehem ----
const star = new THREE.Group(); star.position.set(-2, 7.5, -9); scene.add(star);
const starSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffe9a8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); starSprite.scale.setScalar(7); star.add(starSprite);
const shape = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.28 : 0.75, a = Math.PI / 2 + i * Math.PI / 5; i ? shape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : shape.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
const starMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05 }), new THREE.MeshBasicMaterial({ color: 0xfff0b8, fog: false })); starMesh.position.z = -0.1; star.add(starMesh);
const rays = new THREE.Mesh(new THREE.ConeGeometry(2.2, 16, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
rays.position.set(0, -8, 0); star.add(rays);

// ---- ground + hills ----
const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x1f3a3a, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283 + 0.3, r = 17 + Math.random() * 6; const h = new THREE.Mesh(new THREE.SphereGeometry(5 + Math.random() * 4, 24, 12, 0, 6.283, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.55 + Math.random() * .05, .35, .13), roughness: 1 })); h.position.set(Math.cos(a) * r, -1, Math.sin(a) * r); h.scale.y = .5 + Math.random() * .3; scene.add(h); }

// ---- light: moon + campfire ----
scene.add(new THREE.HemisphereLight(0x6f7bd8, 0x241a33, 0.55));
const moon = new THREE.DirectionalLight(0xb9c8ff, 1.1); moon.position.set(-5, 9, 5); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 }); scene.add(moon);
const fire = new THREE.PointLight(0xff9a3c, 14, 12, 1.6); fire.position.set(0, 0.7, 0.2); fire.castShadow = false; scene.add(fire);
const flames = []; for (let i = 0; i < 18; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff8a2a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.userData = { ph: Math.random() * 9, sp: .6 + Math.random() * .8 }; scene.add(s); flames.push(s); }
for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, .9, 6), new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 1 })); l.position.set(Math.cos(i) * .28, .12, Math.sin(i) * .28); l.rotation.set(Math.sin(i) * .9, 0, Math.cos(i) * .9); l.castShadow = true; scene.add(l); }
const flies = new Float32Array(120 * 3), fSeed = Array.from({ length: 120 }, () => ({ a: Math.random() * 6.28, r: 1.5 + Math.random() * 6, y: .3 + Math.random() * 3, s: .1 + Math.random() * .3 }));
const fGeo = new THREE.BufferGeometry(); fGeo.setAttribute('position', new THREE.BufferAttribute(flies, 3));
scene.add(new THREE.Points(fGeo, new THREE.PointsMaterial({ map: glowTex, color: 0xffe08a, size: .16, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .9 })));

// ---- cast ----
const loader = new GLTFLoader(); const loadEl = document.getElementById('load'); let loaded = 0; const TOTAL = 5;
const cast = [];
const norm = (g, h) => { const b = new THREE.Box3().setFromObject(g), s = b.getSize(new THREE.Vector3()); const k = h / s.y; g.scale.setScalar(k); const b2 = new THREE.Box3().setFromObject(g); g.position.y -= b2.min.y; };
async function addActor({ file, name, h, pos, look = [0, 0, 0], idle, action, loopAll }) {
  const g = await loader.loadAsync(`/models/${file}`); loadEl.style.width = (++loaded / TOTAL * 100) + '%';
  const root = new THREE.Group(); root.add(g.scene); norm(g.scene, h); root.position.set(...pos); root.lookAt(new THREE.Vector3(...look).setY(pos[1])); scene.add(root);
  g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  const mixer = new THREE.AnimationMixer(g.scene); const clip = rx => g.animations.find(a => rx.test(a.name));
  const a = { name, root, mixer, g, cur: null, busy: 0, clip };
  a.play = (rx, once, fade = 0.3) => { const c = clip(rx); if (!c) return 0; const act = mixer.clipAction(c); act.reset(); act.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat); act.clampWhenFinished = true; act.fadeIn(fade).play(); if (a.cur && a.cur !== act) a.cur.fadeOut(fade); a.cur = act; return c.duration; };
  a.idle = () => a.play(idle || /Idle/); a.act = () => { const d = a.play(action, true); a.busy = d; return d; };
  if (loopAll || idle !== null) a.idle();
  cast.push(a); return a;
}
const ginger = await addActor({ file: 'gingerbread.glb', name: 'Пряничек', h: 0.85, pos: [1.1, 0, 1.4], look: [0, 0, 3], action: /Backflip/ });
const shepherd = await addActor({ file: 'shepherd.glb', name: 'Пастух', h: 1.25, pos: [-1.7, 0, 0.9], look: [0, 0, 0.2], action: /Big_Wave|Wave/ });
const wise = await addActor({ file: 'wiseman-full.glb', name: 'Волхв', h: 1.85, pos: [2.2, 0, -0.3], look: [0.5, 1.2, 3], action: /Formal_Bow/ });
const gabriel = await addActor({ file: 'gabriel-talk.glb', name: 'Гавриил', h: 2.3, pos: [-0.3, 0.9, -2.6], look: [0, 1.2, 3], idle: /./, action: /./, loopAll: true });
// camel diorama: static model, animated as a rigid body
const camelG = await loader.loadAsync('/models/camel-a.glb'); loadEl.style.width = (++loaded / TOTAL * 100) + '%';
const camel = new THREE.Group(); camel.add(camelG.scene); camelG.scene.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; } });
{ const b = new THREE.Box3().setFromObject(camelG.scene), s = b.getSize(new THREE.Vector3()); const k = 2.4 / Math.max(s.x, s.z); camelG.scene.scale.setScalar(k); const b2 = new THREE.Box3().setFromObject(camelG.scene); camelG.scene.position.y -= b2.min.y; }
camel.position.set(-3.4, 0, -2.2); camel.rotation.y = 0.6; scene.add(camel); const camelA = { name: 'Верблюд', root: camel, g: camelG, rigid: true, t: 0 }; cast.push(camelA);
gabriel.root.position.y = 0.9;

// ---- interaction ----
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let down = null;
canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return; down = null;
  ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ptr, camera);
  let best = null, bd = 1e9; for (const a of cast) { const h = ray.intersectObject(a.root, true)[0]; if (h && h.distance < bd) { bd = h.distance; best = a; } }
  if (best) trigger(best);
});
function trigger(a) {
  if (a.rigid) { a.t = 1.2; return; }
  if (a === gabriel) { burst = 1; return; }
  if (a.busy > 0) return; const d = a.act(); if (d) setTimeout(() => a.idle(), d * 1000 - 200);
  if (a === wise) { /* alternate bow styles */ a.alt = !a.alt; }
}
let burst = 0;
// the scene stays alive by itself: someone does something every few seconds
let auto = 2; const order = [shepherd, ginger, wise, camelA, gabriel];

// ---- loop ----
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  for (const a of cast) { a.mixer?.update(dt); if (a.busy > 0) a.busy -= dt; }
  gabriel.root.position.y = 0.9 + Math.sin(t * 1.2) * 0.12; gabriel.root.rotation.z = Math.sin(t * 0.8) * 0.03;
  if (camelA.t > 0) { camelA.t -= dt; const k = Math.sin((1.2 - camelA.t) * 9) * 0.08 * Math.min(1, camelA.t * 2); camelA.root.position.y = Math.abs(k) * 1.2; camelA.root.rotation.z = k * 0.6; } else { camelA.root.position.y = 0; camelA.root.rotation.z = Math.sin(t * 0.9) * 0.008; }
  burst = Math.max(0, burst - dt * 0.7); const gl = 1 + burst * 3;
  starSprite.material.opacity = 0.8 + Math.sin(t * 2) * 0.15; starSprite.scale.setScalar(7 + Math.sin(t * 1.6) * .5); star.rotation.y = t * 0.4; rays.material.opacity = 0.06 + Math.sin(t * 1.4) * 0.02;
  fire.intensity = (13 + Math.sin(t * 17) * 2 + Math.sin(t * 7.3) * 2.5) * (1 + burst * 0.0); moon.intensity = 1.1 + burst * 1.6 * gl * 0.2;
  flames.forEach((s, i) => { const u = s.userData, k = ((t * u.sp + u.ph) % 1); s.position.set(Math.sin(u.ph + t * 2) * 0.12 * (1 - k), 0.35 + k * 1.1, Math.cos(u.ph * 2 + t * 2) * 0.12 * (1 - k)); s.scale.setScalar((0.55 - k * 0.45) * 1.1); s.material.opacity = 1 - k; });
  for (let i = 0; i < 120; i++) { const f = fSeed[i], a = f.a + t * f.s * 0.3; flies[i*3] = Math.cos(a) * f.r; flies[i*3+1] = f.y + Math.sin(t * f.s * 3 + i) * .4; flies[i*3+2] = Math.sin(a) * f.r; } fGeo.attributes.position.needsUpdate = true;
  if (started) { auto -= dt; if (auto <= 0) { auto = 4.5 + Math.random() * 3; const a = order[Math.floor(Math.random() * order.length)]; trigger(a); } }
  controls.update(); renderer.render(scene, camera);
});

// ---- sound + start ----
let started = false; const music = Object.assign(new Audio('/models/theme-hope.mp3'), { loop: true, volume: 0.4 }), crackle = Object.assign(new Audio('/models/crackle.mp3'), { loop: true, volume: 0.35 });
document.getElementById('go').addEventListener('click', () => { document.getElementById('start').remove(); started = true; music.play().catch(() => {}); crackle.play().catch(() => {}); document.getElementById('hint').classList.add('on'); setTimeout(() => document.getElementById('hint').classList.remove('on'), 8000); });
window.__v = { cast, camera, controls, trigger };
