// "Pryanichek" — a cozy Christmas short. The user's gingerbread man, choreographed by code.
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
let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------- renderer / post ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b0807); scene.fog = new THREE.FogExp2(0x120c0a, 0.075);
const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 60);
const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.5, 0.6, 1.05); composer.addPass(bloom); composer.addPass(new OutputPass());
const fit = () => { renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
fit(); addEventListener('resize', fit);

// ---------- textures ----------
const canvasTex = (w, h, draw, srgb = true, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(...rep); t.anisotropy = 8; return t; };
const glowTex = canvasTex(128, 128, (g, w) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,236,190,.6)'); r.addColorStop(1, 'rgba(255,200,110,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
const flareTex = canvasTex(512, 512, g => { const c = 256; const r = g.createRadialGradient(c, c, 0, c, c, 70); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.4, 'rgba(255,235,170,.55)'); r.addColorStop(1, 'rgba(255,210,120,0)'); g.fillStyle = r; g.fillRect(0, 0, 512, 512);
  for (const [dx, dy, len] of [[1, 0, 250], [0, 1, 250], [.7, .7, 110], [.7, -.7, 110]]) { const gr = g.createLinearGradient(c - dx * len, c - dy * len, c + dx * len, c + dy * len); gr.addColorStop(0, 'rgba(255,230,160,0)'); gr.addColorStop(.5, 'rgba(255,248,225,.95)'); gr.addColorStop(1, 'rgba(255,230,160,0)'); g.strokeStyle = gr; g.lineWidth = dx && dy ? 2 : 3; g.beginPath(); g.moveTo(c - dx * len, c - dy * len); g.lineTo(c + dx * len, c + dy * len); g.stroke(); } });
const gingham = canvasTex(256, 256, (g, w) => { g.fillStyle = '#f3ece0'; g.fillRect(0, 0, w, w); g.fillStyle = 'rgba(190,40,48,.62)'; for (let i = 0; i < 4; i++) { g.fillRect(i * 64, 0, 32, w); g.fillRect(0, i * 64, w, 32); } const id = g.getImageData(0, 0, w, w); for (let i = 0; i < id.data.length; i += 4) { const n = (Math.random() - .5) * 16; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; } g.putImageData(id, 0, 0); }, true, [5, 3.5]);
const wood = canvasTex(256, 256, (g, w) => { g.fillStyle = '#4a2f1c'; g.fillRect(0, 0, w, w); for (let i = 0; i < 8; i++) { g.fillStyle = `rgba(${20 + rnd() * 30},${10 + rnd() * 15},5,.5)`; g.fillRect(0, i * 32, w, 2); for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(255,220,170,${.03 + rnd() * .05})`; g.fillRect(rnd() * w, i * 32 + rnd() * 30, 20 + rnd() * 90, 1); } } }, true, [6, 6]);
const wall = canvasTex(256, 256, (g, w) => { g.fillStyle = '#1f3a37'; g.fillRect(0, 0, w, w); for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(i * 32, 0, 14, w); } g.fillStyle = 'rgba(214,170,90,.08)'; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.beginPath(); g.arc(x * 32 + (y % 2) * 16, y * 32 + 16, 3, 0, 6.3); g.fill(); } }, true, [5, 3]);
const nightWin = canvasTex(512, 640, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#060a24'); gr.addColorStop(.55, '#1a2150'); gr.addColorStop(1, '#3a3a6e'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,245,210,${.3 + rnd() * .6})`; g.beginPath(); g.arc(rnd() * w, rnd() * h * .6, .6 + rnd() * 1.4, 0, 6.3); g.fill(); }
  g.fillStyle = '#0c1130'; g.beginPath(); g.moveTo(0, h * .72); for (let x = 0; x <= w; x += 32) g.lineTo(x, h * .7 + Math.sin(x * .02) * 18); g.lineTo(w, h); g.lineTo(0, h); g.fill();
  g.fillStyle = '#1b2250'; for (let i = 0; i < 9; i++) { const x = 30 + i * 52 + rnd() * 20, y = h * .74 + rnd() * 30, ww = 34 + rnd() * 20, hh = 26 + rnd() * 18; g.fillRect(x, y, ww, hh); g.fillStyle = '#ffc96a'; g.fillRect(x + 8, y + 8, 7, 9); g.fillStyle = '#1b2250'; }
  g.fillStyle = '#f4f7ff'; g.fillRect(0, h * .86, w, h * .14); });

// ---------- room ----------
const FLOOR_Y = -0.85;
const M_ = (o = {}) => new THREE.MeshStandardMaterial({ roughness: 1, ...o });
const add = (geo, mat, x, y, z, cast = true, recv = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = recv; scene.add(m); return m; };
add(new THREE.PlaneGeometry(14, 14), M_({ map: wood, color: 0xb59a80 }), 0, FLOOR_Y, -1, false, true).rotation.x = -Math.PI / 2;
add(new THREE.PlaneGeometry(14, 5), M_({ map: wall }), 0, FLOOR_Y + 2.5, -4.7, false, true);
add(new THREE.PlaneGeometry(14, 5), M_({ map: wall }), -6, FLOOR_Y + 2.5, -1).rotation.y = Math.PI / 2;
add(new THREE.PlaneGeometry(14, 5), M_({ map: wall }), 6, FLOOR_Y + 2.5, -1).rotation.y = -Math.PI / 2;
// table
const tableTop = add(new THREE.BoxGeometry(4.2, .09, 3.4), M_({ color: 0x5a3820, map: wood }), 0, -0.045, 0.2);
const cloth = add(new THREE.PlaneGeometry(3.9, 3.0), M_({ map: gingham }), 0, .002, .2, false, true); cloth.rotation.x = -Math.PI / 2;
for (const [x, z] of [[-1.9, -1.3], [1.9, -1.3], [-1.9, 1.6], [1.9, 1.6]]) add(new THREE.CylinderGeometry(.09, .07, .76, 10), M_({ color: 0x3b2414 }), x, -.47, z);
// plate with cookies
const plate = add(new THREE.CylinderGeometry(.46, .38, .035, 40), M_({ color: 0xf3efe8, roughness: .35 }), -.62, .02, -.2);
const starShape = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? .07 : .16, a = Math.PI / 2 + i * Math.PI / 5; i ? starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
const heartShape = new THREE.Shape(); heartShape.moveTo(0, -.12); heartShape.bezierCurveTo(-.2, .02, -.12, .18, 0, .07); heartShape.bezierCurveTo(.12, .18, .2, .02, 0, -.12);
const cookieM = M_({ color: 0xb87b3c, roughness: .85 });
[[-.7, -.12, starShape, .4], [-.52, -.3, heartShape, -.3], [-.74, -.3, starShape, 1.1], [-.5, -.08, starShape, 2], [-.62, -.2, heartShape, .9]].forEach(([x, z, sh, r], i) => { const c = add(new THREE.ExtrudeGeometry(sh, { depth: .035, bevelEnabled: true, bevelSize: .008, bevelThickness: .008, bevelSegments: 2 }), cookieM, x + (i % 2) * .02, .045 + i * .035, z); c.rotation.x = -Math.PI / 2; c.rotation.z = r; });
// candle
const candle = add(new THREE.CylinderGeometry(.055, .06, .36, 20), M_({ color: 0xf2e7cf, roughness: .6, emissive: 0x4a3a20 }), .78, .18, -.45);
const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2.2, 1.3, .5), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); flame.scale.set(.1, .17, 1); flame.position.set(.78, .5, -.45); scene.add(flame);
const candleLight = new THREE.PointLight(0xffa860, 4.2, 9, 1.7); candleLight.position.set(.78, .52, -.45); scene.add(candleLight);
// tangerines, presents on the table, pine branch
for (const [x, z] of [[1.15, .45], [1.3, .25], [1.05, .22]]) add(new THREE.SphereGeometry(.065, 16, 12), M_({ color: 0xe8741c, roughness: .6, emissive: 0x4a2000 }), x, .065, z);
const present = (x, z, w, h, d, col, rib, ry = 0) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M_({ color: col, roughness: .5 })); b.position.y = h / 2; b.castShadow = true; g.add(b); const rm = M_({ color: rib, roughness: .4 }); const r1 = new THREE.Mesh(new THREE.BoxGeometry(w + .004, h + .004, d * .16), rm); r1.position.y = h / 2; const r2 = new THREE.Mesh(new THREE.BoxGeometry(w * .16, h + .006, d + .004), rm); r2.position.y = h / 2; g.add(r1, r2); scene.add(g); return g; };
present(-1.65, -.95, .32, .24, .26, 0xb02334, 0xe9d28b, .4); present(-1.35, -1.25, .22, .18, .22, 0x1f6b4a, 0xd9392b, -.5); present(1.75, -1.1, .3, .26, .3, 0x2b4fa0, 0xf2e1a0, .2);
for (let i = 0; i < 9; i++) { const a = -.7 + i * .17; const b = new THREE.Mesh(new THREE.ConeGeometry(.07, .6, 5), M_({ color: 0x1d4a2e })); b.position.set(1.25 + Math.cos(a) * .0 - i * .03, .05, -.95 + i * .0); b.rotation.set(Math.PI / 2, 0, a); scene.add(b); b.position.set(1.5 - i * .05, .04, -.9 - i * .04); b.rotation.set(-Math.PI / 2 + .1, 0, a * 1.3 + 1.2); }
// ---------- tree ----------
const tree = new THREE.Group(); tree.position.set(.6, FLOOR_Y, -3.7); scene.add(tree);
const treeM = M_({ color: 0x1b4a2c });
[[1.7, 1.2, .5], [1.4, 1.1, 1.25], [1.1, 1.0, 1.95], [.8, .9, 2.55], [.5, .8, 3.05]].forEach(([r, h, y]) => { const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 28), treeM); c.position.y = y; c.castShadow = true; tree.add(c); });
{ const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.14, .18, .6, 10), M_({ color: 0x3b2414 })); trunk.position.set(0, .25, 0); tree.add(trunk); }
const topStar = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex, color: new THREE.Color(3, 2.5, 1.5), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); topStar.scale.setScalar(.9); topStar.position.y = 3.6; tree.add(topStar);
const treeLights = []; const LC = [[3, .4, .3], [.4, 2.2, .5], [.5, .9, 3], [3, 2.2, .4], [2.6, 1.3, .3]];
for (let i = 0; i < 90; i++) { const y = .6 + rnd() * 2.7, rmax = lerp(1.65, .12, (y - .5) / 2.9), a = rnd() * 6.283, r = rmax * (.55 + rnd() * .45); const col = LC[i % LC.length];
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(...col), toneMapped: false })); bulb.position.set(Math.cos(a) * r, y, Math.sin(a) * r); tree.add(bulb);
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(col[0] * .7, col[1] * .7, col[2] * .7), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); gl.scale.setScalar(.34); gl.position.copy(bulb.position); tree.add(gl); treeLights.push({ gl, ph: rnd() * 9, sp: .6 + rnd() * 1.4 }); }
const treePL = new THREE.PointLight(0xffc890, 5, 8, 1.6); treePL.position.set(.6, 1.0, -2.6); scene.add(treePL);
[[-.9, .4, .45, .35, .4, 0x1f6b4a], [.8, -.2, .55, .4, .5, 0xb02334], [1.55, .5, .4, .3, .35, 0x2b4fa0], [-.3, .9, .35, .28, .3, 0xc7922c]].forEach(([x, z, w, h, d, c], i) => { const g = new THREE.Group(); g.position.set(tree.position.x + x, FLOOR_Y, tree.position.z + z + .4); const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M_({ color: c, roughness: .5 })); b.position.y = h / 2; g.add(b); const rm = M_({ color: 0xf0e3a8 }); const r1 = new THREE.Mesh(new THREE.BoxGeometry(w + .004, h + .004, d * .15), rm), r2 = new THREE.Mesh(new THREE.BoxGeometry(w * .15, h + .006, d + .004), rm); r1.position.y = r2.position.y = h / 2; g.add(r1, r2); scene.add(g); });
// ---------- fireplace ----------
const fp = new THREE.Group(); fp.position.set(-3.1, FLOOR_Y, -4.2); scene.add(fp);
const brick = canvasTex(256, 256, (g, w) => { g.fillStyle = '#5a463c'; g.fillRect(0, 0, w, w); for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) { const ox = (y % 2) * 32; g.fillStyle = `rgb(${110 + rnd() * 50},${60 + rnd() * 30},${48 + rnd() * 24})`; g.fillRect(x * 64 + ox + 2, y * 32 + 2, 60, 28); } }, true, [2, 2]);
const stone = M_({ map: brick, color: 0xcab8aa });
for (const [w, h, d, x, y] of [[.5, 1.7, .7, -.85, .85], [.5, 1.7, .7, .85, .85], [2.2, .35, .75, 0, 1.75], [2.4, .12, .95, 0, 1.98]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stone); b.position.set(x, y, 0); b.castShadow = b.receiveShadow = true; fp.add(b); }
const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.55), new THREE.MeshBasicMaterial({ color: new THREE.Color(.5, .2, .05) })); hole.position.set(0, .78, -.3); fp.add(hole);
const fFlames = []; for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2.2, 1, .3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.userData = { ph: rnd() * 9, sp: .5 + rnd() * .6, x: (rnd() - .5) * .8 }; fp.add(s); fFlames.push(s); }
const fireL = new THREE.PointLight(0xff8a30, 10, 10, 1.5); fireL.position.set(-3.1, FLOOR_Y + .7, -3.4); scene.add(fireL);
for (let i = 0; i < 3; i++) { const sk = new THREE.Mesh(new THREE.BoxGeometry(.22, .5, .12), M_({ color: i % 2 ? 0x2f7a52 : 0xb02334 })); sk.position.set(-.7 + i * .7, 1.7, .2); sk.rotation.z = (i - 1) * .08; fp.add(sk); const cuff = new THREE.Mesh(new THREE.BoxGeometry(.24, .1, .14), M_({ color: 0xf3ece0 })); cuff.position.set(sk.position.x, sk.position.y + .24, .2); fp.add(cuff); }
// garland on the back wall
{ const curve = new THREE.CatmullRomCurve3([V(-5, 2.6, -4.65), V(-2.5, 2.15, -4.65), V(0, 2.55, -4.65), V(2.5, 2.1, -4.65), V(5, 2.6, -4.65)]); for (let i = 0; i < 46; i++) { const p = curve.getPoint(i / 45); const col = LC[i % LC.length]; const b = new THREE.Mesh(new THREE.SphereGeometry(.04, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(...col), toneMapped: false })); b.position.copy(p); scene.add(b); const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(col[0] * .6, col[1] * .6, col[2] * .6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); gl.scale.setScalar(.3); gl.position.copy(p); scene.add(gl); treeLights.push({ gl, ph: rnd() * 9, sp: .5 + rnd() * 1.2 }); } }
// window with the night + Star
const WX = 3.2, WY = FLOOR_Y + 1.9;
add(new THREE.PlaneGeometry(1.5, 1.9), new THREE.MeshBasicMaterial({ map: nightWin, color: new THREE.Color(1.25, 1.25, 1.35) }), WX, WY, -4.66, false, false);
const frameM = M_({ color: 0xe8dfd0, roughness: .6 });
for (const [w, h, x, y] of [[1.7, .1, 0, .98], [1.7, .1, 0, -.98], [.1, 2.06, -.8, 0], [.1, 2.06, .8, 0], [.06, 1.9, 0, 0], [1.5, .06, 0, 0]]) add(new THREE.BoxGeometry(w, h, .1), frameM, WX + x, WY + y, -4.62, true, false);
const winStar = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex, color: new THREE.Color(3, 2.6, 1.7), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); winStar.scale.setScalar(.75); winStar.position.set(WX - .2, WY + .65, -4.6); scene.add(winStar);
const SNN = 140, sn = new Float32Array(SNN * 3), snSeed = Array.from({ length: SNN }, () => ({ x: rnd(), y: rnd(), s: .05 + rnd() * .12, p: rnd() * 9 })); const snG = new THREE.BufferGeometry(); snG.setAttribute('position', new THREE.BufferAttribute(sn, 3));
scene.add(new THREE.Points(snG, new THREE.PointsMaterial({ map: glowTex, color: 0xffffff, size: .035, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .9 })));
// dust motes in the candle light
const DN = 120, dp = new Float32Array(DN * 3), dS = Array.from({ length: DN }, () => ({ x: (rnd() - .5) * 3, y: rnd() * 1.8, z: (rnd() - .5) * 3, s: .1 + rnd() * .3, p: rnd() * 9 })); const dG = new THREE.BufferGeometry(); dG.setAttribute('position', new THREE.BufferAttribute(dp, 3));
scene.add(new THREE.Points(dG, new THREE.PointsMaterial({ map: glowTex, color: 0xffe2b0, size: .02, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .6 })));

