// Desktop test helper: fakes a camera by drawing the printed page onto a canvas (?sim=1).
export async function simStream(mode, src = '/page-print.png') {
  const c = document.createElement('canvas');
  c.width = 1280; c.height = 960;
  const g = c.getContext('2d');
  const img = new Image();
  img.src = src;
  await img.decode();
  // sensor grain: a few pre-made noise tiles, picked at random each frame
  const tiles = Array.from({ length: 6 }, () => { const n = document.createElement('canvas'); n.width = n.height = 256; const ng = n.getContext('2d'); const id = ng.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (Math.random() + Math.random() + Math.random() - 1.5) * 60; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } ng.putImageData(id, 0, 0); return n; });
  const t0 = performance.now();
  const draw = () => {
    const t = (performance.now() - t0) / 1000;
    g.fillStyle = '#6b5a48'; g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 60; i++) { g.fillStyle = i % 2 ? '#7a6850' : '#5d4d3c'; g.fillRect(0, i * 12, c.width, 5); }
    const moving = mode === 'move';
    const sf = parseFloat(new URLSearchParams(location.search).get('simfit'));   // ?simfit=0.45 → the picture is 45% of the frame height
    const fit = sf ? sf * c.height / img.height : Math.min(0.62, 0.86 * c.height / img.height * (img.height > img.width ? 1 : 1.2));
    const s = fit * (1 + (moving ? Math.sin(t * .8) * 0.08 : 0));
    const rot = moving ? Math.sin(t * .6) * 0.12 : 0.04;
    g.save();
    const tremor = mode === 'noise' || mode === 'move';   // hand tremor, ~0.7 px
    g.translate(c.width / 2 + (moving ? Math.sin(t) * 60 : 0) + (tremor ? (Math.random() - .5) * 1.4 : 0), c.height / 2 + (tremor ? (Math.random() - .5) * 1.4 : 0));
    g.rotate(rot);
    g.transform(1, 0, moving ? Math.sin(t * .7) * 0.08 : 0, 1, 0, 0);
    g.scale(s, s);
    g.shadowColor = '#0008'; g.shadowBlur = 30;
    g.drawImage(img, -img.width / 2, -img.height / 2);
    g.restore();
    if (mode === 'noise' || mode === 'move') {
      g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.35;
      const tile = tiles[Math.random() * tiles.length | 0], ox = Math.random() * 256, oy = Math.random() * 256;
      for (let y = -256; y < c.height; y += 256) for (let x = -256; x < c.width; x += 256) g.drawImage(tile, x + ox, y + oy);
      g.restore();
    }
    requestAnimationFrame(draw);
  };
  draw();
  return c.captureStream(30);
}
