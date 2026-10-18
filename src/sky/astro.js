// Sky maths: star / planet directions in the observer's horizon frame (three.js axes: x = east, y = up, z = -north).
// Works for any date incl. 7 BC: J2000 catalogue positions are precessed to the date with astronomy-engine.
import * as A from 'astronomy-engine';
const D = Math.PI / 180;

/** Date for an astronomical year (7 BC = -6), proleptic Gregorian month (1-12), day and local mean solar hour at longitude lon */
export function makeDate(year, month, day, localHour, lon) {
  const d = new Date(Date.UTC(2000, 0, 1)); d.setUTCFullYear(year, month - 1, day); d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() + (localHour - lon / 15) * 3600e3);
}
/** Julian-calendar date text of a moment, e.g. "29 мая 7 г. до н. э." (the calendar of that era) */
export function julianText(date) {
  const jd = A.MakeTime(date).ut + 2451545.0 + 0.5, Z = Math.floor(jd), B = Z + 1524, C = Math.floor((B - 122.1) / 365.25), Dd = Math.floor(365.25 * C), E = Math.floor((B - Dd) / 30.6001);
  const day = B - Dd - Math.floor(30.6001 * E), m = E < 14 ? E - 1 : E - 13, y = m > 2 ? C - 4716 : C - 4715;
  const M = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'][m - 1];
  return `${day} ${M} ${y > 0 ? y + ' г.' : (1 - y) + ' г. до н. э.'}`;
}
export function localHours(date, lon) { return ((date.getUTCHours() + date.getUTCMinutes() / 60 + lon / 15) % 24 + 24) % 24; }

export const BODIES = [['Sun', 'Солнце'], ['Moon', 'Луна'], ['Mercury', 'Меркурий'], ['Venus', 'Венера'], ['Mars', 'Марс'], ['Jupiter', 'Юпитер'], ['Saturn', 'Сатурн']];

/** Builds a snapshot of the sky: everything is converted once per date, then drawing only rotates the camera. */
export function skyAt(date, lat, lon, cat) {
  const t = A.MakeTime(date), R = A.Rotation_EQJ_EQD(t);
  const cols = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(([x, y, z]) => { const r = A.RotateVector(R, new A.Vector(x, y, z, t)); return [r.x, r.y, r.z]; });
  const lst = (A.SiderealTime(t) * 15 + lon) * D, sp = Math.sin(lat * D), cp = Math.cos(lat * D);
  const toWorld = (x, y, z) => {
    const X = cols[0][0] * x + cols[1][0] * y + cols[2][0] * z, Y = cols[0][1] * x + cols[1][1] * y + cols[2][1] * z, Z = cols[0][2] * x + cols[1][2] * y + cols[2][2] * z;
    const r = Math.hypot(X, Y, Z), ra = Math.atan2(Y, X), dec = Math.asin(Z / r), H = lst - ra, cd = Math.cos(dec), sd = Math.sin(dec);
    return [-cd * Math.sin(H), sd * sp + cd * cp * Math.cos(H), -(sd * cp - cd * Math.cos(H) * sp)];
  };
  const eqj = (raDeg, decDeg) => { const a = raDeg * D, d = decDeg * D; return toWorld(Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)); };
  const sky = { date, lat, lon, stars: new Float32Array(cat.stars.length * 3), mags: Float32Array.from(cat.stars, s => s[2]), lines: [], cons: [], named: [], bodies: {} };
  cat.stars.forEach((s, i) => sky.stars.set(eqj(s[0], s[1]), i * 3));
  sky.lines = cat.lines.map(c => ({ id: c.id, parts: c.l.map(p => p.map(([a, b]) => eqj(a, b))) }));
  sky.cons = cat.cons.map(c => ({ id: c.id, ru: c.ru, v: eqj(c.ra, c.dec) }));
  sky.named = cat.named.map(n => ({ ru: n[0], v: eqj(n[1], n[2]) }));
  for (const [id, ru] of BODIES) { const v = A.GeoVector(id, t, true); sky.bodies[id] = { id, ru, v: toWorld(v.x, v.y, v.z) }; }
  sky.sunAlt = Math.asin(sky.bodies.Sun.v[1]) / D;
  return sky;
}
export const sepDeg = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) / D;
export const altAz = v => ({ alt: Math.asin(v[1]) / D, az: ((Math.atan2(v[0], -v[2]) / D) + 360) % 360 });
/** world direction from altitude / azimuth (north = 0, east = 90) in degrees */
export const dirOf = (alt, az) => { const a = alt * D, z = az * D; return [Math.cos(a) * Math.sin(z), Math.sin(a), -Math.cos(a) * Math.cos(z)]; };