// ---------- light ----------
scene.add(new THREE.HemisphereLight(0x6a5a7a, 0x2a1a10, .35));
const key = new THREE.DirectionalLight(0xffd2a0, .6); key.position.set(-1.6, 2.6, 2.2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: .5, far: 8 }); key.shadow.bias = -0.0005; scene.add(key, key.target);

// ---------- Pryanichek ----------
const gltf = await new GLTFLoader().loadAsync('/models/gingerbread-full.glb'); $('load').style.width = '100%';
const man = new THREE.Group(); scene.add(man); man.add(gltf.scene);
{ const b = new THREE.Box3().setFromObject(gltf.scene), s = b.getSize(new THREE.Vector3()), k = .42 / s.y; gltf.scene.scale.setScalar(k); const b2 = new THREE.Box3().setFromObject(gltf.scene); gltf.scene.position.y -= b2.min.y; }
gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
const mixer = new THREE.AnimationMixer(gltf.scene); const clips = Object.fromEntries(gltf.animations.map(a => [a.name, a]));
const NAMES = ['Idle_11', 'Look_Around_Dumbfounded', 'Long_Breathe_and_Look_Around', 'Big_Wave_Hello', 'Backflip', 'Formal_Bow', 'Running']; const act = {}; for (const n of NAMES) act[n] = mixer.clipAction(clips[n]);
for (const n of ['Look_Around_Dumbfounded', 'Long_Breathe_and_Look_Around', 'Big_Wave_Hello', 'Backflip', 'Formal_Bow']) { act[n].setLoop(THREE.LoopOnce); act[n].clampWhenFinished = true; }
const STATES = [{ t: 0, c: 'Idle_11' }, { t: 5.0, c: 'Look_Around_Dumbfounded' }, { t: 7.0, c: 'Long_Breathe_and_Look_Around' }, { t: 9.4, c: 'Idle_11' }, { t: 16.5, c: 'Big_Wave_Hello' }, { t: 20.6, c: 'Idle_11' }, { t: 22.0, c: 'Backflip' }, { t: 24.4, c: 'Idle_11' }, { t: 25.5, c: 'Formal_Bow' }, { t: 29.6, c: 'Idle_11' },
  { t: 30.4, c: 'Running' }, { t: 42.0, c: 'Idle_11' }, { t: 44.0, c: 'Big_Wave_Hello' }, { t: 48.2, c: 'Idle_11' }];
