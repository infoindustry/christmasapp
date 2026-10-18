// The first screen of every witness: HOW do you want to look? — with a short, child-friendly instruction for each way.
// Returns the chosen mode ('marker' | 'surface' | 'scene') when the child taps "Поехали!".
import { AR } from './ar.js';

const HOW = {
  marker: {
    icon: '📖', title: 'В журнале', sub: 'Он оживёт на кружке-медальоне',
    steps: [['📖', 'Открой страницу журнала, где нарисован кружок с лицом.'], ['📱', 'Наведи камеру на кружок. Он должен быть виден весь, целиком.'], ['✨', 'Подожди пару секунд: он появится прямо на странице!'], ['👆', 'Нажми «{go}». А ещё можно потрогать его пальцем.']],
    tip: 'Не получается? Включи свет, не закрывай кружок рукой и держи телефон на расстоянии ладони.',
  },
  surface: {
    icon: '🪑', title: 'На столе', sub: 'Поставим его перед тобой',
    steps: [['🪑', 'Найди ровное место: стол или пол.'], ['📱', 'Наведи на него камеру и чуть поводи телефоном.'], ['👆', 'Коснись экрана: он встанет на это место.'], ['🔊', 'Нажми «{go}» и слушай.']],
    tip: 'Если он стоит не там, коснись экрана в другом месте.',
  },
  scene: {
    icon: '📱', title: 'В телефоне', sub: 'Смотри и слушай на экране',
    steps: [['🔊', 'Включи звук погромче.'], ['👆', 'Нажми «{go}».'], ['🔄', 'Води пальцем по экрану: можно покрутить и рассмотреть.'], ['✋', 'Потрогай его: он ответит!']],
    tip: 'Вопросы можно задать кнопкой «Спросить».',
  },
};
const GO = { witness: 'Рассказать', word: 'Слушать', room: 'Заглянуть внутрь' };

export async function chooseMode({ $, kind = 'witness', name, preset }) {
  const sup = await AR.support();
  const el = $('start'); const can = { marker: sup.marker, surface: sup.surface, scene: true };
  const why = { marker: 'нужна камера и защищённое соединение', surface: 'нужна камера и защищённое соединение' };
  let saved = null; try { saved = localStorage.getItem('viewMode'); } catch (e) {}
  let mode = [preset, saved, 'marker', 'scene'].find(m => m && can[m]) || 'scene';
  const goWord = GO[kind] || GO.witness;
  el.querySelector('p').outerHTML = `<p id="startQ">Как будем смотреть?</p><div id="opts">${Object.entries(HOW).map(([k, h]) => `<button class="opt${can[k] ? '' : ' off'}" data-m="${k}" ${can[k] ? '' : 'disabled'}><span class="oi">${h.icon}</span><span><b>${h.title}</b><small>${can[k] ? h.sub : why[k]}</small></span></button>`).join('')}</div><ol id="how"></ol><p id="tip"></p>`;
  const render = () => {
    for (const b of el.querySelectorAll('.opt')) b.classList.toggle('on', b.dataset.m === mode);
    const h = HOW[mode]; el.querySelector('#how').innerHTML = h.steps.map(([i, t]) => `<li><span>${i}</span><div>${t.replace('{go}', goWord)}</div></li>`).join(''); el.querySelector('#tip').textContent = h.tip;
  };
  el.querySelector('#opts').onclick = e => { const b = e.target.closest('.opt'); if (!b || b.disabled) return; mode = b.dataset.m; render(); };
  render(); $('go').textContent = 'Поехали!';
  return new Promise(res => {
    $('go').addEventListener('click', () => {
      try { localStorage.setItem('viewMode', mode); } catch (e) {}
      // iPhone asks for gyroscope access only inside a tap: ask right now, the AR code picks the answer up
      if (mode === 'surface' && !sup.xr && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') window.__gyroPerm = DeviceOrientationEvent.requestPermission().catch(() => 'denied');
      res(mode);
    }, { once: true });
  });
}
