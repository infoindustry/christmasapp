// "Cinema on the page": the illustration as a living relief, a slow camera, light that breathes — and the real narration.
import * as THREE from 'three';
import { buildPainting } from './painting.js';

const BASE = '/scenes/zakhariya';
const cfg = await fetch(`${BASE}/painting.json`).then(r => r.json());
const PH = cfg.page.h / cfg.page.w;

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, stencil: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x07060c);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
const group = new THREE.Group(); scene.add(group);
const tick = await buildPainting(group, cfg, BASE);

const fit = () => {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  // distance so the whole page is visible (fit by height or width, whichever is tighter), with a small margin
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  camera.userData.dist = Math.max(PH / 2 / t, 0.5 / (t * camera.aspect)) * 1.04;
  camera.updateProjectionMatrix();
};
fit(); addEventListener('resize', fit);

// look-around input: mouse on desktop, tilt on phones
const look = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', e => { look.tx = (e.clientX / innerWidth - .5) * 2; look.ty = (e.clientY / innerHeight - .5) * 2; });
let tiltBase = null;
addEventListener('deviceorientation', e => {
  if (e.gamma == null) return;
  tiltBase ??= { g: e.gamma, b: e.beta };
  look.tx = THREE.MathUtils.clamp((e.gamma - tiltBase.g) / 25, -1, 1);
  look.ty = THREE.MathUtils.clamp((e.beta - tiltBase.b) / 25, -1, 1);
});

const audio = Object.assign(new Audio(`${BASE}/story.mp3`), { preload: 'auto' });
const bar = document.getElementById('bar');
let started = false, t0 = 0;

function frame(now) {
  const t = now / 1000;
  const play = started ? (audio.currentTime || 0) : t * 0.5;          // slow idle drift before start
  look.x += (look.tx - look.x) * 0.06; look.y += (look.ty - look.y) * 0.06;
  const d = camera.userData.dist;
  const push = started ? Math.min(1, play / 150) * 0.12 : 0;           // slow push-in while the story is told
  const drift = 0.5 + 0.5 * Math.sin(play * 0.22);
  camera.position.set(look.x * 0.16 + Math.sin(play * 0.17) * 0.035, -look.y * 0.1 + Math.cos(play * 0.13) * 0.02, d * (1 - push));
  camera.lookAt(look.x * 0.02, 0, -cfg.relief * 0.4);
  tick(t);
  renderer.render(scene, camera);
  if (started && audio.duration) bar.style.width = (audio.currentTime / audio.duration * 100) + '%';
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

document.getElementById('go').addEventListener('click', async () => {
  document.getElementById('start').remove();
  if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) { try { await DeviceOrientationEvent.requestPermission(); } catch {} }
  started = true; audio.play().catch(() => {});
  setTimeout(() => document.getElementById('title').classList.add('on'), 600);
  setTimeout(() => document.getElementById('title').classList.remove('on'), 7000);
});
addEventListener('click', e => { if (started && e.target === canvas) audio.paused ? audio.play() : audio.pause(); });
