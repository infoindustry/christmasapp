// "The Magi and the Star" — a short film. The user's wise man, choreographed by code.
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

// ---------- renderer / post ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x070a22); scene.fog = new THREE.FogExp2(0x0b1030, 0.012);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.8, 0.6, 1.0); composer.addPass(bloom); composer.addPass(new OutputPass());
const fit = () => { renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
fit(); addEventListener('resize', fit);

// ---------- procedural textures ----------
const canvasTex = (w, h, draw, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
const glowTex = canvasTex(128, 128, (g, w) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.2, 'rgba(255,236,180,.75)'); r.addColorStop(1, 'rgba(255,200,110,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
const haloTex = canvasTex(256, 256, (g, w) => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); for (let i = 0; i <= 10; i++) { const x = i / 10; r.addColorStop(x, `rgba(255,225,160,${Math.pow(1 - x, 3.2) * .9})`); } g.fillStyle = r; g.fillRect(0, 0, w, w); });
const flareTex = canvasTex(512, 512, g => { // 4-point star flare
  const c = 256; const r = g.createRadialGradient(c, c, 0, c, c, 70); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.4, 'rgba(255,235,170,.55)'); r.addColorStop(1, 'rgba(255,210,120,0)'); g.fillStyle = r; g.fillRect(0, 0, 512, 512);
  for (const [dx, dy, len] of [[1, 0, 250], [0, 1, 250], [.7, .7, 110], [.7, -.7, 110]]) { const gr = g.createLinearGradient(c - dx * len, c - dy * len, c + dx * len, c + dy * len); gr.addColorStop(0, 'rgba(255,230,160,0)'); gr.addColorStop(.5, 'rgba(255,248,225,.95)'); gr.addColorStop(1, 'rgba(255,230,160,0)'); g.strokeStyle = gr; g.lineWidth = dx && dy ? 2 : 3; g.beginPath(); g.moveTo(c - dx * len, c - dy * len); g.lineTo(c + dx * len, c + dy * len); g.stroke(); } });
const sandBump = canvasTex(256, 256, (g, w, h) => { const id = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = 128 + (Math.random() - .5) * 70 + Math.sin(x * .35 + Math.sin(y * .11) * 3) * 25; const i = (y * w + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } g.putImageData(id, 0, 0); }, false);
sandBump.repeat.set(70, 70);

// ---------- sky ----------
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uGlow: { value: 0 }, uDusk: { value: 1 } },
  vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `varying vec3 p; uniform float uGlow, uDusk;
    void main(){ float h = clamp(p.y, 0.0, 1.0);
      vec3 horizon = mix(vec3(0.10,0.12,0.30), vec3(0.62,0.30,0.30), uDusk);     // dusk glow fades into night
      vec3 mid = mix(vec3(0.05,0.07,0.22), vec3(0.18,0.14,0.36), uDusk), top = vec3(0.012,0.02,0.09);
      vec3 c = mix(horizon, mid, smoothstep(0.0,0.22,h)); c = mix(c, top, smoothstep(0.18,0.85,h));
      float toward = smoothstep(0.0, 1.0, -p.z) * (1.0 - smoothstep(0.0, 0.35, h));    // warm glow over the village direction
      c += vec3(1.0,0.62,0.28) * toward * uGlow * 0.55;
      gl_FragColor = vec4(c,1.0); }` });
scene.add(new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), skyMat));
{ const n = 1400, pos = new Float32Array(n * 3), col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, e = Math.pow(Math.random(), .8) * 1.35 + 0.04, r = 280; pos[i*3] = Math.cos(a) * Math.cos(e) * r; pos[i*3+1] = Math.sin(e) * r; pos[i*3+2] = Math.sin(a) * Math.cos(e) * r; const b = .5 + Math.random() * 1.6; col[i*3] = b; col[i*3+1] = b * .95; col[i*3+2] = b * .85; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, size: 7, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); scene.add(stars); }

