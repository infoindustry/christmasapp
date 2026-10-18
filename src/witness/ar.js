// Augmented-reality modes for the witness stage.
//   marker  — the real camera; the witness stands on the printed medallion (Locus AR image tracking, all ten medallions in one file)
//   surface — the real camera; tap a table / floor / page: WebXR hit-test where the browser has it (Android Chrome),
//             otherwise the gyroscope (iPhone): the witness is put down on an assumed floor in front of you and stays there
import * as THREE from 'three';
import { Controller } from 'locus-ar';
import { PoseSmoother } from '../smooth.js';

const $ = id => document.getElementById(id);
const DEG = Math.PI / 180;

export class AR {
  constructor(stage, witnessId, ui) {
    this.stage = stage; this.id = witnessId; this.ui = ui; this.kind = null; this.cleanup = [];
    this.video = $('cam');
  }

  static async support() {
    const cam = !!navigator.mediaDevices?.getUserMedia;
    let xr = false; try { xr = !!(navigator.xr && await Promise.race([navigator.xr.isSessionSupported('immersive-ar'), new Promise(r => setTimeout(() => r(false), 1500))])); } catch (e) {}
    const gyro = typeof DeviceOrientationEvent !== 'undefined';
    return { marker: cam, surface: xr || (cam && gyro), xr };
  }

  async stop() {
    for (const f of this.cleanup.splice(0).reverse()) { try { await f(); } catch (e) {} }
    const s = this.stage; s.onFrame = null; this.kind = null;
    if (this.video.srcObject) { this.video.srcObject.getTracks().forEach(t => t.stop()); this.video.srcObject = null; }
    this.video.hidden = true; s.setAR(false);
  }

  async _camera() {
    const v = this.video;
    const sim = new URLSearchParams(location.search).get('sim');   // desktop testing: a fake camera that "sees" this witness's medallion
    if (sim) { const { simStream } = await import('../sim.js'); v.srcObject = await simStream(sim, new URLSearchParams(location.search).get('simimg') || `medallions/${this.id}.png`); }
    else v.srcObject = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
    v.hidden = false; await v.play(); await new Promise(r => (v.videoWidth ? r() : (v.onloadedmetadata = r)));
    return v;
  }

  /* ------------------------------------------------------------------ marker */
  async startMarker() {
    const s = this.stage, v = await this._camera(), vw = v.videoWidth, vh = v.videoHeight;
    this.kind = 'marker'; s.setAR(true);
    if (s.disc) s.disc.visible = false;   // the printed medallion itself is the pedestal
    // the camera image is the video element (CSS cover); the canvas is cropped the same way so the tracker's projection lines up
    s.arView = { vw, vh }; s.resize();
    s.controls.enabled = false;
    s.camera.matrixAutoUpdate = false; s.camera.matrix.identity(); s.camera.matrixWorld.identity();
    s.arRoot.matrixAutoUpdate = false; s.arRoot.visible = false;
    s.anchor.rotation.set(Math.PI / 2, 0, 0);   // the stage's up (y) becomes the page's normal (+z, out of the paper)

    const taar = new URLSearchParams(location.search).get('taar'), mine = 0;   // each witness has its own small tracking file (?taar= : test with another one)
    const P = new THREE.Matrix4(), wm = new THREE.Matrix4(), v4 = new THREE.Vector4();
    const corners = [[-.5, .5], [.5, .5], [.5, -.5], [-.5, -.5]];
    const plausible = arr => {   // geometry of the found medallion must be believable: in front of the camera, convex, a sensible size
      P.fromArray(s.camera.projectionMatrix.elements); wm.fromArray(arr); const pts = [];
      for (const [x, y] of corners) { v4.set(x, y, 0, 1).applyMatrix4(wm); if (!(v4.z < 0)) return null; v4.applyMatrix4(P); if (!(v4.w > 0)) return null; pts.push([v4.x / v4.w, v4.y / v4.w]); }
      let area = 0, sign = 0, cx = 0, cy = 0;
      for (let i = 0; i < 4; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % 4], [x3, y3] = pts[(i + 2) % 4]; area += x1 * y2 - x2 * y1; cx += x1 / 4; cy += y1 / 4; const cr = (x2 - x1) * (y3 - y2) - (y2 - y1) * (x3 - x2); if (sign && Math.sign(cr) !== sign) return null; sign = Math.sign(cr); }
      const frac = Math.abs(area) / 2 / 4; if (frac < 0.01 || frac > 1.8) return null; return { x: cx, y: cy };
    };
    this.dbg = { updates: 0, found: 0 }; const smoother = new PoseSmoother({ validator: plausible }); this.dbg.smoother = smoother;
    const controller = new Controller({
      inputWidth: vw, inputHeight: vh,
      onUpdate: d => {
        if (d.type !== 'updateMatrix') return;
        const now = performance.now() / 1000; this.dbg.updates++; if (d.worldMatrix) { this.dbg.found++; this.dbg.last = Array.from(d.worldMatrix); this.dbg.idx = d.targetIndex; this.dbg.plaus = !!plausible(d.worldMatrix); }
        smoother.push(d.worldMatrix && (d.targetIndex === undefined || d.targetIndex === mine) ? d.worldMatrix : null, now);
      },
    });
    s.camera.projectionMatrix.fromArray(controller.getProjectionMatrix()); s.camera.projectionMatrixInverse.copy(s.camera.projectionMatrix).invert();
    await controller.addImageTargetsFromBuffer(await (await fetch(taar || `targets/${this.id}.taar`)).arrayBuffer());

