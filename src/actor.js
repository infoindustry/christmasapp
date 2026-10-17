// Animation by code: no Meshy clips. We pose the standard humanoid skeleton ourselves.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('c'), hud = document.getElementById('hud');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x15122a); scene.fog = new THREE.Fog(0x15122a, 6, 14);
const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 50);
scene.add(new THREE.HemisphereLight(0xcfd8ff, 0x3a2a1a, 1.1));
const key = new THREE.DirectionalLight(0xffe2b0, 2.4); key.position.set(2, 4, 3); scene.add(key);
const floor = new THREE.Mesh(new THREE.CircleGeometry(3, 48), new THREE.MeshStandardMaterial({ color: 0x2b2447, roughness: .9 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);

const gltf = await new GLTFLoader().loadAsync('/models/wiseman.glb');
const model = gltf.scene; scene.add(model);
const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3());
const k = 1.7 / size.y; model.scale.setScalar(k); model.position.y -= box.min.y * k;   // ~1.7 m tall
model.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
const bones = {}; model.traverse(o => { if (o.isBone) bones[o.name] = o; });
const rest = Object.fromEntries(Object.entries(bones).map(([n, b]) => [n, b.quaternion.clone()]));
const hipsY = bones.Hips.position.clone();

const controls = new OrbitControls(camera, canvas);
camera.position.set(0.9, 1.35, 3.1); controls.target.set(0, 0.95, 0); controls.update();
const fit = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
fit(); addEventListener('resize', fit);

// --- the "clip": key poses in degrees, bone-local Euler (x,y,z); everything between is eased ---
const D = Math.PI / 180;
// axes found by measurement: arm X = lower(+)/raise(-), arm Z = forward (left +, right −); forearm Z bends up (left +, right −); spine X+ = bow forward; head X− = look up
const BASE = { LeftArm: [80, 0, 4], RightArm: [80, 0, -4], LeftForeArm: [0, 0, 8], RightForeArm: [0, 0, -8] };
const HANDS_CHEST = { LeftArm: [52, 0, 48], LeftForeArm: [0, 0, 105], RightArm: [52, 0, -48], RightForeArm: [0, 0, -105] };
const KEYS = [
  { t: 0,    p: { Head: [0, 0, 0] } },
  { t: 1.8,  p: { Head: [-3, -8, 0], Spine01: [-2, 0, 0] } },                                                       // calm, glances aside
  { t: 3.0,  p: { Head: [-30, 10, 0], Neck: [-10, 6, 0], Spine: [-4, 0, 0], Spine01: [-5, 0, 0], LeftArm: [78, 0, 6], RightArm: [70, 0, -6] } },  // notices the star
  { t: 4.4,  p: { Head: [-32, 10, 0], Neck: [-12, 6, 0], Spine: [-6, 0, 0], Spine01: [-6, 0, 0], RightArm: [-48, 0, -30], RightForeArm: [0, 0, -12], LeftArm: [72, 0, 14] } }, // points up
  { t: 6.0,  p: { Head: [-30, 10, 0], Neck: [-10, 6, 0], Spine: [-5, 0, 0], RightArm: [-52, 0, -32], RightForeArm: [0, 0, -10], LeftArm: [60, 0, 40], LeftForeArm: [0, 0, 80] } },
  { t: 7.4,  p: { Head: [-6, 0, 0], ...HANDS_CHEST } },                                                              // hands to heart
  { t: 8.8,  p: { Head: [28, 0, 0], Neck: [10, 0, 0], Spine: [24, 0, 0], Spine01: [22, 0, 0], Spine02: [10, 0, 0], ...HANDS_CHEST } },  // bow
  { t: 9.8,  p: { Head: [28, 0, 0], Neck: [10, 0, 0], Spine: [24, 0, 0], Spine01: [22, 0, 0], Spine02: [10, 0, 0], ...HANDS_CHEST } },  // hold
  { t: 11.2, p: { Head: [-4, 0, 0], ...HANDS_CHEST } },                                                              // rise
  { t: 12,   p: { Head: [0, 0, 0] } },
];
const ease = x => x * x * (3 - 2 * x);
const eul = new THREE.Euler(), q = new THREE.Quaternion();
function pose(t) {
  let a = KEYS[0], b = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) if (t >= KEYS[i].t && t <= KEYS[i + 1].t) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  const f = ease((t - a.t) / Math.max(1e-6, b.t - a.t));
  for (const n of Object.keys(bones)) {
    const A = a.p[n] || BASE[n] || [0, 0, 0], B = b.p[n] || BASE[n] || [0, 0, 0];
    eul.set((A[0] + (B[0] - A[0]) * f) * D, (A[1] + (B[1] - A[1]) * f) * D, (A[2] + (B[2] - A[2]) * f) * D, 'XYZ');
    bones[n].quaternion.copy(rest[n]).multiply(q.setFromEuler(eul));
  }
  for (const [n, e] of Object.entries(override)) bones[n].quaternion.copy(rest[n]).multiply(q.setFromEuler(eul.set(e[0] * D, e[1] * D, e[2] * D, 'XYZ')));
  // life: breathing + slight weight shift, never perfectly still
  const s = performance.now() / 1000;
  bones.Spine01.rotateX(Math.sin(s * 1.7) * 0.012); bones.Spine.rotateZ(Math.sin(s * 0.9) * 0.01);
  bones.Hips.position.y = hipsY.y + Math.sin(s * 1.7) * 0.0015 / k * 0 ;
}

let t0 = performance.now(), manual = null;
const override = {};
window.__actor = { bones, setManual: v => { manual = v; }, set: (n, x, y, z) => { override[n] = [x, y, z]; }, clear: () => { for (const k in override) delete override[k]; } };
renderer.setAnimationLoop(() => {
  const t = manual != null ? manual : ((performance.now() - t0) / 1000) % 12;
  pose(t); hud.textContent = `Волхв · анимация кодом · t=${t.toFixed(1)}с\nкрутить мышью / пальцем`;
  controls.update(); renderer.render(scene, camera);
});