// ---------- terrain ----------
const HOUSE = V(0, 0, -31);
const hgt = (x, z) => {
  const n = Math.sin(x * .07 + 1.3) * Math.cos(z * .05) * 3.4 + Math.sin(x * .13 + z * .09) * 1.5 + Math.sin(x * .31 - z * .27) * .45 + Math.cos(z * .02 + x * .03) * 4;
  const corridor = smooth((Math.abs(x) - 3.5) / 14);
  const nearHouse = smooth((Math.hypot(x - HOUSE.x, z - HOUSE.z) - 11) / 14);
  const back = smooth((-z - 42) / 25) * 9;
  return (n * corridor + back * (0.4 + 0.6 * corridor)) * (0.15 + 0.85 * nearHouse) + (Math.sin(x * 2.3 + n) * 0.025) * corridor;
};
{ const g = new THREE.PlaneGeometry(260, 260, 220, 220); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, hgt(p.getX(i), p.getZ(i) - 60)); g.translate(0, 0, -60); g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ color: 0x9a8566, roughness: 1, bumpMap: sandBump, bumpScale: 1.2 }); const t = new THREE.Mesh(g, m); t.receiveShadow = true; scene.add(t); }

// ---------- village ----------
const mud = new THREE.MeshStandardMaterial({ color: 0x7a6650, roughness: 1 });
const warm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, .9, .38), toneMapped: false });
const village = new THREE.Group(); village.position.copy(HOUSE); scene.add(village);
const addHouse = (x, z, w, h, d, ry = 0, door = true) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mud); body.position.y = h / 2; body.castShadow = body.receiveShadow = true; g.add(body);
  const par = new THREE.Mesh(new THREE.BoxGeometry(w + .25, .22, d + .25), mud); par.position.y = h + .1; g.add(par);
  if (door) { const arch = new THREE.Mesh(new THREE.CircleGeometry(.55, 20, 0, Math.PI), warm); arch.position.set(0, 1.05, d / 2 + .02); g.add(arch); const lower = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.05), warm); lower.position.set(0, .52, d / 2 + .02); g.add(lower); }
  const win = new THREE.Mesh(new THREE.PlaneGeometry(.5, .6), warm); win.position.set(w * .3, h * .62, d / 2 + .02); g.add(win);
  village.add(g); return g; };
const mainHouse = addHouse(0, 0, 5.4, 3.0, 4.2); addHouse(-6.5, 2.5, 4.2, 2.4, 3.4, .25); addHouse(6.8, 1.8, 3.8, 2.6, 3.2, -.3); addHouse(-11, -3, 3.4, 2.0, 3, .4, false); addHouse(11.5, -2.5, 3.6, 2.2, 3, -.5, false);
const houseLight = new THREE.PointLight(0xffa850, 18, 22, 1.5); houseLight.position.set(0, 1.6, 3.2); village.add(houseLight);
const houseLight2 = new THREE.PointLight(0xffa850, 8, 14, 1.5); houseLight2.position.set(-6.5, 1.4, 5.5); village.add(houseLight2);

// ---------- star + beam ----------
const star = new THREE.Group(); scene.add(star);
const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex, color: new THREE.Color(3, 2.6, 1.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false })); flare.scale.setScalar(34); star.add(flare);
const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: new THREE.Color(1.5, 1.15, .65), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false })); halo.scale.setScalar(60); star.add(halo);
const beamMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { uA: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'varying vec2 vUv; uniform float uA; void main(){ float edge = 1.0 - abs(vUv.x*2.0-1.0); float a = pow(edge,1.6) * (0.25 + 0.75*vUv.y) * uA; gl_FragColor = vec4(vec3(1.0,0.82,0.5)*1.6, a*0.5); }' });
const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 7, 1, 32, 1, true), beamMat); scene.add(beam);
const starDir = new THREE.DirectionalLight(0xffd9a0, 0); scene.add(starDir, starDir.target);

// ---------- light ----------
scene.add(new THREE.HemisphereLight(0x5b6fc4, 0x2a2233, 0.55));
const moon = new THREE.DirectionalLight(0xa9bbff, 1.25); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 50 }); moon.shadow.bias = -0.0004; scene.add(moon, moon.target);

// ---------- dust / sand ----------
const DN = 260, dpos = new Float32Array(DN * 3), dseed = Array.from({ length: DN }, () => ({ x: (Math.random() - .5) * 36, y: Math.random() * 3.2, z: (Math.random() - .5) * 36, s: .3 + Math.random() * .9, p: Math.random() * 9 }));
const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
scene.add(new THREE.Points(dg, new THREE.PointsMaterial({ map: glowTex, color: 0xffe2b0, size: .09, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .55 })));

