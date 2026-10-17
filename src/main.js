import * as THREE from 'three';
import { Controller } from 'locus-ar';
import { buildPainting } from './painting.js';
import { PoseSmoother } from './smooth.js';
import { buildVideo } from './video.js';
import { setupLantern } from './lantern.js';

const params = new URLSearchParams(location.search);
const SIM = params.get('sim');            // ?sim=1 → feed a simulated camera (desktop testing)
const DEBUG = params.has('debug');
const $ = id => document.getElementById(id);
const log = t => { if (DEBUG) $('debug').textContent = t; };

const SCENE = params.get('scene') || 'zakhariya';
const BASE = SCENE === 'nativity' ? '' : `/scenes/${SCENE}`;
const scene = await fetch(SCENE === 'nativity' ? '/scene.json' : `${BASE}/scene.json`).then(r => r.json());
const VIDEO = scene.type === 'video';
const LANTERN = scene.type === 'lantern';
const PAINTING = scene.type === 'painting' || VIDEO || LANTERN;
const PAGE_IMG = PAINTING ? `${BASE}/page.jpg` : '/page-print.png';
const TAAR = PAINTING ? `${BASE}/page.taar` : '/page.taar';
const PAGE_W = 1, PAGE_H = scene.page.h / scene.page.w;          // page size in "page widths"
const hole = PAINTING ? { cx: 0, cy: 0, w: 1, h: scene.page.h / scene.page.w } : {                                                    // hole rect in page units, origin = page centre, y up
  cx: ((scene.hole.x + scene.hole.w / 2) - scene.page.w / 2) / scene.page.w,
  cy: -((scene.hole.y + scene.hole.h / 2) - scene.page.h / 2) / scene.page.w,
  w: scene.hole.w / scene.page.w, h: scene.hole.h / scene.page.w,
};

// Layers: back → front, depth = how far below the page (in page widths).
const LAYERS = [
  { img: '0-sky',        z: -0.55 },
  { img: '2-hills-far',  z: -0.42 },
  { img: '3-hills-mid',  z: -0.32 },
  { img: '4-stable',     z: -0.22 },
  { img: '1-star',       z: -0.20, sway: 0.01, pulse: true },
  { img: '5-family',     z: -0.12, bob: 0.004 },
  { img: '6-shepherds',  z: -0.06, bob: 0.006 },
  { img: '7-foreground', z: -0.02 },
];

