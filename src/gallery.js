import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const ITEMS = [['wiseman', 'Волхв'], ['shepherd', 'Пастух (мальчик)'], ['gingerbread', 'Пряничек'], ['gabriel-talk', 'Архангел Гавриил'], ['camel-a', 'Верблюд A'], ['camel-b', 'Верблюд B'], ['camel-plate', 'Верблюд на площадке'], ['disney-a', 'Disney A'], ['model', 'model.glb']];
const grid = document.getElementById('grid'), canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setScissorTest(true);
const loader = new GLTFLoader(); const cells = [], clock = new THREE.Clock();
for (const [file, label] of ITEMS) {
  const el = document.createElement('div'); el.className = 'cell'; el.innerHTML = `<span>${label}</span>`; grid.appendChild(el);
  const scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight(0xffffff, 0x554433, 1.4)); const l = new THREE.DirectionalLight(0xffe6c0, 2.2); l.position.set(2, 3, 3); scene.add(l);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.01, 100); const cell = { el, scene, cam, root: new THREE.Group(), mixer: null }; scene.add(cell.root); cells.push(cell);
  loader.loadAsync(`/models/${file}.glb`).then(g => {
    const m = g.scene; const box = new THREE.Box3().setFromObject(m), s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const k = 1.6 / Math.max(s.x, s.y, s.z); m.scale.setScalar(k); m.position.sub(c.multiplyScalar(k)); m.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
    cell.root.add(m); cam.position.set(0, 0.15, 3.6);
    if (g.animations.length) { const clip = g.animations.find(a => /Idle_02|Idle_11|Idle/.test(a.name)) || g.animations[0]; cell.mixer = new THREE.AnimationMixer(m); cell.mixer.clipAction(clip).play(); }
  }).catch(e => { el.innerHTML += '<br>не загрузилась'; console.error(file, e); });
}
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta(), t = clock.elapsedTime;
  renderer.setSize(innerWidth, innerHeight, false); renderer.setClearColor(0, 0); renderer.setScissor(0, 0, innerWidth, innerHeight); renderer.clear();
  for (const c of cells) {
    const r = c.el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) continue;
    c.mixer?.update(dt); c.root.rotation.y = t * 0.6;
    const y = innerHeight - r.bottom; renderer.setViewport(r.left, y, r.width, r.height); renderer.setScissor(r.left, y, r.width, r.height);
    c.cam.aspect = r.width / r.height; c.cam.updateProjectionMatrix(); c.cam.lookAt(0, 0, 0); renderer.render(c.scene, c.cam);
  }
});
