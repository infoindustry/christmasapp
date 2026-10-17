// "Living portrait": video layers placed on exact rectangles of the printed page.
// rect = [x, y, w, h] in page pixels (the page image's own pixel grid).
import * as THREE from 'three';

export async function buildVideo(group, cfg, base) {
  const PW = 1, scale = PW / cfg.page.w;
  const layers = cfg.layers.map((L, i) => {
    const video = Object.assign(document.createElement('video'), { src: `${base}/${L.video}`, loop: !!L.loop, muted: !!L.muted, playsInline: true, preload: 'auto' });
    video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', '');
    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = tex.magFilter = THREE.LinearFilter;
    const uniforms = { uMap: { value: tex }, uOpacity: { value: 0 }, uFeather: { value: L.feather ?? 0.03 } };
    const mat = new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform sampler2D uMap; uniform float uOpacity, uFeather; varying vec2 vUv;
        void main(){ vec3 c = texture2D(uMap, vUv).rgb;
          vec2 e = min(vUv, 1.0 - vUv); float f = smoothstep(0.0, uFeather, min(e.x, e.y));   // soft edges hide tiny misalignment
          gl_FragColor = vec4(c, uOpacity * f);
          #include <colorspace_fragment>
        }`,
    });
    const [x, y, w, h] = L.rect;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w * scale, h * scale), mat);
    plane.position.set((x + w / 2) * scale - PW / 2, (cfg.page.h / 2 - (y + h / 2)) * scale, 0.002 + i * 0.001);
    plane.renderOrder = 5 + i;
    group.add(plane);
    return { L, video, uniforms, plane, want: 0, timer: null };
  });

  const audio = cfg.audio ? Object.assign(new Audio(`${base}/${cfg.audio}`), { loop: true, volume: cfg.audioVolume ?? 0.4 }) : null;
  const playLayer = l => { l.want = 1; l.video.currentTime = 0; l.video.play().catch(() => { l.video.muted = true; l.video.play().catch(() => {}); }); };
  layers.forEach(l => { if (!l.L.loop) l.video.addEventListener('ended', () => { l.want = 0; }); });
  let shown = false;

  return {
    show() {
      shown = true; audio?.play().catch(() => {});
      layers.forEach(l => { clearTimeout(l.timer); l.timer = setTimeout(() => shown && playLayer(l), (l.L.delay ?? 0) * 1000); });
    },
    hide() { shown = false; layers.forEach(l => { clearTimeout(l.timer); l.want = 0; }); },
    /** pointer in normalized device coords; replays a tappable layer */
    tap(ndc, camera) {
      const ray = new THREE.Raycaster(); ray.set(new THREE.Vector3(), new THREE.Vector3(ndc.x, ndc.y, 0.5).applyMatrix4(camera.projectionMatrixInverse).normalize());
      for (const l of layers) if (l.L.tap && ray.intersectObject(l.plane).length) { playLayer(l); return true; }
      return false;
    },
    tick(dt) {
      for (const l of layers) {
        const o = l.uniforms.uOpacity.value;
        l.uniforms.uOpacity.value = o + (l.want - o) * Math.min(1, dt * (l.want ? 5 : 4));
        if (!shown && l.uniforms.uOpacity.value < 0.01 && !l.video.paused) l.video.pause();
      }
      if (!shown && audio && !audio.paused) { audio.pause(); }
    },
  };
}
