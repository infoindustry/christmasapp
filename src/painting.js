// "Living painting": a page illustration + its depth map become a relief that sits
// *below* the page plane (seen through a stencil window), with animated light on top.
import * as THREE from 'three';

const stencilEq = m => Object.assign(m, { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc });

function glowTexture(inner = 'rgba(255,214,120,1)', outer = 'rgba(255,140,40,0)') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, inner); r.addColorStop(.35, 'rgba(255,170,60,.45)'); r.addColorStop(1, outer);
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export async function buildPainting(group, cfg, base) {
  const PW = 1, PH = cfg.page.h / cfg.page.w, relief = cfg.relief;
  const loader = new THREE.TextureLoader();
  const [map, depthTex] = await Promise.all([loader.loadAsync(`${base}/page.jpg`), loader.loadAsync(`${base}/depth.png`)]);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;

  // CPU copy of the depth map, to place sprites at the right depth
  const dimg = depthTex.image, dc = document.createElement('canvas');
  dc.width = dimg.width; dc.height = dimg.height;
  const dg = dc.getContext('2d'); dg.drawImage(dimg, 0, 0);
  const depthAt = (u, v) => dg.getImageData(Math.min(dc.width - 1, u * dc.width | 0), Math.min(dc.height - 1, v * dc.height | 0), 1, 1).data[0] / 255;
  const zAt = (u, v) => -(1 - depthAt(u, v)) * relief;             // near = 0 (page plane), far = -relief
  const pos = (u, v, dz = 0.004) => new THREE.Vector3((u - .5) * PW, (.5 - v) * PH, zAt(u, v) + dz);

  // 1. stencil window = the picture area on the page
  const maskMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  Object.assign(maskMat, { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
  const mask = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), maskMat);
  group.add(mask);

  // 2. relief mesh
  const uniforms = { uMap: { value: map }, uDepth: { value: depthTex }, uRelief: { value: relief }, uTime: { value: 0 },
    uFlames: { value: cfg.flames.x.map(x => new THREE.Vector2(x, 1 - cfg.flames.y)) },
    uLit: { value: cfg.flames.x.map(() => 1) }, uAmb: { value: 1 }, uAspect: { value: cfg.page.h / cfg.page.w } };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: true,
    vertexShader: `
      uniform sampler2D uDepth; uniform float uRelief; varying vec2 vUv;
      void main(){ vUv = uv; float d = texture2D(uDepth, uv).r;
        vec3 p = position; p.z -= (1.0 - d) * uRelief;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform float uTime, uAmb, uAspect; uniform float uLit[7]; uniform vec2 uFlames[7]; varying vec2 vUv;
      void main(){ vec3 c = texture2D(uMap, vUv).rgb;
        // each lit candle floods nearby parts of the temple with warm light; unlit = near darkness
        float glow = 0.0, lit = uAmb;
        for(int i=0;i<7;i++){ vec2 q = (vUv - uFlames[i]) * vec2(1.0, uAspect);
          float f = 0.75 + 0.25*sin(uTime*7.0 + float(i)*1.9) * sin(uTime*3.1 + float(i)*0.7);
          float d2 = dot(q,q);
          glow += uLit[i] * f * 0.05 / (0.004 + d2*26.0);
          lit  += uLit[i] * 0.55 * smoothstep(1.1, 0.0, sqrt(d2) * 1.6); }
        c *= mix(0.05, 1.0, clamp(lit, 0.0, 1.0));
        c += vec3(1.0,0.62,0.22) * glow * 0.35;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  stencilEq(mat);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH, 120, Math.round(120 * PH)), mat);
  mesh.renderOrder = 1;
  group.add(mesh);

  // 3. inner walls so the window reads as a recess
  const wallMat = stencilEq(new THREE.MeshBasicMaterial({ color: 0x050308, side: THREE.DoubleSide, transparent: true, opacity: .55, depthWrite: false }));
  const d = relief * 1.15;
  [[0, PH / 2, PW, d, [Math.PI / 2, 0, 0]], [0, -PH / 2, PW, d, [Math.PI / 2, 0, 0]], [PW / 2, 0, d, PH, [0, Math.PI / 2, 0]], [-PW / 2, 0, d, PH, [0, Math.PI / 2, 0]]]
    .forEach(([x, y, a, b, r]) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(a, b), wallMat); w.position.set(x, y, -d / 2); w.rotation.set(...r); w.renderOrder = 0.5; group.add(w); });

  // 4. sprites: angel halo, drifting dust, incense wisps
  const add = (tex, p, s, o = 1) => { const sp = new THREE.Sprite(stencilEq(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: o })));
    sp.position.copy(p); sp.scale.setScalar(s); sp.renderOrder = 3; group.add(sp); return sp; };
  const warm = glowTexture();
  const halo = add(warm, pos(cfg.angel.x, cfg.angel.y, 0.01), 0.55, 0.5);

  const N = 140, geo = new THREE.BufferGeometry(), arr = new Float32Array(N * 3), seeds = [];
  for (let i = 0; i < N; i++) { seeds.push({ u: Math.random(), v: Math.random(), z: Math.random(), sp: .008 + Math.random() * .02, ph: Math.random() * 6.28 }); }
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const dustMat = stencilEq(new THREE.PointsMaterial({ map: glowTexture('rgba(255,235,170,1)', 'rgba(255,200,100,0)'), size: 0.018, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  const dust = new THREE.Points(geo, dustMat); dust.renderOrder = 4; dust.frustumCulled = false; group.add(dust);

  const smoke = []; for (let i = 0; i < 5; i++) smoke.push(add(glowTexture('rgba(255,255,255,.35)', 'rgba(255,255,255,0)'), pos(cfg.smoke.x, cfg.smoke.y, 0.01), 0.18, 0.35));

  const api = t => {
    uniforms.uTime.value = t;
    halo.material.opacity = 0.42 + Math.sin(t * 1.3) * 0.12; halo.scale.setScalar(0.52 + Math.sin(t * 1.3) * 0.04);
    for (let i = 0; i < N; i++) { const s = seeds[i];
      const v = (s.v - t * s.sp) % 1, vv = v < 0 ? v + 1 : v;
      const u = s.u + Math.sin(t * .5 + s.ph) * .02;
      arr[i * 3] = (u - .5) * PW; arr[i * 3 + 1] = (.5 - vv) * PH; arr[i * 3 + 2] = -s.z * relief * 1.1 + .005; }
    geo.attributes.position.needsUpdate = true;
    smoke.forEach((sp, i) => { const k = ((t * .08 + i / smoke.length) % 1);
      const p = pos(cfg.smoke.x, cfg.smoke.y, 0.01); sp.position.set(p.x + Math.sin(k * 6 + i) * .03, p.y + k * .3, p.z);
      sp.material.opacity = .32 * Math.sin(k * Math.PI); sp.scale.setScalar(.14 + k * .22); });
  };
  api.uniforms = uniforms; api.flamePos = cfg.flames.x.map(x => [x, cfg.flames.y]); api.halo = halo; api.PH = PH; api.mask = mask;
  return api;
}