let curState = -1; const END = 52;
const HOME = V(0, 0, .35), C = V(.1, 0, -.1), R = .85;                 // run circle around the candle area
const runA = T => -Math.PI / 2 + 0.2 + (T - 30.4) * .62;
const posAt = T => { if (T < 30.4) return HOME.clone(); if (T < 42) { const a = runA(T); return V(C.x + Math.cos(a) * R, 0, C.z + Math.sin(a) * R * .8 + .15); } const a = runA(42), p = V(C.x + Math.cos(a) * R, 0, C.z + Math.sin(a) * R * .8 + .15); return lerpV(p, HOME, ramp(T, 42, 43.6)); };
const yawAt = T => { // faces +z (camera) at rest; toward the window while he notices it; along the path when running
  if (T < 30.4) return lerp(0, .95, ramp(T, 10.2, 12.4)) * (1 - ramp(T, 15.2, 16.4));
  if (T < 42) { const a = runA(T), dx = -Math.sin(a) * R, dz = Math.cos(a) * R * .8; return Math.atan2(dx, dz); }
  const a = runA(42), dx = -Math.sin(a) * R, dz = Math.cos(a) * R * .8, y0 = Math.atan2(dx, dz); const d = ((0 - y0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI; return y0 + d * ramp(T, 42, 43.6); };
function setState(T, force) {
  let i = 0; for (let k = 0; k < STATES.length; k++) if (T >= STATES[k].t) i = k;
  if (i === curState && !force) return; const s = STATES[i], a = act[s.c];
  if (force) { for (const x of Object.values(act)) x.stop(); a.reset(); a.setEffectiveWeight(1); a.play(); a.time = Math.max(0, T - s.t) % a.getClip().duration; mixer.update(0); }
  else { for (const x of Object.values(act)) if (x !== a) x.fadeOut(0.35); a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.fadeIn(0.35).play(); }
  curState = i;
}

// ---------- directing ----------
function camera_(T) {
  const g = posAt(T);
  if (T < 10)   { const u = smooth(T / 10); return [lerpV(V(1.0, .3, 1.55), V(.6, .33, 1.25), u), lerpV(V(0, .2, .1), V(0, .22, .15), u), 33]; }
  if (T < 16.5) { const u = smooth((T - 10) / 6.5); return [lerpV(V(-.9, .38, 1.15), V(-.4, .3, 1.15), u), lerpV(V(.1, .26, .1), V(0, .24, .12), u), 34]; }
  if (T < 22)   { const u = (T - 16.5) / 5.5; return [lerpV(V(.12, .27, 1.4), V(.05, .26, 1.25), u), V(0, .2, .35), 33]; }
  if (T < 30)   { const u = smooth((T - 22) / 8); return [lerpV(V(1.7, .62, 2.7), V(1.2, .5, 2.2), u), lerpV(V(0, .35, -1.4), V(0, .25, -.2), u), 42]; }
  if (T < 42.5) { const a = runA(T), cx = C.x + Math.cos(a + .9) * (R + .95), cz = C.z + Math.sin(a + .9) * (R + .95) * .85 + .15; return [V(cx, .26, cz), g.clone().add(V(0, .19, 0)), 38]; }
  const u = smooth((T - 42.5) / 9); return [lerpV(V(0, .28, 1.35), V(0, .3, 1.55), u), V(0, .22, .3), 33];
}
const CUTS = [10, 16.5, 22, 30, 42.5];
const SUBS = [[2.8, 7.2, 'Тихая ночь перед Рождеством…'], [11.4, 15.8, 'Ой! Что это за звезда за окном?'], [17.0, 21.2, 'Привет! Я Пряничек!'], [26.0, 30.0, 'Пойдём искать Рождество?'], [44.4, 49.2, 'Я буду твоим проводником!']];
const controls = new OrbitControls(camera, canvas); controls.enabled = false; Object.assign(controls, { enableDamping: true, maxPolarAngle: Math.PI * .5, minDistance: .5, maxDistance: 4, target: V(0, .25, .3) });
const mk = (f, v = 0) => Object.assign(new Audio(f), { loop: true, volume: v });
const audio = { nat: mk('/audio/theme-nativity.mp3'), crackle: mk('/audio/fire-crackle.mp3'), joy: mk('/audio/theme-joy.mp3'), shimmer: Object.assign(new Audio('/audio/angel-shimmer.mp3'), { volume: .7 }) };
const vol = (a, v) => { a.volume = clamp(v); };
let T = 0, playing = false, forcedT = null, lastT = -1, shimmerDone = false, ending = false, lastFrame = performance.now(), tapClip = null;
const fadeEl = $('fade'), subEl = $('sub');
function direct(T) {
  setState(T, Math.abs(T - lastT) > .7); const dt = Math.max(0, T - lastT);
  man.position.copy(posAt(T)); man.rotation.y = yawAt(T); mixer.update(lastT < 0 || Math.abs(T - lastT) > .7 ? 0 : dt);
  const [cp, ct, fov] = controls.enabled ? [null, null, null] : camera_(T); if (cp) { camera.position.copy(cp); camera.lookAt(ct); if (Math.abs(camera.fov - fov) > .01) { camera.fov = fov; camera.updateProjectionMatrix(); } }
  ambience(T);
  const warm = ramp(T, 0, 3); candleLight.intensity = (3.6 + Math.sin(T * 11) * .35 + Math.sin(T * 5.3) * .3) * warm; treePL.intensity = 5 * ramp(T, 1, 5); fireL.intensity = (9 + Math.sin(T * 13) * 1.2) * ramp(T, 0, 3);
  winStar.material.opacity = ramp(T, 9.5, 12) ; winStar.scale.setScalar(.7 + Math.sin(T * 2.4) * .04) ; key.intensity = .6 * ramp(T, 0, 4) + ramp(T, 29, 31) * .15;
  bloom.strength = .5 + ramp(T, 16, 19) * .1;
  if (playing) { vol(audio.nat, .55 * (1 - ramp(T, 29, 33) * .6) * ramp(T, 0, 3)); vol(audio.crackle, .3); vol(audio.joy, ramp(T, 29.5, 32.5) * (1 - ramp(T, 42, 46)) * .7); if (!shimmerDone && T > 10.6) { shimmerDone = true; audio.shimmer.currentTime = 0; audio.shimmer.play().catch(() => {}); } }
  let dip = 0; for (const c0 of CUTS) { const d = Math.abs(T - c0); if (d < .3) dip = Math.max(dip, 1 - d / .3); } fadeEl.style.opacity = (T < 1 ? 1 - T : dip) * (T < END + 4 ? 1 : 0);
  const sub = SUBS.find(s => T >= s[0] && T < s[1]); subEl.textContent = sub ? sub[2] : ''; subEl.classList.toggle('on', !!sub);
  $('title').classList.toggle('on', T > 49); lastT = T;
}
function ambience(T) {
  flame.position.set(.78 + Math.sin(T * 9) * .006, .52 + Math.sin(T * 13) * .01, -.45); flame.scale.set(.09 + Math.sin(T * 12) * .008, .16 + Math.sin(T * 8) * .015, 1);
  treeLights.forEach(l => { l.gl.material.opacity = .65 + Math.sin(T * l.sp + l.ph) * .35; });
  fFlames.forEach(s => { const u = s.userData, k = ((T * u.sp + u.ph) % 1); s.position.set(u.x * (1 - k * .5), .12 + k * .85, -.2); s.scale.setScalar((.5 - k * .35)); s.material.opacity = 1 - k; });
  for (let i = 0; i < SNN; i++) { const s = snSeed[i], y = 1 - ((s.y - T * s.s * .35) % 1 + 1) % 1; sn[i*3] = WX - .72 + ((s.x + Math.sin(T * .6 + s.p) * .03) % 1) * 1.44; sn[i*3+1] = WY - .9 + y * 1.8; sn[i*3+2] = -4.55; } snG.attributes.position.needsUpdate = true;
  for (let i = 0; i < DN; i++) { const s = dS[i]; dp[i*3] = .4 + s.x + Math.sin(T * s.s + s.p) * .2; dp[i*3+1] = .08 + ((s.y + T * s.s * .12) % 1.8); dp[i*3+2] = s.z - .3; } dG.attributes.position.needsUpdate = true;
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let freePending = null;
addEventListener('pointerdown', e => { if (!ending) return; ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); if (ray.intersectObject(man, true).length) { const n = ['Backflip', 'Big_Wave_Hello', 'Formal_Bow'][Math.floor(Math.random() * 3)]; freePending = n; } });
function frame(now) {
  const dtR = Math.min(.05, (now - lastFrame) / 1000); lastFrame = now;
  if (forcedT != null) T = forcedT; else if (playing && !ending) { T += dtR; if (T >= END) { ending = true; controls.enabled = true; controls.target.set(0, .25, .35); $('again').style.display = 'block'; man.position.copy(HOME); man.rotation.y = 0; } }
  if (!ending || forcedT != null) direct(Math.min(T, END)); else {
    ambience(performance.now() / 1000); mixer.update(dtR);
    if (freePending) { const a = act[freePending]; for (const x of Object.values(act)) if (x !== a) x.fadeOut(.3); a.reset(); a.enabled = true; a.fadeIn(.3).play(); tapClip = { a, end: performance.now() + a.getClip().duration * 1000 - 300 }; freePending = null; }
    if (tapClip && performance.now() > tapClip.end) { tapClip.a.fadeOut(.4); const i = act.Idle_11; i.reset(); i.enabled = true; i.fadeIn(.4).play(); tapClip = null; } controls.update(); }
  composer.render(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
$('go').addEventListener('click', () => { $('start').remove(); playing = true; T = 0; for (const a of Object.values(audio)) if (a !== audio.shimmer) a.play().catch(() => {}); });
$('again').addEventListener('click', () => { $('again').style.display = 'none'; controls.enabled = false; ending = false; T = 0; lastT = -1; shimmerDone = false; });
window.__m = { act, mixer, seek: t => { forcedT = t; }, free: () => { forcedT = null; }, THREE, scene };