    const feed = document.createElement('canvas'); feed.width = vw; feed.height = vh;
    const fg = feed.getContext('2d', { willReadFrequently: true });
    let pumping = true; const pump = () => { if (!pumping) return; fg.drawImage(v, 0, 0, vw, vh); requestAnimationFrame(pump); }; pump();
    controller.processVideo(feed);
    this.cleanup.push(() => { pumping = false; controller.dispose?.(); controller.stopProcessVideo?.(); });

    let shown = false; this.ui.hint('Наведи камеру на этот кружок в журнале. Он должен быть виден весь', 0, 5000);
    s.onFrame = () => {
      const now = performance.now() / 1000;
      if (smoother.visible(now)) { s.arRoot.matrix.copy(smoother.step(now)); s.arRoot.matrixWorldNeedsUpdate = true; s.arRoot.visible = true; if (!shown) { shown = true; this.ui.hint(''); } }
      else if (shown) { shown = false; s.arRoot.visible = false; this.ui.hint('Медальон потерялся — наведи снова'); }
    };
  }

  /* ----------------------------------------------------------------- surface */
  async startSurface() {
    const xr = (await AR.support()).xr; if (this.stage.gameFx && !xr) throw new Error('the game needs real surface tracking (WebXR)');   // no plane tracking on this phone: no AR for the game
    return xr ? this._xr() : this._gyro();
  }

  async _xr() {
    const s = this.stage, r = s.renderer; this.kind = 'xr'; s.setAR(true); s.controls.enabled = false;
    s.arRoot.visible = false; const game = s.gameFx, SCALE = game ? 0.8 : 0.4; s.arRoot.scale.setScalar(SCALE);   // the game: no plate, the whole table is the playground
    if (game) { s.disc.visible = false; game.setArena(0.88); }   // 0.88 local units * 0.8 = a 70 cm radius around the first tap
    r.xr.enabled = true; r.xr.setReferenceSpaceType('local');
    const session = await navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay'], domOverlay: { root: document.body } });
    await r.xr.setSession(session);
    const viewer = await session.requestReferenceSpace('viewer'), src = await session.requestHitTestSource({ space: viewer });
    const ref = r.xr.getReferenceSpace();
    const ret = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.08, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe8c46a })); ret.matrixAutoUpdate = false; ret.visible = false; s.scene.add(ret);
    let placed = false, last = null; this.ui.hint(game ? 'Наведи на стол и коснись, чтобы поставить пряничка' : 'Наведи на стол или пол и коснись экрана');
    // taps on the page UI (buttons, panel) must not count as taps on the table
    for (const sel of ['#panel', '#modes', '#back', '#head', '#hud']) document.querySelector(sel)?.addEventListener('beforexrselect', ev => ev.preventDefault());
    const ray = new THREE.Raycaster(), tmpM = new THREE.Matrix4(), O = new THREE.Vector3(), D = new THREE.Vector3(), P = new THREE.Vector3();
    session.addEventListener('select', e => {
      if (!placed) {   // the first tap puts the world on the table; after that the world stays where it is
        if (!last) return; s.arRoot.matrixAutoUpdate = false; s.arRoot.matrix.copy(last).multiply(new THREE.Matrix4().makeScale(SCALE, SCALE, SCALE)); s.arRoot.matrixWorldNeedsUpdate = true; s.arRoot.visible = true; placed = true; ret.visible = false; this.ui.hint(''); return;
      }
      if (!game || !e.frame) return;   // the game: a tap sends the gingerbread there (or makes him jump if you touch him)
      const pose = e.frame.getPose(e.inputSource.targetRaySpace, ref); if (!pose) return;
      tmpM.fromArray(pose.transform.matrix); O.setFromMatrixPosition(tmpM); D.set(0, 0, -1).transformDirection(tmpM);
      ray.set(O, D); const hit = ray.intersectObject(game.model, true)[0]; if (hit) { game.tap(hit.point, hit.object); return; }
      const y = P.setFromMatrixPosition(s.arRoot.matrixWorld).y; if (D.y > -0.01) return; const t = (y - O.y) / D.y; game.tap(O.clone().addScaledVector(D, t), null);
    });
    s.onFrame = (t, dt, frame) => {
      if (!frame || placed) return; const hits = frame.getHitTestResults(src);
      if (hits.length) { const pose = hits[0].getPose(ref); last = new THREE.Matrix4().fromArray(pose.transform.matrix); ret.matrix.copy(last); ret.visible = true; } else { ret.visible = false; last = null; }
    };
    const end = () => { this.stop(); this.ui.exited?.(); }; session.addEventListener('end', end);
    this.cleanup.push(() => { src.cancel?.(); s.scene.remove(ret); r.xr.enabled = false; try { session.removeEventListener('end', end); session.end(); } catch (e) {} r.setAnimationLoop((t, f) => s._frame(f)); });
  }

  async _gyro() {
    const s = this.stage; this.kind = 'gyro';
    // without the gyroscope (a computer, or access refused) the camera simply stays fixed: the witness still stands in front of you
    try { if (window.__gyroPerm) await window.__gyroPerm; else if (typeof DeviceOrientationEvent.requestPermission === 'function') await DeviceOrientationEvent.requestPermission(); } catch (e) { console.warn('gyro not available', e.message); }
    await this._camera(); s.setAR(true); s.controls.enabled = false;
    s.camera.fov = 60; s.camera.position.set(0, 0, 0); s.camera.rotation.order = 'YXZ'; s.camera.updateProjectionMatrix();
    const DIST = 2.2; s.arRoot.scale.setScalar(s.gameFx ? 1.1 : 0.7); s.arRoot.position.set(0, -1.0, -DIST); s.arRoot.visible = true;   // stands in front of you right away; tap to put it somewhere else
    const q = new THREE.Quaternion(), e = new THREE.Euler(), q0 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)), q1 = new THREE.Quaternion();
    let orient = null, heading0 = null;
    const on = ev => { if (ev.alpha == null) return; orient = ev; };
    addEventListener('deviceorientation', on); this.cleanup.push(() => removeEventListener('deviceorientation', on));
    const screenAngle = () => (screen.orientation?.angle || 0) * DEG;
    s.onFrame = () => {
      if (!orient) return;
      e.set(orient.beta * DEG, orient.alpha * DEG, -orient.gamma * DEG, 'YXZ'); q.setFromEuler(e); q.multiply(q0); q.multiply(q1.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -screenAngle()));
      s.camera.quaternion.copy(q);
    };
    // tap = put the witness on the floor under the tapped direction (the floor is assumed ~1.2 m below the phone)
    const FLOOR = -1.0, ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const tap = ev => {
      if (ev.target !== s.canvas || s.pick(ev.clientX, ev.clientY)) return;   // a tap on the figure is a poke, not a placement
      ndc.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, s.camera);
      const d = ray.ray.direction; let pt;
      if (d.y < -0.05) { const k = FLOOR / d.y; pt = d.clone().multiplyScalar(Math.min(k, 3)); } else pt = new THREE.Vector3(d.x, 0, d.z).normalize().multiplyScalar(DIST).setY(FLOOR);
      s.arRoot.position.copy(pt); s.arRoot.visible = true; this.ui.hint('');
    };
    s.canvas.addEventListener('click', tap); this.cleanup.push(() => s.canvas.removeEventListener('click', tap));
    this.ui.hint('Фигура стоит перед тобой. Коснись пола или стола, чтобы переставить её', 5000);
  }
}