// ---------- the Magi ----------
const loaderBar = $('load'); let tick = 0;
const gltf = await new GLTFLoader().loadAsync('/models/wiseman-full.glb'); loaderBar.style.width = '100%';
const man = new THREE.Group(); scene.add(man); man.add(gltf.scene);
{ const b = new THREE.Box3().setFromObject(gltf.scene), s = b.getSize(new THREE.Vector3()), k = 1.85 / s.y; gltf.scene.scale.setScalar(k); const b2 = new THREE.Box3().setFromObject(gltf.scene); gltf.scene.position.y -= b2.min.y; }
gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
man.rotation.y = Math.PI;                         // model faces +Z; the journey goes toward -Z
const bones = {}; gltf.scene.traverse(o => { if (o.isBone) bones[o.name] = o; });
const rest = Object.fromEntries(Object.entries(bones).map(([n, b]) => [n, b.quaternion.clone()]));
const mixer = new THREE.AnimationMixer(gltf.scene); const clips = Object.fromEntries(gltf.animations.map(a => [a.name, a]));
const act = {}; for (const n of ['Idle', 'Walking', 'Formal_Bow']) { act[n] = mixer.clipAction(clips[n]); }
act.Formal_Bow.setLoop(THREE.LoopOnce); act.Formal_Bow.clampWhenFinished = true;
const STATES = [{ t: 0, c: 'Idle' }, { t: 19, c: 'Walking' }, { t: 36.4, c: 'Idle' }, { t: 39.2, c: 'Formal_Bow' }, { t: 43.2, c: 'Idle' }];
let curState = -1;
const WALK_FROM = 19, WALK_TO = 36.4, WALK_LEN = 23.2, END = 56;
const manZ = T => -WALK_LEN * lerp(clamp((T - WALK_FROM) / (WALK_TO - WALK_FROM)), smooth((T - WALK_FROM) / (WALK_TO - WALK_FROM)), 0.45);
function setState(T, force) {
  let i = 0; for (let k = 0; k < STATES.length; k++) if (T >= STATES[k].t) i = k;
  if (i === curState && !force) return; const s = STATES[i], a = act[s.c];
  if (force) {                                       // jump (start / seek): hard-set the pose for this moment
    for (const x of Object.values(act)) x.stop();
    a.reset(); a.setEffectiveWeight(1); a.setEffectiveTimeScale(1); a.play(); a.time = Math.max(0, T - s.t) % a.getClip().duration; mixer.update(0);
  } else {                                           // normal playback: smooth crossfade
    for (const x of Object.values(act)) if (x !== a) x.fadeOut(0.45);
    a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.fadeIn(0.45).play();
  }
  curState = i;
}
// acting layer (on top of baked clips): look up at the star, point, hands to heart
const E = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x * Math.PI / 180, y * Math.PI / 180, z * Math.PI / 180, 'XYZ'));
const blend = (n, e, w) => { if (w > 0.001 && bones[n]) bones[n].quaternion.slerp(rest[n].clone().multiply(e), w); };
function acting(T) {
  const look = ramp(T, 13.0, 14.8) * (1 - 0.7 * ramp(T, 19.0, 20.5)) * (1 - ramp(T, 36.4, 37.6));
  const point = ramp(T, 15.0, 16.6) * (1 - ramp(T, 18.0, 18.9));
  const heart = ramp(T, 18.6, 19.0) * 0 + ramp(T, 17.9, 18.5) * (1 - ramp(T, 18.8, 19.2));
  blend('Head', E(-32, 10, 0), look); blend('Neck', E(-12, 6, 0), look); blend('Spine01', E(-5, 0, 0), look * .6);
  blend('RightArm', E(-48, 0, -30), point); blend('RightForeArm', E(0, 0, -12), point);
  blend('LeftArm', E(52, 0, 48), heart); blend('LeftForeArm', E(0, 0, 105), heart); blend('RightArm', E(52, 0, -48), heart); blend('RightForeArm', E(0, 0, -105), heart);
}

