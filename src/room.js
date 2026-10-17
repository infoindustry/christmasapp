import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, 0.05, 50);
camera.position.set(0, 1.2, 3.2);
const controls = new OrbitControls(camera, canvas); controls.target.set(0, 0, 0); controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xffffff, 0x886644, 1.4));
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await loader.loadAsync('/room/room.glb'); const room = gltf.scene; scene.add(room);
const resize = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }; resize(); addEventListener('resize', resize);
// probe: click the model to read the local coordinates (to place the fire, the lights ...)
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
canvas.addEventListener('click', e => { ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); const h = ray.intersectObject(room, true)[0]; if (h) document.getElementById('probe').textContent = h.point.toArray().map(v => v.toFixed(3)).join(', '); });
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
window.__r = { scene, camera, room, controls, THREE };
