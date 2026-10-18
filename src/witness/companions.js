// Animal companions that stand on the medallion next to a witness. They are Meshy quadrupeds (27 bones: head, ears, tail),
// animated from code: breathing, ear flicks, tail wag, a glance at the speaker. Add a file + one line here to add a new one.
import * as THREE from 'three';

export const COMPANIONS = {
  shepherd: [{ name: 'овечка', sound: 'sheep', file: 'animals/sheep.glb', height: 0.36, pos: [0.30, 0.20], yaw: -0.75, ears: 0.7, tail: 0.6 }],
  joseph:   [{ name: 'ослик', sound: 'donkey', file: 'animals/donkey.glb', height: 1.0, pos: [-0.68, 0.06], yaw: 0.95, ears: 1.0, tail: 0.5, onPage: true }]  /* rideable size; stands on the page beside the disc */,
  wiseman:  [{ name: 'верблюд', sound: 'camel', file: 'animals/camel.glb', height: 1.25, pos: [1.0, 0.0], narrow: [0.62, -0.75], yaw: -1.0, ears: 0.35, tail: 0.3, onPage: true }],   // full-size camel standing on the page beside the disc
};

class Companion {
  constructor(cfg, root, bones) {
    Object.assign(this, { cfg, root, bones, hop: 0, startle: 0, phase: Math.random() * 9, flick: 0, nextFlick: 1 + Math.random() * 3 });
    this.restQ = Object.fromEntries(Object.entries(bones).map(([n, b]) => [n, b.quaternion.clone()]));
  }
  /** a tap: the animal startles a little, flicks its ears and hops */
  react() { this.flick = 1; this.hop = 1; this.startle = 1; }
  pos() { return (this.narrow && this.cfg.narrow) || this.cfg.pos; }
  layout(narrow) { this.narrow = narrow; const p = this.pos(); this.root.position.set(p[0], this.cfg.onPage ? 0 : this.discTop, p[1]); }
  /** t seconds, dt step, speaking 0..1, intensity of the speaker's delivery, camera position (to look toward the viewer) */
  update(t, dt, speaking, intensity, cam) {
    const c = this.cfg, B = this.bones, p = this.phase, k = Math.min(1, dt * 2.5);
    if (this.hop > 0) { this.hop = Math.max(0, this.hop - dt * 2.2); this.root.position.y = (c.onPage ? 0 : this.discTop) + Math.sin((1 - this.hop) * Math.PI) * 0.06 * (c.height > 0.7 ? 0.6 : 1); } else this.root.position.y = c.onPage ? 0 : (this.discTop ?? this.root.position.y);
    if (this.startle > 0) this.startle = Math.max(0, this.startle - dt * 1.5);
    // body turns partly toward the viewer, keeps its own angle
    const want = c.yaw + Math.atan2(cam.x, cam.z) * 0.55; let d = want - this.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); this.root.rotation.y += d * k;
    // reset to the rest pose, then layer motion on top (so nothing accumulates)
    for (const [n, b] of Object.entries(B)) b.quaternion.copy(this.restQ[n]);
    const sp = speaking * Math.min(1.5, intensity);
    if (B.chest) B.chest.rotateX(Math.sin(t * 1.9 + p) * 0.012);
    if (B.Hips) B.Hips.rotateY(Math.sin(t * 0.6 + p) * 0.012);
    if (B.head) { B.head.rotateY(Math.sin(t * 0.5 + p) * 0.18 - sp * 0.2 + Math.sin(this.startle * 9) * 0.3 * this.startle); B.head.rotateX(Math.sin(t * 0.7 + p) * 0.07 + Math.sin(t * 2.2) * 0.05 * sp); }
    // ears twitch at random, more when the speaker is lively
    this.nextFlick -= dt; if (this.nextFlick <= 0) { this.flick = 1; this.nextFlick = (2 + Math.random() * 4) / (0.6 + sp); }
    this.flick = Math.max(0, this.flick - dt * 4); const f = Math.sin(this.flick * Math.PI) * c.ears;
    if (B.earend) { B.earend.rotateZ(f * 0.7); B.earend.rotateX(Math.sin(t * 3 + p) * 0.04 * c.ears); }
    if (B.R_earend) { B.R_earend.rotateZ(-f * 0.6); B.R_earend.rotateX(Math.sin(t * 2.6 + p) * 0.04 * c.ears); }
    // tail wag
    for (const [i, n] of ['tailstart', 'tail1', 'tail2', 'tail3'].entries()) if (B[n]) B[n].rotateY(Math.sin(t * (2.4 + sp * 2) + i * 0.8 + p) * (0.12 + sp * 0.12) * c.tail);
  }
}

export async function loadCompanions(witnessId, anchor, discTop, loader) {
  const out = [];
  for (const cfg of COMPANIONS[witnessId] || []) {
    try {
      if (cfg.optional) { const h = await fetch(cfg.file, { method: 'HEAD' }); if (!h.ok || /text\/html/.test(h.headers.get('content-type') || '')) continue; }
      const gltf = await loader.loadAsync(cfg.file);
      const root = new THREE.Group(); root.add(gltf.scene); anchor.add(root);
      const b = new THREE.Box3().setFromObject(gltf.scene), s = b.getSize(new THREE.Vector3()), k = cfg.height / s.y; gltf.scene.scale.setScalar(k);
      const b2 = new THREE.Box3().setFromObject(gltf.scene), c = b2.getCenter(new THREE.Vector3()); gltf.scene.position.set(-c.x, -b2.min.y, -c.z);
      root.position.set(cfg.pos[0], cfg.onPage ? 0 : discTop, cfg.pos[1]); root.rotation.y = cfg.yaw;
      const bones = {}; gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } if (o.isBone) bones[o.name] = o; });
      const comp = new Companion(cfg, root, bones); comp.discTop = discTop; out.push(comp);
    } catch (e) { console.warn('companion skipped:', cfg.name, e.message); }
  }
  return out;
}
