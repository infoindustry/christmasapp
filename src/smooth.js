// Pose smoothing (One Euro style): heavy smoothing when the page is still, light when it moves.
import * as THREE from 'three';

const alphaFor = (cutoff, dt) => { const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt); };

export class PoseSmoother {
  constructor({ posMin = 0.9, posBeta = 10, rotMin = 0.9, rotBeta = 4, lostGrace = 0.45, validator = null, need = 8, rotGate = 0, gateNeed = 6 } = {}) {
    Object.assign(this, { posMin, posBeta, rotMin, rotBeta, lostGrace, validator, need, rotGate, gateNeed });
    this.streak = 0; this.gate = 0; this.lastC = null;
    this.pos = new THREE.Vector3(); this.quat = new THREE.Quaternion(); this.scale = new THREE.Vector3(1, 1, 1);
    this.tp = new THREE.Vector3(); this.tq = new THREE.Quaternion(); this.ts = new THREE.Vector3();
    this.tm = new THREE.Matrix4(); this.out = new THREE.Matrix4();
    this.has = false; this.fresh = false; this.lastSeen = -1e9; this.last = 0;
  }
  /** raw 4x4 column-major matrix from the tracker, or null when the page is lost */
  push(arr, now) {
    // reject false detections: geometry must be plausible and stay put for `need` consecutive updates
    const c = arr && this.validator ? this.validator(arr) : (arr ? { x: 0, y: 0 } : null);
    if (!c) { this.streak = 0; this.lastC = null; return; }
    if (this.lastC && Math.hypot(c.x - this.lastC.x, c.y - this.lastC.y) > 0.35) this.streak = 0;
    this.lastC = c;
    if (++this.streak < this.need && !this.has) return;
    this.tm.fromArray(arr).decompose(this.tp, this.tq, this.ts);
    // a flat marker's turn is read noisily (it can flip by tens of degrees between frames): a measurement far from the current pose is believed only when it persists
    if (this.rotGate && this.has && 2 * Math.acos(Math.min(1, Math.abs(this.quat.dot(this.tq)))) * 57.2958 > this.rotGate) { if (++this.gate < this.gateNeed) { this.lastSeen = now; return; } }
    this.gate = 0;
    this.lastSeen = now; this.fresh = true;
    if (!this.has) { this.pos.copy(this.tp); this.quat.copy(this.tq); this.scale.copy(this.ts); this.has = true; }
  }
  visible(now) { return this.has && now - this.lastSeen < this.lostGrace; }
  /** call every frame; returns the smoothed matrix */
  step(now) {
    const dt = Math.max(1e-3, Math.min(0.1, now - this.last)); this.last = now;
    if (this.has && this.fresh) {
      const unit = this.scale.x || 1;                                   // 1 unit = page width
      const speed = this.pos.distanceTo(this.tp) / unit / dt;           // page widths / s
      const ap = alphaFor(this.posMin + this.posBeta * speed, dt);
      this.pos.lerp(this.tp, ap);
      const ang = 2 * Math.acos(Math.min(1, Math.abs(this.quat.dot(this.tq)))) / dt;  // rad / s
      this.quat.slerp(this.tq, alphaFor(this.rotMin + this.rotBeta * ang, dt));
      this.scale.lerp(this.ts, ap);
    }
    return this.out.compose(this.pos, this.quat, this.scale);
  }
}
