// "AR · Вифлеем": the third engine, 8th Wall's engine binary (Niantic Spatial, XR Engine License: https://github.com/8thwall/engine/blob/main/LICENSE).
// It finds the printed medallion AND tracks the room (SLAM, real scale), so a found figure stays where it stands when the medallion leaves the frame.
// The engine is loaded from jsDelivr, unmodified. It draws the camera on its own canvas; our three.js canvas lies over it and takes the camera pose from the engine.
import * as THREE from 'three';

const ENGINE = 'https://cdn.jsdelivr.net/npm/@8thwall/engine-binary@1/dist/xr.js';

const loadEngine = () => window.XR8 ? Promise.resolve(window.XR8) : new Promise((res, rej) => {
  window.addEventListener('xrloaded', () => res(window.XR8), { once: true });
  const sc = Object.assign(document.createElement('script'), { src: ENGINE, async: true, crossOrigin: 'anonymous' }); sc.dataset.preloadChunks = 'slam';
  sc.onerror = () => rej(new Error('8th Wall engine did not load'));
  document.head.appendChild(sc);
});

export async function startXr8(ar) {
  const s = ar.stage, XR8 = await loadEngine();
  const targets = await (await fetch(`targets/xr8/${ar.id}.json`)).json();   // [current medallion, previous design]
  ar.kind = 'xr8'; s.setAR(true); s.controls.enabled = false;
  if (s.disc) s.disc.visible = false;   // the printed medallion itself is the pedestal
  const wasFixed = s.fixedFacing; s.fixedFacing = true; if (s.figure) s.figure.rotation.y = 0; ar.cleanup.push(() => { s.fixedFacing = wasFixed; });
  s.anchor.rotation.set(Math.PI / 2, 0, 0);   // the stage's up (y) becomes the medallion's normal
  s.arRoot.matrixAutoUpdate = false; s.arRoot.visible = false; s.camera.matrixAutoUpdate = true;

  const canvas = document.createElement('canvas'); canvas.style.zIndex = '0'; document.body.insertBefore(canvas, s.canvas);   // under the three.js canvas
  ar.cleanup.push(() => canvas.remove());
  // attribution required by the engine's licence
  const credit = Object.assign(document.body.appendChild(document.createElement('a')), { href: 'https://github.com/8thwall/engine/blob/main/LICENSE', target: '_blank', rel: 'noopener', textContent: 'AR: движок 8th Wall © Niantic Spatial, XR Engine License. Без гарантий' });
  Object.assign(credit.style, { position: 'fixed', left: '8px', top: '62px', zIndex: 5, font: '10px system-ui', color: '#fff9', textDecoration: 'none', pointerEvents: 'auto' }); ar.cleanup.push(() => credit.remove());
  const P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
  let found = false, shown = false;
  const dbg = new URLSearchParams(location.search).has('debug') ? Object.assign(document.body.appendChild(document.createElement('div')), { style: 'position:fixed;left:6px;top:96px;z-index:99;font:12px monospace;color:#0f0;background:#000a;padding:2px 4px;pointer-events:none' }) : null; if (dbg) ar.cleanup.push(() => dbg.remove());
  let frames = 0, t0 = performance.now(), status = '';
  const onFound = ({ detail }) => {
    if (detail.name.replace(/-old$/, '') !== ar.id) return;
    const { position: p, rotation: r } = detail, k = detail.scale * (detail.scaledWidth ?? 1); if (dbg) window.__xr8last = detail;   // `scale` is the target's height; our unit is the medallion's width (= the padded target's width)
    s.arRoot.matrix.compose(P.set(p.x, p.y, p.z), Q.set(r.x, r.y, r.z, r.w), S.set(k, k, k)); s.arRoot.matrixWorldNeedsUpdate = true; s.arRoot.visible = true; found = true;
    if (!shown) { shown = true; ar.ui.hint(''); s.appear(() => s.bow()); }
  };
  const mod = {
    name: 'witness-xr8',
    onStart: () => { XR8.XrController.updateCameraProjectionMatrix({ origin: { x: 0, y: 1, z: 0 }, facing: { x: 0, y: 0, z: 0, w: 1 } }); },
    onUpdate: ({ processCpuResult }) => {
      const r = processCpuResult.reality; if (!r) return; const { rotation, position, intrinsics } = r; frames++;
      if (intrinsics) { for (let i = 0; i < 16; i++) s.camera.projectionMatrix.elements[i] = intrinsics[i]; s.camera.projectionMatrixInverse.copy(s.camera.projectionMatrix).invert(); }
      if (rotation) s.camera.setRotationFromQuaternion(rotation); if (position) s.camera.position.set(position.x, position.y, position.z);
      status = r.trackingStatus || status;
      if (dbg) dbg.textContent = `xr8 fps ${Math.round(frames * 1000 / (performance.now() - t0))} track ${status} found ${found} cam ${s.camera.position.toArray().map(x => x.toFixed(2)).join(',')}`;
    },
    listeners: [{ event: 'reality.imagefound', process: onFound }, { event: 'reality.imageupdated', process: onFound }, { event: 'reality.imagelost', process: () => { found = false; } }],   // a lost medallion does not hide the figure: the room tracking keeps it in place
  };
  const mobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);   // the engine runs the room tracking only on phones (on a computer: image targets only, for testing)
  XR8.XrController.configure({ imageTargetData: targets, scale: mobile ? 'absolute' : 'responsive', disableWorldTracking: !mobile });
  XR8.addCameraPipelineModules([XR8.GlTextureRenderer.pipelineModule(), XR8.XrController.pipelineModule(), mod]);
  ar.cleanup.push(() => { try { XR8.stop(); XR8.clearCameraPipelineModules(); } catch (e) {} });
  ar.ui.hint('Наведи камеру на этот кружок в журнале. Он должен быть виден весь', 0, 8000);
  XR8.run({ canvas, verbose: !!dbg, allowedDevices: XR8.XrConfig.device().ANY });
}
