// Stage: the medallion disc, the page under it, and the figure that stands on the disc (upright, perpendicular to the page).
// The same `anchor` group is what the AR tracker will later pin to the printed medallion.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadCompanions } from './companions.js';
import { buildRoom } from './roomfx.js';
import { buildGame } from './gamefx.js';

const DISC_R = 0.5, DISC_H = 0.035, FIGURE_H = 1.18;
const UPPER = /Spine|Neck|Head|Shoulder|Arm|Hand|headfront/i, LOWER = /Leg|Foot|Toe|Hips/i;
const EMO = { // delivery tag → how animated the figure is while speaking
  strong: /joyful|excited|overwhelmed|furious|triumph|urgent|indignant|boast|laugh|passion/i,
  soft: /soft|hushed|quiet|whisper|tender|sad|reverent|peace|gentle|slow|wear|sigh|calm/i,
};

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    const phone = matchMedia('(pointer: coarse)').matches || innerWidth < 800;   // phones: lighter rendering (a lower pixel ratio and smaller shadow map keep it smooth and cool)
    this.phone = phone; this.renderer.setPixelRatio(Math.min(devicePixelRatio, phone ? 1.75 : 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.05, 50);
    this.camera.position.set(0.1, 0.95, 3.3);
    this.controls = new OrbitControls(this.camera, canvas);
    Object.assign(this.controls, { target: new THREE.Vector3(0, 0.40, 0), enableDamping: true, dampingFactor: 0.08, enablePan: false, minDistance: 1.5, maxDistance: 4.6, maxPolarAngle: Math.PI * 0.52, minPolarAngle: Math.PI * 0.18 });
    this.controls.update();
    this.arRoot = new THREE.Group(); this.scene.add(this.arRoot); this.anchor = new THREE.Group(); this.arRoot.add(this.anchor);
    this.mode = 'scene'; this.onFrame = null; this._cw = new THREE.Vector3();
    this.clock = new THREE.Clock();
    this.speaking = 0; this.speakTarget = 0; this.intensity = 1; this.nod = 0;   // head pitch nods are off: they tilted heads unnaturally
    this.mixer = null; this.actions = {}; this.bones = {}; this.current = null; this.figure = null;
    this._lights(); this._page(); this._dust();
    addEventListener('resize', () => this.resize()); this.resize();
    this.renderer.setAnimationLoop((t, frame) => this._frame(frame));
  }
  resize() {
    if (this.arView) { const { vw, vh } = this.arView, k = Math.max(innerWidth / vw, innerHeight / vh), st = this.canvas.style; this.renderer.setSize(vw, vh, false); st.width = vw * k + 'px'; st.height = vh * k + 'px'; st.left = (innerWidth - vw * k) / 2 + 'px'; st.top = (innerHeight - vh * k) / 2 + 'px'; st.right = 'auto'; st.bottom = 'auto'; return; }   // (left/top above centre the cover-cropped canvas on the video)
    this.canvas.style.cssText = '';
    const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // keep the whole figure in view on tall phone screens
    this.camera.fov = w / h < 0.8 ? 44 : 34; this.insetCur ??= 0; this.insetTarget ??= 0; if (this.mode !== 'scene') this.camera.updateProjectionMatrix(); this._applyInset(true); this._layoutCompanions();
  }
  // a big companion beside the disc: on a wide screen it stands next to the witness, on a narrow phone it steps behind so both fit in the frame
  /** what is under the finger: { companion } for an animal, { figure: true } for the witness, null for nothing */
  pick(cx, cy) {
    if (!this.model) return null;
    const r = this.renderer.domElement.getBoundingClientRect(); this._ndc = this._ndc || new THREE.Vector2(); this._ray = this._ray || new THREE.Raycaster();
    this._ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); this._ray.setFromCamera(this._ndc, this.camera);
    let best = null, bd = 1e9;
    const test = (obj, res) => { const h = this._ray.intersectObject(obj, true); if (h.length && h[0].distance < bd) { bd = h[0].distance; best = { ...res, point: h[0].point.clone(), object: h[0].object }; } };
    for (const root of this.pickRoots || [this.roomFx ? this.roomFx.model : this.model]) test(root, { figure: true });   // the room: only its mesh counts (not the sprites / snow on top); the game: the board and the gingerbread for (const c of this.companions || []) test(c.root, { companion: c });
    return best;
  }
  _layoutCompanions() {
    if (!this.companions || !this.baseCam) return;
    const narrow = innerWidth / innerHeight < 0.8; this.camera.position.copy(this.baseCam); this.controls.target.copy(this.baseTarget);
    for (const c of this.companions) c.layout(narrow);
    const wide = this.companions.filter(c => c.cfg.onPage);
    if (wide.length) { const x = wide[0].pos()[0], shift = x * (narrow ? 0.4 : 0.5); this.controls.target.x = this.baseTarget.x + shift; this.camera.position.x = this.baseCam.x + shift; this.camera.position.z = this.baseCam.z + (narrow ? 0.9 : 0.55); this.controls.update(); }
  }
  /** px of the bottom of the screen covered by UI: the scene is shifted up so the figure stays in the free part (and in AR, over the camera image) */
  setInset(px, top = this.topInset || 0) { this.insetTarget = px; if (top !== this.topInset) { this.topInset = top; this._viewOffset(); } }
  _applyInset(force) {
    if (this.mode !== 'scene') return;
    if (force || Math.abs(this.insetCur - this.insetTarget) > 0.5) { this.insetCur = this.insetTarget; this._viewOffset(); }
  }
  /** frame the witness in the free band between the top controls and the bottom panel: shift it there and zoom out if it would not fit */
  _viewOffset() {
    const w = innerWidth, h = innerHeight, top = this.topInset || 0, bot = this.insetCur || 0;
    const free = Math.max(120, h - top - bot);
    const D = this.camera.position.distanceTo(this.controls.target), px = ((this.fitHeight || 1.4) / (2 * D * Math.tan(this.camera.fov * Math.PI / 360))) * h;   // the tallest figure + disc is ~1.4 high
    this.camera.zoom = Math.min(1, (0.94 * free) / px);
    if (bot > 1 || top > 1) this.camera.setViewOffset(w, h, 0, (bot - top) / 2, w, h); else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }
  _lights() {
    const L = this.anchor; L.add(new THREE.HemisphereLight(0xdfe6ff, 0x4a3a28, 0.95));
    const key = new THREE.DirectionalLight(0xffe2b8, 2.4); key.position.set(-1.6, 2.6, 2.2); key.castShadow = true;
    key.shadow.mapSize.set(this.phone ? 1024 : 2048, this.phone ? 1024 : 2048); Object.assign(key.shadow.camera, { left: -1.6, right: 1.6, top: 2, bottom: -1, near: 0.5, far: 8 }); key.shadow.bias = -0.0004; key.shadow.radius = 4;
    L.add(key, key.target);
    const rim = new THREE.DirectionalLight(0x9db4ff, 1.1); rim.position.set(1.8, 1.8, -2); L.add(rim);
    // in AR the real surface shows through: only the shadows are drawn on it
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(3, 3).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.35 })); sh.receiveShadow = true; sh.position.y = 0.001; sh.visible = false; L.add(sh); this.shadowCatcher = sh;
  }
  _page() { // the magazine page under the medallion, fading softly into the dark
    const g = new THREE.PlaneGeometry(3.6, 2.6); g.rotateX(-Math.PI / 2);
    const mk = (draw) => { const c = document.createElement('canvas'); c.width = c.height = 512; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); };
    const paper = mk(x => { x.fillStyle = '#e9dfc9'; x.fillRect(0, 0, 512, 512); const id = x.getImageData(0, 0, 512, 512); for (let i = 0; i < id.data.length; i += 4) { const n = (Math.random() - .5) * 12; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; } x.putImageData(id, 0, 0); });
    paper.colorSpace = THREE.SRGBColorSpace; paper.wrapS = paper.wrapT = THREE.RepeatWrapping; paper.repeat.set(5, 4);
    const fade = mk(x => { const r = x.createRadialGradient(256, 256, 40, 256, 256, 256); r.addColorStop(0, '#fff'); r.addColorStop(0.55, '#d8d8d8'); r.addColorStop(1, '#000'); x.fillStyle = r; x.fillRect(0, 0, 512, 512); });
    const page = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: paper, alphaMap: fade, transparent: true, roughness: 0.95, color: 0xd9d2c2 })); page.receiveShadow = true; page.position.y = -0.002; this.anchor.add(page); this.page = page;
  }
  _dust() { // slow golden motes around the disc
    const N = 90, pos = new Float32Array(N * 3); this.dustSeed = Array.from({ length: N }, () => ({ a: Math.random() * 6.28, r: 0.35 + Math.random() * 0.8, y: Math.random() * 1.5, s: 0.05 + Math.random() * 0.12, p: Math.random() * 9 }));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); this.dustPos = pos; this.dustGeo = g;
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), r = x.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,240,190,1)'); r.addColorStop(1, 'rgba(255,200,100,0)'); x.fillStyle = r; x.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); this.anchor.add(this.dust = new THREE.Points(g, new THREE.PointsMaterial({ map: t, size: 0.028, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.75 })));
  }
  async load(id, onProgress) {
    const [tex] = await Promise.all([id === 'game' || id === 'quiz' ? this._boardTexture() : new THREE.TextureLoader().loadAsync(`medallions/${id}.webp`)]);   // the game board is drawn here, it is not a medallion
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.center.set(0.5, 0.5); tex.rotation = Math.PI; // name reads from the viewer's side
    const gold = new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.85, roughness: 0.32 });
    const top = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.12 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(DISC_R, DISC_R, DISC_H, 128), [gold, top, gold]); disc.position.y = DISC_H / 2; disc.castShadow = disc.receiveShadow = true; this.disc = disc; this.anchor.add(disc);
    if (id === 'game' || id === 'quiz') { await this._game(id); onProgress?.(1); this.companions = []; this.baseCam = this.camera.position.clone(); this.baseTarget = this.controls.target.clone(); this._layoutCompanions(); return { clips: [], companions: [] }; }
    if (id === 'room') { await this._room(); onProgress?.(1); this.companions = []; this.baseCam = this.camera.position.clone(); this.baseTarget = this.controls.target.clone(); this._layoutCompanions(); return { clips: [], companions: [] }; }
    if (id === 'word') { onProgress?.(1); this._book(); this.companions = []; this.baseCam = this.camera.position.clone(); this.baseTarget = this.controls.target.clone(); this._layoutCompanions(); return { clips: [], companions: [] }; }
    const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(`witnesses/${id}/model.glb`, e => e.total && onProgress?.(e.loaded / e.total));
    const fig = new THREE.Group(); fig.add(gltf.scene); this.anchor.add(fig); this.figure = fig; this.model = gltf.scene;
    const b = new THREE.Box3().setFromObject(gltf.scene), s = b.getSize(new THREE.Vector3()); const k = FIGURE_H / s.y; gltf.scene.scale.setScalar(k);
    const b2 = new THREE.Box3().setFromObject(gltf.scene), c = b2.getCenter(new THREE.Vector3()); gltf.scene.position.set(-c.x, -b2.min.y, -c.z); fig.position.y = DISC_H;
    gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } if (o.isBone) this.bones[o.name.replace(/^mixamorig:?/, '')] = o; });
    this.mixer = new THREE.AnimationMixer(gltf.scene);
    const find = rx => gltf.animations.find(a => rx.test(a.name));
    const clips = { idle: find(/Idle/), talk: find(/Talk_with_Hands_Open/) || find(/Talk/), bow: find(/Bow/) };
    // some figures ship without an idle clip: hold the neutral first frame of their talking clip instead (never the T-pose)
    // all Meshy figures share one Mixamo skeleton, so a figure without a talking clip borrows one from a donor figure
    this.borrowed = false;
    if (!clips.idle && clips.talk) clips.idle = THREE.AnimationUtils.subclip(clips.talk, 'idleFromTalk', 0, 2, 30);
    if (this.borrowed && clips.idle) { const lower = clips.idle.clone(); lower.name = 'idleLower'; lower.tracks = lower.tracks.filter(t => !UPPER.test(THREE.PropertyBinding.parseTrackName(t.name).nodeName) || LOWER.test(THREE.PropertyBinding.parseTrackName(t.name).nodeName)); clips.idleLower = lower; }
    for (const [n, c] of Object.entries(clips)) if (c) { const a = this.mixer.clipAction(c); this.actions[n] = a; }
    this.clipNames = gltf.animations.map(a => a.name);
    this._play('idle');
    this.companions = await loadCompanions(id, this.anchor, DISC_H, loader);
    this.baseCam = this.camera.position.clone(); this.baseTarget = this.controls.target.clone(); this._layoutCompanions();
    return { clips: this.clipNames, companions: this.companions.map(c => c.cfg.name) };
  }
  async _borrowTalk(loader, targetScene, id) {
    const donor = id === 'zechariah' ? 'joseph' : 'zechariah';
    try {
      const d = await loader.loadAsync(`witnesses/${donor}/model.glb`); const src = d.animations.find(a => /Talk/.test(a.name)); if (!src) return null;
      const clip = src.clone(); clip.name = 'Talk_borrowed';
      clip.tracks = clip.tracks.filter(t => { const { nodeName, propertyName } = THREE.PropertyBinding.parseTrackName(t.name); return propertyName !== 'position' && UPPER.test(nodeName) && !LOWER.test(nodeName) && targetScene.getObjectByName(nodeName); }); // upper body only: no legs, no hip drift
      return clip;
    } catch (e) { console.warn('no borrowed talk clip', e.message); return null; }
  }
  _play(name, fade = 0.35, once = false) {
    const want = new Set((name === 'talk' && this.borrowed && this.actions.idleLower) ? [this.actions.talk, this.actions.idleLower] : [this.actions[name]].filter(Boolean));
    if (!want.size) return;
    const same = this.current && this.current.size === want.size && [...want].every(x => this.current.has(x)); if (same) return;
    for (const x of this.current || []) if (!want.has(x)) x.fadeOut(fade);
    for (const x of want) if (!(this.current && this.current.has(x))) { x.reset().setEffectiveWeight(1); x.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat); x.clampWhenFinished = once; x.fadeIn(fade).play(); }
    this.current = want; this.currentName = name;
  }
  /** start/stop speaking; `tag` is the line's delivery tag, it sets how lively the gestures are */
  setSpeaking(on, tag = '') {
    this.speakTarget = on ? 1 : 0;
    this.intensity = EMO.strong.test(tag) ? 1.7 : EMO.soft.test(tag) ? 0.55 : 1;
    if (on && this.actions.talk) { this._play('talk'); this.actions.talk.setEffectiveTimeScale(0.85 + this.intensity * 0.18); }
    else this._play('idle');
    this.noTalkClip = !this.actions.talk;
  }
  bow() { if (this.actions.bow) { this._play('bow', 0.4, true); this.actions.bow.getMixer().addEventListener('finished', () => this._play('idle', 0.6), { once: true }); } }
  // keep the soles on the disc: the baked clips lift the feet (idle/talk sway), so measure the lowest foot bone and drop the figure to match
  /** a snowy festive plate for the gingerbread game (no printed marker is needed for it) */
  _boardTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d');
    const g = x.createRadialGradient(512, 512, 40, 512, 512, 512); g.addColorStop(0, '#fffdf6'); g.addColorStop(0.7, '#e6f1fb'); g.addColorStop(1, '#c9dff2'); x.fillStyle = g; x.fillRect(0, 0, 1024, 1024);
    x.translate(512, 512);
    x.lineCap = 'round'; for (let i = 0; i < 60; i++) { x.save(); x.rotate(i / 60 * Math.PI * 2); x.strokeStyle = i % 2 ? '#d93a3a' : '#ffffff'; x.lineWidth = 16; x.beginPath(); x.moveTo(470, -6); x.lineTo(470, 6); x.stroke(); x.restore(); }   // candy-cane rim
    x.strokeStyle = '#2f9e5a'; x.lineWidth = 8; x.beginPath(); x.arc(0, 0, 440, 0, 7); x.stroke(); x.strokeStyle = '#d93a3a'; x.lineWidth = 4; x.beginPath(); x.arc(0, 0, 424, 0, 7); x.stroke();
    let r = 11; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    x.fillStyle = '#ffffff'; for (let i = 0; i < 140; i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * 400; x.globalAlpha = 0.5 + rnd() * 0.5; x.beginPath(); x.arc(Math.cos(a) * d, Math.sin(a) * d, 3 + rnd() * 7, 0, 7); x.fill(); } x.globalAlpha = 1;
    x.strokeStyle = '#9fc4e6'; x.lineWidth = 5; for (const [px, py] of [[-230, -150], [250, -190], [-120, 250], [210, 230], [0, -300]]) { x.save(); x.translate(px, py); for (let k = 0; k < 6; k++) { x.rotate(Math.PI / 3); x.beginPath(); x.moveTo(0, 0); x.lineTo(0, 46); x.moveTo(0, 26); x.lineTo(13, 38); x.moveTo(0, 26); x.lineTo(-13, 38); x.stroke(); } x.restore(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  /** the gingerbread game: a small board on the medallion, so the camera comes closer */
  async _game(id) {
    const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
    this.gameFx = await buildGame(loader, DISC_H, { setView: m => this._gameView(m) }); this.anchor.add(this.gameFx.group);
    this.figure = this.gameFx.group; this.model = this.gameFx.group; this.fixedFacing = true; this.pickRoots = [this.disc, this.gameFx.model]; this.fitHeight = 0.55;
    this.camera.position.set(0, 1.0, 1.65); this.controls.target.set(0, 0.06, 0); if (id === 'quiz') { this.camera.position.set(0, 0.42, 0.95); this.controls.target.set(0, 0.13, 0.12); this.fitHeight = 0.34; } Object.assign(this.controls, { minDistance: 0.5, maxDistance: 3 }); this.controls.update();
  }
  /** the runner looks along the track from behind; the collecting game looks down at the plate */
  _gameView(m) {
    const run = m === 'run'; if (this.disc) this.disc.visible = !run;
    if (this.mode !== 'scene') return;   // in AR the phone is the camera
    this.controls.enabled = !run;
    if (run) { this.camera.position.set(0, 0.68, 1.3); this.controls.target.set(0, 0.06, -0.85); this.fitHeight = 0.5; }
    else { this.camera.position.set(0, 1.0, 1.65); this.controls.target.set(0, 0.06, 0); this.fitHeight = 0.55; }
    this.controls.update(); this._viewOffset();
  }
  /** the Christmas room: a diorama on the medallion with a living fire, twinkling tree lights, falling snow ... */
  async _room() {
    const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
    const r = await buildRoom(loader, { debug: new URLSearchParams(location.search).has('debug') });
    const S = 0.56, hold = new THREE.Group(); r.group.scale.setScalar(S); r.group.position.y = DISC_H + 0.78 * S + 0.005; hold.add(r.group); this.anchor.add(hold);
    this.figure = hold; this.model = hold; this.fixedFacing = true; this.roomFx = r; this.roomScale = S;
    this.controls.minDistance = 0.9; this.controls.target.y = 0.5;
  }
  /** the Word of God: an open book hovering over the medallion, with a column of light; it glows while the recording plays */
  _book() {
    const g = new THREE.Group(), tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const page = tex(512, 700, (x, w, h) => {
      x.fillStyle = '#f7eed3'; x.fillRect(0, 0, w, h);
      const gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#0000'); gr.addColorStop(1, '#00000018'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      x.fillStyle = '#5a3a1c'; let r = 7; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
      x.font = 'bold 74px Georgia'; x.fillText('С', 52, 118);
      for (let y = 70; y < h - 60; y += 27) { let xx = y < 140 ? 130 : 52; while (xx < w - 56) { const l = 14 + rnd() * 46; x.globalAlpha = .55; x.fillRect(xx, y, Math.min(l, w - 56 - xx), 5); xx += l + 8; } }
      x.globalAlpha = 1;
    });
    const mat = new THREE.MeshStandardMaterial({ map: page, roughness: 0.8, emissive: 0xffd27a, emissiveMap: page, emissiveIntensity: 0.12, side: THREE.DoubleSide });
    const leather = new THREE.MeshStandardMaterial({ color: 0x5a2e17, roughness: 0.55, metalness: 0.1 }), goldM = new THREE.MeshStandardMaterial({ color: 0xd8b04a, metalness: 0.9, roughness: 0.3 });
    const sheet = side => { const geo = new THREE.PlaneGeometry(0.30, 0.42, 20, 1); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const u = Math.abs(p.getX(i) + 0.15) / 0.30; p.setY(i, 0.028 + 0.055 * Math.sin(Math.min(1, u * 1.15) * Math.PI * 0.62) * (1 - 0.35 * u)); }
      geo.translate(side * 0.155, 0, 0); if (side < 0) geo.scale(-1, 1, 1); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };
    const L = sheet(-1), R = sheet(1);
    const coverBox = (w, x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.018, 0.45), leather); m.position.set(x, 0.009, 0); m.castShadow = m.receiveShadow = true; return m; };
    const edge = x => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.004, 0.012), goldM); m.position.set(x, 0.019, 0.215); return m; };
    g.add(coverBox(0.32, -0.16), coverBox(0.32, 0.16), L, R, edge(-0.16), edge(0.16));
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.45, 12).rotateX(Math.PI / 2), leather); spine.position.set(0, 0.012, 0); g.add(spine);
    // light: a soft column of rays and a warm glow
    const beamTex = tex(64, 256, (x, w, h) => { const gr = x.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(255,226,150,.85)'); gr.addColorStop(1, 'rgba(255,226,150,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); const gx = x.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, '#0000'); gx.addColorStop(.5, '#000'); gx.addColorStop(1, '#0000'); x.globalCompositeOperation = 'destination-in'; x.fillStyle = gx; x.fillRect(0, 0, w, h); });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 0.95, 32, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.35 }));
    beam.position.y = DISC_H + 0.62;
    const glow = new THREE.PointLight(0xffd88a, 0.6, 2.2); glow.position.y = 0.2; g.add(glow);
    g.position.y = DISC_H + 0.40; g.rotation.x = 1.0; g.scale.setScalar(1.25);   // tilted up toward the viewer, like a book on a lectern
    const hold = new THREE.Group(); hold.add(g, beam); hold.position.y = 0; this.anchor.add(hold); this.figure = hold; this.model = hold;
    this.book = { g, R, L, mat, beam, glow, baseY: g.position.y };
  }
  _camLocal() { this.camera.updateWorldMatrix(true, false); this.anchor.updateWorldMatrix(true, false); return this.anchor.worldToLocal(this._cw.setFromMatrixPosition(this.camera.matrixWorld)); }
  /** 'scene' = the virtual stage, 'ar' = real camera behind, the stage is drawn over it */
  setAR(on) {
    this.mode = on ? 'ar' : 'scene'; if (on) { this.camera.zoom = 1; this.camera.clearViewOffset(); this.camera.updateProjectionMatrix(); }
    for (const o of [this.page, this.dust]) if (o) o.visible = !on;
    if (this.disc) this.disc.visible = true;
    this.shadowCatcher.visible = on; this.scene.background = null;
    document.body.classList.toggle('ar', on);
    if (!on) { this.arRoot.matrixAutoUpdate = true; this.arRoot.position.set(0, 0, 0); this.arRoot.quaternion.identity(); this.arRoot.scale.setScalar(1); this.arRoot.visible = true; this.anchor.rotation.set(0, 0, 0); this.camera.matrixAutoUpdate = true; this.camera.fov = innerWidth / innerHeight < 0.8 ? 44 : 34; this.camera.position.copy(this.baseCam || this.camera.position); this.camera.quaternion.identity(); this.arView = null; this.resize(); this._layoutCompanions(); }
  }
  // (heights are taken in the anchor's own units: in AR it is moved and scaled)
  _footY() { let m = 1e9; for (const n of ['LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase']) { const b = this.bones[n]; if (b) { b.getWorldPosition(this._v); this.anchor.worldToLocal(this._v); if (this._v.y < m) m = this._v.y; } } return m; }
  _groundLock() {
    if (!this.figure || !this.bones.LeftFoot) return;
    this._v = this._v || new THREE.Vector3();
    this.arRoot.updateMatrixWorld(true);
    const y = this._footY();
    if (this.soleDrop === undefined) {   // first call: find the lowest skinned vertex (soles, or a hem) and stand it on the disc; remember how far the feet bones sit above it
      let minV = 1e9; const v = new THREE.Vector3();
      this.model.traverse(o => { if (o.isSkinnedMesh) { o.skeleton.update(); const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i += 4) { o.getVertexPosition(i, v); v.applyMatrix4(o.matrixWorld); this.anchor.worldToLocal(v); if (v.y < minV) minV = v.y; } } });
      this.soleDrop = y - minV; this.figure.position.y += DISC_H - minV; return;
    }
    const want = this.figure.position.y + DISC_H - (y - this.soleDrop);   // where the figure must stand so the lowest foot touches the disc
    this.figure.position.y += (want - this.figure.position.y) * 0.6;
  }
  _frame(xrFrame) {
    const dt = Math.min(this.clock.getDelta(), 0.05), t = this.clock.elapsedTime;
    this.insetCur ??= 0; this.insetTarget ??= 0; if (this.mode === 'scene' && this.insetCur !== this.insetTarget) { this.insetCur += (this.insetTarget - this.insetCur) * Math.min(1, dt * 8); if (Math.abs(this.insetTarget - this.insetCur) < 0.5) this.insetCur = this.insetTarget; this._viewOffset(); }
    this.mixer?.update(dt);
    if (this.roomFx) this.roomFx.update(t, dt, this.speaking);
    if (this.gameFx) this.gameFx.update(t, dt);
    if (this.book) { const B = this.book, k = this.speaking; B.g.position.y = B.baseY + Math.sin(t * 1.1) * 0.012; B.mat.emissiveIntensity = 0.12 + k * 0.28 + Math.sin(t * 2.2) * 0.04 * k; B.glow.intensity = 0.5 + k * 1.1; B.beam.material.opacity = 0.22 + k * 0.4; B.R.rotation.z = Math.sin(t * 0.9) * 0.012 * (0.4 + k); B.L.rotation.z = -Math.sin(t * 0.9 + 1) * 0.012 * (0.4 + k); }
    this._groundLock();
    this.speaking += (this.speakTarget - this.speaking) * Math.min(1, dt * 6);
    // the figure turns to face whoever is looking at it
    if (this.figure && !this.fixedFacing) { const cam = this._camLocal(); const want = Math.atan2(cam.x, cam.z); let d = want - this.figure.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); this.figure.rotation.y += d * Math.min(1, dt * 2.2); }
    // life on top of the baked clips: breathing always, nodding while speaking
    const B = this.bones, sp = this.speaking * this.intensity;
    if (B.Head) B.Head.rotateX((Math.sin(t * 2.1) * 0.035 * sp + Math.sin(t * 0.9) * 0.012) * this.nod);
    if (B.Head) B.Head.rotateY(Math.sin(t * 1.3) * 0.035 * sp);   // barely-there turn of the head, no tilt
    if (this.noTalkClip && this.speaking > 0.01) { // no talking clip: calm hand gestures from code, small and smooth
      const q = this.speaking * Math.min(1.25, 0.7 + this.intensity * 0.3);
      const beat = (f, ph) => { const x = Math.sin(t * f + ph); return x > 0 ? x * x : 0; };   // gesture rises, holds, relaxes
      // measured on these rigs: rotating a bone about its local X by a negative angle swings the hand forward (both sides)
      const r = beat(1.15, 0) * q, l = beat(0.95, 2.2) * q;
      if (B.RightArm) B.RightArm.rotateX(-0.30 * r); if (B.RightForeArm) B.RightForeArm.rotateX(-0.75 * r);
      if (B.LeftArm) B.LeftArm.rotateX(-0.22 * l); if (B.LeftForeArm) B.LeftForeArm.rotateX(-0.6 * l);
      if (B.Spine1) B.Spine1.rotateZ(Math.sin(t * 0.8) * 0.012 * q);
    }
    for (const c of this.companions || []) c.update(t, dt, this.speaking, this.intensity, this._camLocal());
    // dust
    for (let i = 0; i < this.dustSeed.length; i++) { const d = this.dustSeed[i], a = d.a + t * d.s; this.dustPos[i * 3] = Math.cos(a) * d.r; this.dustPos[i * 3 + 1] = 0.05 + ((d.y + t * 0.04 * (1 + d.s * 3)) % 1.5); this.dustPos[i * 3 + 2] = Math.sin(a) * d.r; }
    this.dustGeo.attributes.position.needsUpdate = true;
    if (this.mode === 'scene') this.controls.update();
    this.onFrame?.(t, dt, xrFrame);
    this.renderer.render(this.scene, this.camera);
  }
}
