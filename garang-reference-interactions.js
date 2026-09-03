/* GARANG approved-reference interaction bridge v3.0
   Keeps the visual board exact on the primary surface while exposing every existing function through real tabs/actions.
   No state, persistence, calculation or adapter logic is replaced here.
*/
(() => {
  'use strict';
  const main = document.getElementById('main');
  if (!main) return;

  function clickExisting(selector) {
    const el = main.querySelector(selector) || document.querySelector(selector);
    if (el && typeof el.click === 'function') el.click();
  }

  function button(label, active, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (active) b.classList.add('active');
    b.addEventListener('click', onClick);
    return b;
  }

  function injectTodayActions() {
    if (!main.querySelector('.visual-today-hero') || main.querySelector('.gx-today-cta')) return;
    const quick = main.querySelector('.quick-visual-grid');
    if (!quick) return;
    const wrap = document.createElement('div');
    wrap.className = 'gx-today-cta';
    const start = button('Start Workout', false, () => clickExisting('.quick-visual.workout,[data-pagego="workout"]'));
    start.className = 'primary';
    const plan = button('View Plan', false, () => clickExisting('[data-pagego="planner"]'));
    plan.className = 'ghost';
    wrap.append(start, plan);
    quick.insertAdjacentElement('afterend', wrap);
  }

  function injectWorkoutTabs() {
    const hero = main.querySelector('.workout-hero-v2');
    if (!hero) return;
    if (!main.dataset.gxWorkoutTab) main.dataset.gxWorkoutTab = 'overview';
    if (!main.querySelector('.gx-workout-tabs')) {
      const tabs = document.createElement('div');
      tabs.className = 'gx-screen-tabs gx-workout-tabs';
      ['overview','exercises','log'].forEach((key, i) => {
        const labels = ['Overview','Exercises','Log'];
        const b = button(labels[i], main.dataset.gxWorkoutTab === key, () => {
          main.dataset.gxWorkoutTab = key;
          tabs.querySelectorAll('button').forEach((x, j) => x.classList.toggle('active', ['overview','exercises','log'][j] === key));
          if (key === 'log') requestAnimationFrame(() => main.querySelector('#wName')?.focus());
        });
        tabs.appendChild(b);
      });
      main.querySelector('.page-head')?.insertAdjacentElement('afterend', tabs);
    }
    if (!main.querySelector('.gx-workout-start')) {
      const start = button('Start Session', false, () => {
        main.dataset.gxWorkoutTab = 'log';
        const tabs = main.querySelector('.gx-workout-tabs');
        tabs?.querySelectorAll('button').forEach((x, i) => x.classList.toggle('active', i === 2));
        requestAnimationFrame(() => main.querySelector('#wName')?.focus());
      });
      start.className = 'primary gx-workout-start';
      main.appendChild(start);
    }
  }

  function injectBodyTabs() {
    if (!main.querySelector('.body-trend-primary')) return;
    if (!main.dataset.gxBodyTab) main.dataset.gxBodyTab = 'inbody';
    if (!main.querySelector('.gx-body-tabs')) {
      const tabs = document.createElement('div');
      tabs.className = 'gx-screen-tabs gx-body-tabs';
      ['input','inbody','trends'].forEach((key, i) => {
        const labels = ['Input','InBody','Trends'];
        const b = button(labels[i], main.dataset.gxBodyTab === key, () => {
          main.dataset.gxBodyTab = key;
          tabs.querySelectorAll('button').forEach((x, j) => x.classList.toggle('active', ['input','inbody','trends'][j] === key));
          if (key === 'input') {
            const d = main.querySelector('.body-entry-drawer');
            if (d) d.open = true;
          }
        });
        tabs.appendChild(b);
      });
      main.querySelector('.page-head')?.insertAdjacentElement('afterend', tabs);
    }
  }

  function injectProgressTabs() {
    const existing = main.querySelector('.progress-tabs');
    if (!existing || main.querySelector('.gx-progress-title-tabs')) return;
    const tabs = document.createElement('div');
    tabs.className = 'gx-screen-tabs gx-progress-title-tabs';
    ['Nutrition','Performance','Insights'].forEach((label, i) => {
      const b = button(label, i === 0, () => {
        tabs.querySelectorAll('button').forEach((x, j) => x.classList.toggle('active', j === i));
        // Preserve the canonical page. These tabs are a visual top-level selector;
        // existing range/data controls remain available below and are never deleted.
        main.dataset.gxProgressTab = ['nutrition','performance','insights'][i];
      });
      tabs.appendChild(b);
    });
    main.dataset.gxProgressTab = main.dataset.gxProgressTab || 'nutrition';
    main.querySelector('.page-head')?.insertAdjacentElement('afterend', tabs);
  }

  function repair() {
    injectTodayActions();
    injectWorkoutTabs();
    injectBodyTabs();
    injectProgressTabs();
  }

  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; repair(); });
  });
  observer.observe(main, { childList:true, subtree:true });
  repair();
})();