function buildScene(group) {
  // 1. stencil "window": only the hole area lets the deep layers show
  const maskMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  Object.assign(maskMat, { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
  const mask = new THREE.Mesh(new THREE.PlaneGeometry(hole.w, hole.h), maskMat);
  mask.position.set(hole.cx, hole.cy, 0);
  mask.renderOrder = 0;
  group.add(mask);

  // 2. layers, each wider than the hole by perspective growth so edges never show
  const loader = new THREE.TextureLoader();
  const animated = [];
  LAYERS.forEach((L, i) => {
    const tex = loader.load(`/layers/${L.img}.png`);
    tex.colorSpace = THREE.SRGBColorSpace;
    const grow = 1 + Math.abs(L.z) * 1.1;
    const w = hole.w * (scene.layerSize.w / scene.hole.w) * 1.0 * grow / 1;
    const h = hole.h * (scene.layerSize.h / scene.hole.h) * 1.0 * grow / 1;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    Object.assign(mat, { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(hole.cx, hole.cy, L.z);
    m.renderOrder = 1 + i;
    group.add(m);
    animated.push({ m, L, base: m.position.clone() });
  });

  // 3. side walls of the "well" so depth reads even on a still frame
  const wallMat = new THREE.MeshBasicMaterial({ color: 0x05071f, side: THREE.DoubleSide, transparent: true, opacity: .85, depthWrite: false });
  Object.assign(wallMat, { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc });
  const depth = 0.6, hw = hole.w / 2, hh = hole.h / 2;
  [[0, hh, hole.w, depth, [Math.PI / 2, 0, 0]], [0, -hh, hole.w, depth, [Math.PI / 2, 0, 0]],
   [hw, 0, depth, hole.h, [0, Math.PI / 2, 0]], [-hw, 0, depth, hole.h, [0, Math.PI / 2, 0]]].forEach(([x, y, a, b, r], k) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(a, b), wallMat);
    wall.position.set(hole.cx + x, hole.cy + y, -depth / 2);
    wall.rotation.set(...r);
    wall.renderOrder = 0.5;
    group.add(wall);
  });
  return animated;
}

async function start() {
  $('go').disabled = true;
  const video = $('cam');
  if (SIM) {
    const { simStream } = await import('./sim.js');
    video.srcObject = await simStream(SIM, PAGE_IMG);
  } else {
    video.srcObject = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  }
  await video.play();
  await new Promise(r => (video.videoWidth ? r() : (video.onloadedmetadata = r)));
  const vw = video.videoWidth, vh = video.videoHeight;

  // fit the video "cover"-style: size #stage to cover the viewport at the video's aspect
  const stage = $('stage');
  const fit = () => {
    const k = Math.max(innerWidth / vw, innerHeight / vh);
    stage.style.width = vw * k + 'px'; stage.style.height = vh * k + 'px';
  };
  fit(); addEventListener('resize', fit);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, stencil: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(vw, vh, false);
  stage.appendChild(renderer.domElement);
  const camera = new THREE.Camera();
  camera.matrixAutoUpdate = false;
  const sceneGraph = new THREE.Scene();
  const anchor = new THREE.Group();
  anchor.matrixAutoUpdate = false; anchor.visible = false;
  sceneGraph.add(anchor);
  const pageSpace = new THREE.Group();   // converts library marker units → page units
  anchor.add(pageSpace);
  const animated = PAINTING ? [] : buildScene(pageSpace);
  const paintTick = (PAINTING && !VIDEO) ? await buildPainting(pageSpace, scene, BASE) : null;
  const ui = {
    hint: t => { $('hint').querySelector('span').textContent = t; },
    count: (n, total) => { counter.textContent = `🕯 ${n} / ${total}`; counter.style.opacity = 1; },
    finale: () => { counter.textContent = '✨ Храм осветился'; $('hint').classList.add('hide'); },
    reticle: (p, on) => { reticle.style.opacity = on ? 1 : 0; reticle.style.background = `conic-gradient(#ffd75e ${p * 360}deg, #ffffff44 0)`; },
  };
  const lantern = LANTERN && paintTick ? setupLantern({ paint: paintTick, cfg: scene, base: BASE, group: pageSpace, camera, anchor, ui }) : null;
  const vid = VIDEO ? await buildVideo(pageSpace, scene, BASE) : null;

  let markerW = 1, markerH = 1, tracking = false;
  // is the tracked page geometrically believable? (in front of camera, convex, sensible size on screen)
  const wm = new THREE.Matrix4(), P = new THREE.Matrix4(), v4 = new THREE.Vector4();
  const corners = [[-.5, PAGE_H / 2], [.5, PAGE_H / 2], [.5, -PAGE_H / 2], [-.5, -PAGE_H / 2]];
  const plausible = arr => {
    P.fromArray(camera.projectionMatrix.elements); wm.fromArray(arr);
    const pts = [];
    for (const [x, y] of corners) {
      v4.set(x, y, 0, 1).applyMatrix4(wm);
      if (!(v4.z < 0)) return null;                       // behind the camera
      v4.applyMatrix4(P);
      if (!(v4.w > 0)) return null;
      pts.push([v4.x / v4.w, v4.y / v4.w]);
    }
    let area = 0, sign = 0, cx = 0, cy = 0;
    for (let i = 0; i < 4; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % 4], [x3, y3] = pts[(i + 2) % 4];
      area += x1 * y2 - x2 * y1; cx += x1 / 4; cy += y1 / 4;
      const cr = (x2 - x1) * (y3 - y2) - (y2 - y1) * (x3 - x2);
      if (sign && Math.sign(cr) !== sign) return null;     // not convex → twisted/bogus
      sign = Math.sign(cr);
    }
    const frac = Math.abs(area) / 2 / 4;                   // share of the screen (NDC area = 4)
    if (frac < 0.04 || frac > 1.8) return null;
    return { x: cx, y: cy };
  };
  const counter = Object.assign(document.createElement('div'), { id: 'counter' });
  const reticle = Object.assign(document.createElement('div'), { id: 'reticle' });
  document.body.append(counter, reticle);
  const smoother = new PoseSmoother({ validator: plausible });
  const controller = new Controller({
    inputWidth: vw, inputHeight: vh,
    onUpdate: d => {
      if (d.type !== 'updateMatrix') return;
      smoother.push(d.worldMatrix || null, performance.now() / 1000);
      log(`tracking=${smoother.visible(performance.now() / 1000)}\nmarker ${markerW}x${markerH}`);
    },
  });
  camera.projectionMatrix.fromArray(controller.getProjectionMatrix());
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();

  const taar = await (await fetch(TAAR)).arrayBuffer();
  const { dimensions } = await controller.addImageTargetsFromBuffer(taar);
  [markerW, markerH] = dimensions[0];
  // the library's world matrix already treats the marker width as 1 unit
  const ORIGIN = params.get('origin') || 'center';
  if (ORIGIN === 'corner') pageSpace.position.set(-0.5, -PAGE_H / 2, 0);   // library origin at a page corner
  if (params.has('outline')) {                                              // debug: draw the page rectangle
    const o = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_W, PAGE_H), new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true }));
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
    pageSpace.add(o, dot);
  }
  window.__dbg = { smoother, controller, anchor, pageSpace, markerW, markerH, THREE, renderer, sceneGraph, camera };
  // feed the tracker from a canvas copy of the video (more reliable than passing <video> directly)
  const feed = document.createElement('canvas');
  feed.width = vw; feed.height = vh;
  const fg = feed.getContext('2d', { willReadFrequently: true });
  const pump = () => { fg.drawImage(video, 0, 0, vw, vh); requestAnimationFrame(pump); };
  pump();
  video.style.display = 'none';
  stage.insertBefore(feed, renderer.domElement);   // camera image is drawn on this canvas, AR canvas sits above it
  controller.processVideo(feed);

  addEventListener('pointerdown', e => {
    if (!vid || !smoother.visible(performance.now() / 1000)) return;
    const r = renderer.domElement.getBoundingClientRect();
    vid.tap({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, camera);
  });
  const t0 = performance.now();
  let lastNow = t0 / 1000;
  const aim = { x: 0, y: 0 };                        // crosshair = screen centre; mouse overrides it on desktop
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { const r = renderer.domElement.getBoundingClientRect(); aim.x = ((e.clientX - r.left) / r.width) * 2 - 1; aim.y = -((e.clientY - r.top) / r.height) * 2 + 1; } });
  renderer.setAnimationLoop(() => {
    const now = performance.now() / 1000, t = (performance.now() - t0) / 1000;
    const vis = smoother.visible(now);
    if (vis) { anchor.matrix.copy(smoother.step(now)); anchor.visible = true; if (!tracking) { tracking = true; $('hint').classList.add('hide'); vid?.show(); lantern?.show(); } }
    else if (tracking) { tracking = false; vid?.hide(); lantern?.hide(); $('hint').classList.remove('hide'); }
    if (vid) vid.tick(Math.min(0.1, now - lastNow));
    if (lantern) lantern.update(aim, Math.min(0.1, now - lastNow), tracking, t);
    lastNow = now;
    for (const { m, L, base } of animated) {
      if (L.bob) m.position.y = base.y + Math.sin(t * 1.6 + L.z * 9) * L.bob;
      if (L.sway) m.position.x = base.x + Math.sin(t * .8) * L.sway;
      if (L.pulse) m.scale.setScalar(1 + Math.sin(t * 2.2) * 0.025);
    }
    if (paintTick) paintTick(t);
    renderer.render(sceneGraph, camera);
  });
  $('start').remove();
}

$('go').addEventListener('click', () => start().catch(e => { $('go').disabled = false; $('go').textContent = 'Ошибка: ' + e.message; console.error(e); }));
if (params.has('auto')) $('go').click();
