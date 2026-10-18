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
const GAME_HOW = { surface: [['🪑', 'Найди стол или пол и наведи на него камеру.'], ['👆', 'Коснись экрана: на столе появится большая тарелка с пряничком.'], ['🌟', 'Касайся стола: пряничек побежит и соберёт звёздочки.'], ['⛄', 'Берегись снежков! Коснись пряничка, и он перепрыгнет.']], scene: [['🔊', 'Включи звук.'], ['👆', 'Нажми «Играть».'], ['🌟', 'Касайся тарелки: пряничек побежит и соберёт звёздочки.'], ['⛄', 'Берегись снежков! Коснись пряничка, и он перепрыгнет.']] };
const QUIZ_HOW = { surface: [['🪑', 'Найди стол и наведи на него камеру.'], ['👆', 'Коснись экрана: пряничек появится на столе.'], ['❓', 'Он задаст вопрос о Рождестве: правда или нет?'], ['✅', 'Нажми «Правда» или «Неправда». Вопросов 50, можно закончить раньше.']], scene: [['🔊', 'Включи звук.'], ['👆', 'Нажми «Играть».'], ['❓', 'Пряничек прочитает вопрос о Рождестве.'], ['✅', 'Нажми «Правда» или «Неправда». Вопросов 50, можно закончить раньше.']] };
const BETH_HOW = { marker: [['📖', 'Открой страницу журнала, где нарисован кружок «Вифлеем».'], ['📱', 'Наведи камеру на кружок: целиком.'], ['🌙', 'Нажми «Ночь»: в окнах зажгутся огни, над домиком засияет звезда.'], ['⭐', 'Нажми «К яслям»: узнаешь, кто родился в этом домике.']], surface: [['🪑', 'Найди ровное место: стол или пол.'], ['👆', 'Коснись экрана: на столе встанет Вифлеем.'], ['🌙', 'Нажми «Ночь»: в окнах зажгутся огни, над домиком засияет звезда.'], ['⭐', 'Нажми «К яслям»: узнаешь, кто родился в этом домике.']], scene: [['🔊', 'Включи звук.'], ['🌙', 'Нажми «Ночь»: в окнах зажгутся огни, над домиком засияет звезда.'], ['⭐', 'Нажми «К яслям»: узнаешь, кто родился в этом домике.'], ['👆', 'Води пальцем, чтобы рассмотреть город.']] };
const FAMILY_HOW = { marker: [['📖', 'Открой страницу журнала, где нарисован кружок «Святое семейство».'], ['📱', 'Наведи камеру на кружок: целиком.'], ['✨', 'Подожди пару секунд: Мария, Иосиф и Младенец появятся на странице!'], ['👆', 'Коснись Марии, Иосифа или Младенца: они заговорят. А кнопка «Ангелы поют» включит пение.']], surface: [['🪑', 'Найди ровное место: стол или пол.'], ['👆', 'Коснись экрана: на столе встанет Святое семейство.'], ['✨', 'Коснись Марии, Иосифа или Младенца: они заговорят.'], ['👼', 'Нажми «Ангелы поют».']], scene: [['🔊', 'Включи звук.'], ['👆', 'Коснись Марии, Иосифа или Младенца: они заговорят.'], ['👼', 'Нажми «Ангелы поют».'], ['🔄', 'Води пальцем, чтобы рассмотреть их.']] };
const GO = { witness: 'Рассказать', word: 'Слушать', room: 'Заглянуть внутрь', game: 'Играть', quiz: 'Играть' };

export async function chooseMode({ $, kind = 'witness', name, preset, ref }) {
  const sup = await AR.support(); const HIDE = kind === 'game' || kind === 'quiz' || new URLSearchParams(location.search).get('id') === 'bethlehem' ? ['marker'] : [];   // the game needs no printed medallion
  const el = $('start'); $('startRef').textContent = ref || ''; const can = { marker: sup.marker, surface: sup.surface, scene: true };
  const why = { marker: 'нужна камера и защищённое соединение', surface: 'нужна камера и защищённое соединение' };
  let saved = null; try { saved = localStorage.getItem('viewMode'); } catch (e) {}
  let mode = [preset, saved, ...(kind === 'game' || kind === 'quiz' || new URLSearchParams(location.search).get('id') === 'bethlehem' ? ['surface'] : ['marker', 'surface']), 'scene'].find(m => m && can[m] && !HIDE.includes(m)) || 'scene';
  const goWord = GO[kind] || GO.witness;
  const ACC = { zechariah: '#9b6fe0', mary: '#4f86e0', elizabeth: '#d9677f', joseph: '#c28a4e', micah: '#3fb0b0', shepherd: '#6cc04a', simeon: '#6f8ae8', anna: '#bd70cc', wiseman: '#7068e8', herod: '#d9535b', word: '#dcae3c', room: '#3fa862', game: '#ee8c2e', quiz: '#5b8def', bethlehem: '#d99a4a', family: '#e0b24a' };
  el.style.setProperty('--acc', ACC[new URLSearchParams(location.search).get('id')] || '#e8c46a');
  const ICON = { marker: '#8e6bff', surface: '#3d9bff', scene: '#3ec57a' };
  el.querySelector('#opts').innerHTML = Object.entries(HOW).filter(([k]) => !HIDE.includes(k)).map(([k, h]) => `<button class="opt${can[k] ? '' : ' off'}" data-m="${k}" ${can[k] ? '' : 'disabled'}><span class="oi" style="background:${ICON[k]}">${h.icon}</span><span class="ot"><b>${h.title}</b><small>${can[k] ? h.sub : why[k]}</small></span><i class="ck"></i></button>`).join('');
  const render = () => {
    for (const b of el.querySelectorAll('.opt')) b.classList.toggle('on', b.dataset.m === mode);
    const h = HOW[mode]; const steps = (kind === 'game' && GAME_HOW[mode]) || (kind === 'quiz' && QUIZ_HOW[mode]) || (new URLSearchParams(location.search).get('id') === 'bethlehem' && BETH_HOW[mode]) || (new URLSearchParams(location.search).get('id') === 'family' && FAMILY_HOW[mode]) || h.steps; el.querySelector('#how').innerHTML = steps.map(([i, t], n) => `<li><span>${i}</span><div>${t.replace('{go}', goWord)}</div></li>`).join(''); el.querySelector('#tip').textContent = h.tip;
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
