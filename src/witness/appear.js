// The arrival of a figure: the medallion pops in, a column of light rises, a ring of light scans upward and the witness materializes
// from the feet to the head (a moving clipping plane), with golden sparks. Everything lives in the stage's `anchor`, so it follows the
// medallion / the table in AR. Figures without a skeleton (the diorama, the game) only get the light and the pop.
import * as THREE from 'three';

const DUR = 2.5, SCAN0 = 0.55, SCAN1 = 1.95, easeOutBack = x => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }, easeIO = x => x * x * (3 - 2 * x), clamp = x => Math.max(0, Math.min(1, x));
const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

export class Appear {
  constructor(stage, discH, figH) {
    this.st = stage; this.discH = discH; this.top = discH + figH * 1.35; this.t = 99; this.on = false;
    const add = (m, o = 5) => { m.renderOrder = o; m.visible = false; stage.anchor.add(m); return m; };
    const mat = (map, extra = {}) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, ...extra });
    const colTex = tex(128, 256, (x, w, h) => { const g = x.createLinearGradient(0, h, 0, 0); g.addColorStop(0, 'rgba(255,236,170,.6)'); g.addColorStop(.7, 'rgba(255,222,140,.16)'); g.addColorStop(1, 'rgba(255,222,140,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(255,250,225,${.08 + Math.random() * .14})`; x.fillRect(Math.random() * w, 0, 2 + Math.random() * 7, h); } });
    this.col = add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 1.8, 40, 1, true), mat(colTex)));
    this.col.position.y = discH + 0.9;
    const ringTex = tex(256, 256, (x, w) => { const r = x.createRadialGradient(w / 2, w / 2, w * .30, w / 2, w / 2, w * .5); r.addColorStop(0, 'rgba(255,240,190,0)'); r.addColorStop(.5, 'rgba(255,240,190,.95)'); r.addColorStop(1, 'rgba(255,240,190,0)'); x.fillStyle = r; x.fillRect(0, 0, w, w); });
    this.wave = add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat(ringTex))); this.wave.position.y = discH + 0.008;
    this.scan = add(new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.05).rotateX(-Math.PI / 2), mat(ringTex)), 6);
    const dotTex = tex(64, 64, (x) => { const r = x.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,245,200,1)'); r.addColorStop(1, 'rgba(255,200,100,0)'); x.fillStyle = r; x.fillRect(0, 0, 64, 64); });
    const N = 70; this.seed = Array.from({ length: N }, () => ({ a: Math.random() * 6.28, r: .08 + Math.random() * .42, s: .5 + Math.random() * .9, p: Math.random() * 1.6, w: Math.random() * 6 }));
    this.pos = new Float32Array(N * 3); const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.sparks = add(new THREE.Points(geo, new THREE.PointsMaterial({ map: dotTex, size: 0.045, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })), 7); this.sparks.frustumCulled = false;
    this.plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e3); this._n = new THREE.Vector3(); this._p = new THREE.Vector3();
  }
  /** make the figure's materials clippable (done once at load time, so nothing has to be recompiled when the effect starts) */
  prepare(roots) {
    this.st.renderer.localClippingEnabled = true; this.clipped = true;
    for (const root of roots) root?.traverse(o => { if (!o.isMesh) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) { m.clippingPlanes = [this.plane]; m.clipShadows = true; m.needsUpdate = true; } });
  }
  play(cb) { this.t = 0; this.on = true; this.cb = cb; this.fired = false; for (const o of [this.col, this.wave, this.scan, this.sparks]) o.visible = true; this._apply(0); }
  _clipAt(y) { const a = this.st.anchor; a.updateWorldMatrix(true, false); this._n.set(0, -1, 0).transformDirection(a.matrixWorld); this._p.set(0, y, 0); a.localToWorld(this._p); this.plane.setFromNormalAndCoplanarPoint(this._n, this._p); }
  _apply(t) {
    const st = this.st, d = st.disc;
    if (d) { const k = easeOutBack(clamp(t / 0.55)); d.scale.set(Math.max(.001, k), 1, Math.max(.001, k)); }
    const colK = clamp((t - .25) / .5), colFade = 1 - clamp((t - 1.7) / .8);
    this.col.scale.set(1 + Math.sin(t * 7) * .04, easeIO(colK), 1 + Math.sin(t * 7) * .04); this.col.position.y = this.discH + .9 * easeIO(colK); this.col.rotation.y = t * .8; this.col.material.opacity = colFade * (0.3 + 0.4 * Math.sin(Math.min(1, colK) * Math.PI / 2));
    const w = clamp((t - .15) / 1.0); this.wave.scale.setScalar(.5 + w * 2.2); this.wave.material.opacity = (1 - w) * (w > 0 ? 1 : 0);
    const sk = clamp((t - SCAN0) / (SCAN1 - SCAN0)), y = this.discH - .02 + (this.top - this.discH) * easeIO(sk);
    if (this.clipped) this._clipAt(t >= SCAN1 ? 1e3 : y); this.scan.position.y = y; this.scan.scale.setScalar(.9 + .1 * Math.sin(t * 20)); this.scan.material.opacity = t < SCAN0 ? 0 : t > SCAN1 ? Math.max(0, 1 - (t - SCAN1) / .35) : 1;
    const P = this.pos; this.seed.forEach((s, i) => { const u = (t * s.s + s.p) % 1.6, a = s.a + t * .9; P[i * 3] = Math.cos(a) * s.r * (1 - u / 3); P[i * 3 + 1] = this.discH + u * (this.top - this.discH) * .85; P[i * 3 + 2] = Math.sin(a) * s.r * (1 - u / 3); });
    this.sparks.geometry.attributes.position.needsUpdate = true; this.sparks.material.opacity = clamp(1 - (t - 1.8) / .7) * clamp(t / .3);
  }
  update(dt) {
    if (!this.on) return; this.t += dt; this._apply(this.t);
    if (!this.fired && this.t >= SCAN1 + .05) { this.fired = true; this.cb?.(); }
    if (this.t >= DUR) { this.on = false; for (const o of [this.col, this.wave, this.scan, this.sparks]) o.visible = false; if (this.clipped) { this.plane.normal.set(0, -1, 0); this.plane.constant = 1e3; } if (this.st.disc) this.st.disc.scale.set(1, 1, 1); }
  }
}
