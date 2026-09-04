/* GARANG workout library v2
   - Korean headers use TODAY / 오늘 and WORKOUT / 운동.
   - Workout shows 4 exercises by default, then expands to every matching DB exercise.
   - Existing workout state/data logic remains owned by app.js. */
(() => {
  'use strict';

  const main = document.getElementById('main');
  if (!main) return;

  let exerciseDBPromise = null;
  let scheduled = false;

  const muscleKeyFromLabel = label => {
    const x = String(label || '').toLowerCase();
    if (/가슴|흉근|pector/.test(x)) return 'chest';
    if (/등|광배|승모|back|lat/.test(x)) return 'back';
    if (/어깨|삼각근|shoulder|delt/.test(x)) return 'shoulders';
    if (/이두|biceps/.test(x)) return 'biceps';
    if (/삼두|triceps/.test(x)) return 'triceps';
    if (/복근|복부|코어|core|abs/.test(x)) return 'core';
    if (/하체|대퇴|햄스트링|둔근|엉덩|종아리|leg|quad|hamstring|glute|calf/.test(x)) return 'legs';
    if (/전신|컨디셔닝|full/.test(x)) return 'full';
    return 'full';
  };

  function loadExerciseDB() {
    if (!exerciseDBPromise) {
      exerciseDBPromise = fetch('./04_data/knowledge/exercise-db.json', { cache: 'no-store' })
        .then(r => {
          if (!r.ok) throw new Error(`exercise-db ${r.status}`);
          return r.json();
        })
        .then(rows => Array.isArray(rows) ? rows : [])
        .catch(err => {
          console.warn('[GARANG] workout library DB load failed', err);
          return [];
        });
    }
    return exerciseDBPromise;
  }

  function currentPage() {
    return document.querySelector('#bottomNav button.active')?.dataset.page || '';
  }

  function polishPageHeader() {
    const page = currentPage();
    const eyebrow = main.querySelector('.page-head .eyebrow');
    if (!eyebrow) return;
    const ko = document.documentElement.lang !== 'en';
    if (page === 'today') eyebrow.textContent = ko ? 'TODAY / 오늘' : 'TODAY';
    if (page === 'workout') eyebrow.textContent = ko ? 'WORKOUT / 운동' : 'WORKOUT';
  }

  function setCardContent(card, ex, muscleKey) {
    const name = String(ex?.exercise_name || '').trim();
    card.dataset.exercisePick = name;
    card.classList.remove('selected');
    const strong = card.querySelector('strong');
    const meta = card.querySelector('span');
    const figure = card.querySelector('.exercise-figure');
    if (strong) strong.textContent = name;
    if (meta) {
      const met = Number(ex?.met_default);
      meta.textContent = `${ex?.primary_muscle || '전신'} · ${Number.isFinite(met) ? met.toFixed(1) : '5.0'} MET`;
    }
    if (figure) figure.dataset.muscle = muscleKeyFromLabel(ex?.primary_muscle) || muscleKey || 'full';
  }

  function selectExpandedExercise(card) {
    const name = card.dataset.exercisePick || '';
    const input = document.getElementById('wName');
    if (!input || !name) return;
    input.value = name;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    main.querySelectorAll('.exercise-visual-card[data-exercise-pick]').forEach(x => x.classList.toggle('selected', x === card));
    card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  async function enhanceWorkoutLibrary() {
    if (currentPage() !== 'workout') return;
    const library = main.querySelector('.exercise-visual-library');
    if (!library) return;

    const initialCards = [...library.querySelectorAll('.exercise-visual-card[data-exercise-pick]')];
    if (!initialCards.length) return;

    const activeButton = main.querySelector('.muscle-filter-strip [data-muscle-pick].active');
    const activeKey = activeButton?.dataset.musclePick || 'all';
    const db = await loadExerciseDB();
    if (!db.length || !library.isConnected) return;

    const byName = new Map(db.map(ex => [String(ex.exercise_name || '').trim(), ex]));
    const firstRecord = byName.get(initialCards[0]?.dataset.exercisePick || '');
    const inferredKey = muscleKeyFromLabel(firstRecord?.primary_muscle);
    const filterKey = activeKey === 'all' ? inferredKey : activeKey;
    const matching = (filterKey && filterKey !== 'all' && filterKey !== 'full')
      ? db.filter(ex => muscleKeyFromLabel(ex.primary_muscle) === filterKey)
      : db.slice();

    const signature = `${filterKey}:${matching.length}`;
    if (library.dataset.garangLibraryV2 === signature) return;
    library.dataset.garangLibraryV2 = signature;

    /* app.js currently renders its first eight. Keep the first four visible and preserve
       their native event bindings; cards 5+ become the expandable collection. */
    let cards = [...library.querySelectorAll('.exercise-visual-card[data-exercise-pick]')];
    cards.forEach((card, index) => {
      card.classList.toggle('garang-library-extra', index >= 4);
      card.hidden = index >= 4;
    });

    const existing = new Set(cards.map(card => card.dataset.exercisePick));
    const template = cards[0];
    matching.forEach(ex => {
      const name = String(ex.exercise_name || '').trim();
      if (!name || existing.has(name)) return;
      existing.add(name);
      const clone = template.cloneNode(true);
      setCardContent(clone, ex, filterKey);
      clone.classList.add('garang-library-extra');
      clone.hidden = true;
      clone.addEventListener('click', () => selectExpandedExercise(clone));
      library.appendChild(clone);
    });

    cards = [...library.querySelectorAll('.exercise-visual-card[data-exercise-pick]')];
    const extras = cards.slice(4);
    main.querySelector('.garang-library-more-wrap')?.remove();
    if (!extras.length) return;

    const wrap = document.createElement('div');
    wrap.className = 'garang-library-more-wrap';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'garang-library-more-button';
    button.dataset.expanded = 'false';
    const updateLabel = () => {
      const ko = document.documentElement.lang !== 'en';
      const expanded = button.dataset.expanded === 'true';
      button.innerHTML = expanded
        ? `<span>${ko ? '접기' : 'Show less'}</span><b>↑</b>`
        : `<span>${ko ? '더보기' : 'Show all'} <small>${extras.length}</small></span><b>↓</b>`;
    };
    updateLabel();
    button.addEventListener('click', () => {
      const expanded = button.dataset.expanded !== 'true';
      button.dataset.expanded = String(expanded);
      extras.forEach(card => { card.hidden = !expanded; });
      library.classList.toggle('garang-library-expanded', expanded);
      updateLabel();
      if (!expanded) library.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    wrap.appendChild(button);
    library.insertAdjacentElement('afterend', wrap);
  }

  async function run() {
    scheduled = false;
    polishPageHeader();
    await enhanceWorkoutLibrary();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => requestAnimationFrame(run));
  }

  new MutationObserver(schedule).observe(main, { childList: true, subtree: true });
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  document.addEventListener('click', e => {
    if (e.target.closest('[data-page="today"],[data-page="workout"],[data-pagego="today"],[data-pagego="workout"],[data-muscle-pick]')) setTimeout(schedule, 0);
  }, true);
  schedule();
})();