// ---------- directing ----------
const STAR_A = V(-26, 38, -60), STAR_B = V(-4, 21, -38), STAR_END = V(0, 17, -34);
const starPos = T => T < 6 ? STAR_A : T < 12.5 ? lerpV(STAR_A, STAR_A, 0) : T < WALK_TO ? lerpV(STAR_A, STAR_B, ramp(T, 12.5, WALK_TO)) : lerpV(STAR_B, STAR_END, ramp(T, WALK_TO, 41));
const starAmt = T => ramp(T, 6.2, 9.5);
const M = T => V(0, 0, manZ(T));
function camera_(T) {
  const m = M(T);
  if (T < 6)    { const u = T / 6; return [lerpV(V(1.5, 1.0, 4.9), V(.5, 1.25, 3.3), smooth(u)), V(0, 1.6, -5), 40]; }
  if (T < 12.5) { const u = smooth((T - 6) / 6.5); return [lerpV(V(2.4, 1.1, 3.7), V(1.4, 1.25, 3.0), u), lerpV(V(0, 1.6, -4), V(-8, 15, -24), u), 42]; }
  if (T < 19)   { const u = (T - 12.5) / 6.5; return [lerpV(V(1.35, 1.5, -2.9), V(.95, 1.56, -2.25), u), V(0, 1.55, 0), 34]; }
  if (T < 30)   { const u = (T - 19) / 11; return [m.clone().add(V(-1.8 + u * .9, 1.3 + u * .12, -4.0 + u * .7)), m.clone().add(V(0, 1.4, 0)), 36]; }
  if (T < 36.4) { const u = smooth((T - 30) / 6.4); return [m.clone().add(lerpV(V(-2.5, 1.8, 3.0), V(1.4, 2.1, 4.2), u)), m.clone().add(V(0, 1.7, -8)), 44]; }
  if (T < 44)   { const u = smooth((T - 36.4) / 7.6); return [lerpV(V(-3.4, 1.2, -14.5), V(-2.4, 1.3, -14.0), u), lerpV(V(.3, 6.0, -30), V(.2, 7.0, -31), u), 62 - 2 * u]; }
  const u = smooth((T - 44) / 12); return [lerpV(V(-2.4, 1.3, -14.0), V(10, 7.5, -4), u), lerpV(V(.2, 7.0, -31), V(0, 6, -30), u), 58 - 8 * u];
}
const CUTS = [6, 12.5, 19, 36.4, 44]; // hard cuts hide behind a quick dip to black (shots at 19→30→36.4 flow continuously)
const SUBS = [[7.5, 12, 'Мы видели звезду Его на востоке…'], [12.6, 17, '…и пришли поклониться Ему.'], [37.5, 43, 'Мф 2:2']];

const controls = new OrbitControls(camera, canvas); controls.enabled = false; Object.assign(controls, { enableDamping: true, maxPolarAngle: Math.PI * .52, minDistance: 2, maxDistance: 30 });
const audio = {
  wind: Object.assign(new Audio('/audio/desert-wind.mp3'), { loop: true, volume: 0 }), journey: Object.assign(new Audio('/audio/theme-journey.mp3'), { loop: true, volume: 0 }),
  nativity: Object.assign(new Audio('/audio/theme-nativity.mp3'), { loop: true, volume: 0 }), shimmer: Object.assign(new Audio('/audio/angel-shimmer.mp3'), { volume: .8 }) };
