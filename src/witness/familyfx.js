// The Holy Family: Mary, Joseph and the Baby in the manger. A warm glow around the Baby, golden motes rising, the star above; tap a person to hear them.
import * as THREE from 'three';

export const SPOTS = { baby: [0.0, -0.09, 0.53], mary: [-0.25, 0.1, 0.2], joseph: [0.2, 0.35, 0.05] };
const rnd = (a, b) => a + Math.random() * (b - a);
const sprite = (draw, size = 128) => { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const glowTex = sprite((x, s) => { const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); });
const rayTex = sprite((x, s) => { x.translate(s / 2, s / 2); const g = x.createRadialGradient(0, 0, 0, 0, 0, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; for (let i = 0; i < 8; i++) { x.save(); x.rotate(i * Math.PI / 4); x.beginPath(); x.moveTo(-s * 0.025, 0); x.lineTo(0, -s / 2); x.lineTo(s * 0.025, 0); x.fill(); x.restore(); } }, 256);
const mk = (map, color, size, op = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op })); s.scale.setScalar(size); return s; };

export async function buildFamily(loader) {
  const gltf = await loader.loadAsync('family/family.glb'); const model = gltf.scene; let mesh; model.traverse(o => { if (o.isMesh) mesh = o; });
  const mat = mesh.material; mat.emissive = new THREE.Color(0xffffff); mat.emissiveMap = mat.map; mat.emissiveIntensity = 0.28; mat.roughness = 0.9; mat.metalness = 0; mesh.frustumCulled = false; mesh.castShadow = true;
  const group = new THREE.Group(); group.add(model); const fx = new THREE.Group(); group.add(fx);
  const S = { boost: 0, choir: 0, glowK: 1 };
  // the Baby's glow (the light of the world): a soft halo and a warm light
  const halo = mk(glowTex, 0xffd98a, 0.9, 0.5); halo.position.set(0, -0.02, 0.62); fx.add(halo);
  const core = mk(glowTex, 0xfff3c8, 0.34, 0.6); core.position.set(0, -0.08, 0.6); fx.add(core);
  const light = new THREE.PointLight(0xffc878, 1.1, 2.2, 1.6); light.position.set(0, 0.05, 0.9); fx.add(light);
  // the star above, with a soft beam down to the Baby
  const sp = new THREE.Vector3(0.02, 1.12, 0.28), star = mk(glowTex, 0xfff2b0, 0.3, 0.9), rays = mk(rayTex, 0xffe9a0, 0.58, 0.75), sc = mk(glowTex, 0xffffff, 0.11, 1); for (const o of [star, rays, sc]) { o.position.copy(sp); fx.add(o); }
  const beamTex = sprite((x, s) => { const gr = x.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, 'rgba(255,240,170,.85)'); gr.addColorStop(1, 'rgba(255,240,170,0)'); x.fillStyle = gr; x.fillRect(0, 0, s, s); const gx = x.createLinearGradient(0, 0, s, 0); gx.addColorStop(0, '#0000'); gx.addColorStop(.5, '#000'); gx.addColorStop(1, '#0000'); x.globalCompositeOperation = 'destination-in'; x.fillStyle = gx; x.fillRect(0, 0, s, s); }, 128);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.14, 0.95, 24, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.28 })); beam.position.set(0.02, 0.65, 0.4); beam.rotation.x = 0.28; fx.add(beam);
  // golden motes rising
  const N = 70, pos = new Float32Array(N * 3), seed = Array.from({ length: N }, () => ({ a: Math.random() * 6.283, r: rnd(0.1, 0.55), y: rnd(-0.3, 1.0), v: rnd(0.04, 0.12), ph: Math.random() * 6 }));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const motes = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, color: 0xffe08a, size: 0.032, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending })); motes.frustumCulled = false; fx.add(motes);
  function update(t, dt) {
    S.boost = Math.max(0, S.boost - dt * 0.7); S.choir = Math.max(0, S.choir - dt * 0.12); const k = 1 + S.boost * 0.9 + S.choir * 0.5, pulse = 1 + Math.sin(t * 1.8) * 0.05;
    halo.material.opacity = (0.45 + Math.sin(t * 1.8) * 0.06) * k; halo.scale.setScalar(0.9 * k * pulse); core.material.opacity = 0.55 * k; light.intensity = 1.1 * k; mat.emissiveIntensity = 0.28 + S.boost * 0.12 + S.choir * 0.08;
    star.scale.setScalar(0.3 * (1 + S.choir * 0.4) * pulse); rays.scale.setScalar(0.58 * (1 + S.choir * 0.5) * pulse); rays.material.rotation = t * 0.1; rays.material.opacity = 0.6 + S.choir * 0.4; beam.material.opacity = 0.24 + S.choir * 0.3 + S.boost * 0.12;
    for (let i = 0; i < N; i++) { const s = seed[i]; s.y += s.v * dt * (1 + S.choir); if (s.y > 1.05) s.y = -0.3; const rr = s.r + Math.sin(t * 0.6 + s.ph) * 0.03; pos[i * 3] = Math.cos(s.a + t * 0.05) * rr; pos[i * 3 + 1] = s.y; pos[i * 3 + 2] = Math.sin(s.a + t * 0.05) * rr * 0.8 + 0.2; }
    g.attributes.position.needsUpdate = true;
  }
  return {
    group, model, update, S,
    glow() { S.boost = 1.2; },
    sing() { S.choir = 1.6; },
    // which person did the finger touch? (model-local point)
    who(p) { if (Math.hypot(p.x - SPOTS.baby[0], p.y - SPOTS.baby[1], (p.z - SPOTS.baby[2]) * 0.7) < 0.3 || (p.y < 0.0 && p.z > 0.4 && Math.abs(p.x) < 0.3)) return 'baby'; return p.x < -0.02 ? 'mary' : 'joseph'; },
  };
}
