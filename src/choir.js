// The angels' choir: three different pieces (ethereal / bright / majestic) that come in one after another. Each is a separate voice
// that sounds from its own group of angels (3D positional audio), so the singing is not one loop from one place but a living choir around you.
const FILES = ['audio/choir/c1.mp3', 'audio/choir/c2.mp3', 'audio/choir/c3.mp3'], DELAY = [0, 7000, 15000], LEVEL = [0.9, 0.7, 0.75];
export function createChoir() {
  const AC = window.AudioContext || window.webkitAudioContext; let ac, voices = [], timers = [];
  /** call inside a tap (iOS): builds the audio graph and "warms up" the three tracks */
  function unlock() {
    try {
      ac ||= new AC(); ac.resume();
      voices = FILES.map(f => { const el = new Audio(f); el.loop = true; el.preload = 'auto'; const src = ac.createMediaElementSource(el), gain = ac.createGain(), pan = ac.createPanner(); gain.gain.value = 0; pan.panningModel = 'HRTF'; pan.distanceModel = 'inverse'; pan.refDistance = 6; pan.rolloffFactor = 0.4; src.connect(gain); gain.connect(pan); pan.connect(ac.destination); el.muted = true; el.play().then(() => { el.pause(); el.muted = false; }).catch(() => { el.muted = false; }); return { el, gain, pan }; });
    } catch { }
  }
  const fade = (v, to, sec) => { const t = ac.currentTime; v.gain.gain.cancelScheduledValues(t); v.gain.gain.setValueAtTime(v.gain.gain.value, t); v.gain.gain.linearRampToValueAtTime(to, t + sec); };
  /** the voices come in one by one; the first is heard at once */
  function start() { stop(0); try { ac.resume(); } catch { } voices.forEach((v, i) => { timers.push(setTimeout(() => { try { v.el.currentTime = 0; v.el.play(); fade(v, LEVEL[i], 3); } catch { } }, DELAY[i])); }); }
  function stop(sec = 1.5) { timers.forEach(clearTimeout); timers = []; voices.forEach(v => { try { if (sec > 0) { fade(v, 0, sec); setTimeout(() => v.el.pause(), sec * 1000 + 100); } else { v.gain.gain.value = 0; v.el.pause(); } } catch { } }); }
  /** world positions of the three angel groups (arrays [x, y, z]) */
  function place(points) { voices.forEach((v, i) => { const p = points[i]; if (!p) return; if (v.pan.positionX) { v.pan.positionX.value = p[0]; v.pan.positionY.value = p[1]; v.pan.positionZ.value = p[2]; } else v.pan.setPosition(p[0], p[1], p[2]); }); }
  function listener(pos, fwd, up) { const L = ac?.listener; if (!L) return; if (L.positionX) { L.positionX.value = pos[0]; L.positionY.value = pos[1]; L.positionZ.value = pos[2]; L.forwardX.value = fwd[0]; L.forwardY.value = fwd[1]; L.forwardZ.value = fwd[2]; L.upX.value = up[0]; L.upY.value = up[1]; L.upZ.value = up[2]; } }
  return { unlock, start, stop, place, listener, get ready() { return voices.length > 0; } };
}
