// Compact star data for the sky pages, from the d3-celestial catalogue (J2000 RA/Dec in degrees) -> public/sky/sky.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const D = 'node_modules/d3-celestial/data/', rd = f => JSON.parse(readFileSync(D + f, 'utf8'));
const names = rd('starnames.json'), RU = { Sirius: 'Сириус', Canopus: 'Канопус', Arcturus: 'Арктур', Vega: 'Вега', Capella: 'Капелла', Rigel: 'Ригель', Procyon: 'Процион', Betelgeuse: 'Бетельгейзе', Altair: 'Альтаир', Aldebaran: 'Альдебаран', Antares: 'Антарес', Spica: 'Спика', Pollux: 'Поллукс', Fomalhaut: 'Фомальгаут', Deneb: 'Денеб', Regulus: 'Регул', Polaris: 'Полярная', Castor: 'Кастор', Algol: 'Алголь', Mirfak: 'Мирфак', Alpheratz: 'Альферац', Hamal: 'Хамаль', Menkar: 'Менкар', Alrescha: 'Альриша', Markab: 'Маркаб', Scheat: 'Шеат', Algenib: 'Альгениб', Mira: 'Мира' };
const stars = [], named = [];
for (const f of rd('stars.6.json').features) {
  const [ra, dec] = f.geometry.coordinates, m = f.properties.mag, n = RU[names[f.id]?.name];
  if (m > 5.6) continue; stars.push([+(ra < 0 ? ra + 360 : ra).toFixed(3), +dec.toFixed(3), +m.toFixed(2)]);
  if (n) named.push([n, +(ra < 0 ? ra + 360 : ra).toFixed(3), +dec.toFixed(3)]);
}
const lines = rd('constellations.lines.json').features.map(f => ({ id: f.id, l: f.geometry.coordinates.map(s => s.map(([a, b]) => [+(a < 0 ? a + 360 : a).toFixed(2), +b.toFixed(2)])) }));
const cons = rd('constellations.json').features.map(f => { const [a, b] = f.geometry.coordinates; return { id: f.id, ru: f.properties.ru, ra: +(a < 0 ? a + 360 : a).toFixed(2), dec: b }; });
mkdirSync('public/sky', { recursive: true }); writeFileSync('public/sky/sky.json', JSON.stringify({ stars, named, lines, cons }));
console.log(stars.length, named.length, lines.length, cons.length);