const vol = (a, v) => { a.volume = clamp(v); };
let T = 0, playing = false, forcedT = null, lastT = -1, shimmerDone = false, lastCut = -1, ending = false, lastFrame = performance.now();
const fadeEl = $('fade'), subEl = $('sub');
function direct(T) {
  setState(T, Math.abs(T - lastT) > 0.7);
  const dt = Math.max(0, T - lastT);
  man.position.copy(M(T)); mixer.update(lastT < 0 || Math.abs(T - lastT) > .7 ? 0 : dt); acting(T);
  const sp = starPos(T), sa = starAmt(T); star.position.copy(sp); star.visible = sa > 0.001;
  const dCam = camera.position.distanceTo(sp), nearK = clamp(dCam / 70, .25, 1.2);
  flare.material.opacity = sa * (0.55 + 0.45 * clamp(dCam / 55)); flare.scale.setScalar(dCam * .36 * (0.6 + sa * .4) * (1 + Math.sin(T * 2.3) * .03)); halo.material.opacity = sa * .7 * nearK; halo.scale.setScalar(dCam * .62 + Math.sin(T * 1.7) * 1.5);
  const beamA = ramp(T, 38, 42.5) * .9; beamMat.uniforms.uA.value = beamA; beam.visible = beamA > 0.01;
  { const top = star.position.clone(), bot = V(HOUSE.x, 3.2, HOUSE.z + 0.5), mid = top.clone().add(bot).multiplyScalar(.5), len = top.distanceTo(bot); beam.position.copy(mid); beam.scale.set(1, len, 1); beam.quaternion.setFromUnitVectors(V(0, 1, 0), top.clone().sub(bot).normalize()); }
  starDir.intensity = sa * 1.5; starDir.position.copy(M(T)).add(sp.clone().sub(M(T)).normalize().multiplyScalar(40)); starDir.target.position.copy(M(T)).add(V(0, 1.2, 0));
  moon.position.copy(M(T)).add(V(-9, 12, 8)); moon.target.position.copy(M(T));
  houseLight.intensity = 16 + Math.sin(T * 9) * 1.3 + Math.sin(T * 4.1) * 1.1; skyMat.uniforms.uGlow.value = ramp(T, 30, 42); skyMat.uniforms.uDusk.value = 1 - ramp(T, 2, 10);
  scene.fog.color.setRGB(.045 + .1 * (1 - ramp(T, 2, 10)), .06 + .03 * (1 - ramp(T, 2, 10)), .17 + .04 * (1 - ramp(T, 2, 10)));
  bloom.strength = 0.75 + ramp(T, 38, 44) * .35;
  const [cp, ct, fov] = controls.enabled ? [null, null, null] : camera_(T);
  if (cp) { camera.position.copy(cp); camera.lookAt(ct); if (Math.abs(camera.fov - fov) > .01) { camera.fov = fov; camera.updateProjectionMatrix(); } }
  // dust drifts across the scene, centered on the camera/man
  const c = man.position; for (let i = 0; i < DN; i++) { const s = dseed[i]; dpos[i*3] = c.x + ((s.x + T * s.s * 1.2 + 18) % 36) - 18; dpos[i*3+1] = .1 + s.y + Math.sin(T * s.s + s.p) * .25; dpos[i*3+2] = c.z + s.z; } dg.attributes.position.needsUpdate = true;
  // sound design
  if (playing) { vol(audio.wind, .55 * (1 - ramp(T, 36, 42) * .6)); vol(audio.journey, ramp(T, 8, 16) * (1 - ramp(T, 35, 38.5)) * .7); vol(audio.nativity, ramp(T, 36.5, 40.5) * .85);
    if (!shimmerDone && T > 6.4) { shimmerDone = true; audio.shimmer.currentTime = 0; audio.shimmer.play().catch(() => {}); } }
  // cuts: dip to black
  let dip = 0; for (const c0 of CUTS) { const d = Math.abs(T - c0); if (d < .3) dip = Math.max(dip, 1 - d / .3); } fadeEl.style.opacity = (T < .8 ? 1 - T / .8 : dip) * (T < END + 4 ? 1 : 0);
  const sub = SUBS.find(s => T >= s[0] && T < s[1]); subEl.textContent = sub ? sub[2] : ''; subEl.classList.toggle('on', !!sub);
  $('title').classList.toggle('on', T > 47);
  lastT = T;
}
function frame(now) {
  const dtR = Math.min(0.05, (now - lastFrame) / 1000); lastFrame = now;
  if (forcedT != null) T = forcedT; else if (playing && !ending) { T += dtR; if (T >= END) { ending = true; controls.enabled = true; controls.target.set(0, 5, -28); $('again').style.display = 'block'; } }
  direct(Math.min(T, END)); if (controls.enabled) controls.update();
  composer.render(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
$('go').addEventListener('click', () => { $('start').remove(); playing = true; T = 0; for (const a of Object.values(audio)) { if (a !== audio.shimmer) a.play().catch(() => {}); } });
$('again').addEventListener('click', () => { $('again').style.display = 'none'; controls.enabled = false; ending = false; T = 0; lastT = -1; shimmerDone = false; });
window.__m = { act, mixer, bones, rest, seek: t => { forcedT = t; }, free: () => { forcedT = null; }, cam: () => camera.position.toArray(), THREE, scene };
