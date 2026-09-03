/* Nutrition -> approved Progress/Nutrition reference composition */
(() => {
  'use strict';
  const main = document.getElementById('main');
  if (!main) return;

  function route(page) {
    const proxy = document.querySelector('#bottomNav button');
    if (!proxy) return;
    const old = proxy.dataset.page;
    proxy.dataset.page = page;
    proxy.click();
    proxy.dataset.page = old;
  }

  function enhance() {
    const hero = main.querySelector('.nutrition-visual-hero');
    if (!hero || main.querySelector('.gx-nutrition-tabs')) return;
    main.dataset.gxNutritionEntry = 'closed';

    const target = main.querySelector('.protein-target');
    const pct = target?.textContent.match(/(\d+)%/)?.[1];
    if (pct) hero.style.setProperty('--gx-nutrition-pct', Math.max(0, Math.min(100, Number(pct))));

    const tabs = document.createElement('div');
    tabs.className = 'gx-screen-tabs gx-nutrition-tabs';
    ['Nutrition','Performance','Insights'].forEach((label, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label;
      if (i === 0) b.classList.add('active');
      b.onclick = () => {
        if (i === 1) route('progress');
        if (i === 2) route('coach');
      };
      tabs.appendChild(b);
    });
    main.querySelector('.page-head')?.insertAdjacentElement('afterend', tabs);

    const meals = main.querySelector('.meal-visual-list');
    if (meals) {
      const add = document.createElement('button');
      add.type = 'button'; add.className = 'ghost gx-add-food'; add.textContent = '+  Add Food';
      add.onclick = () => {
        const open = main.dataset.gxNutritionEntry !== 'open';
        main.dataset.gxNutritionEntry = open ? 'open' : 'closed';
        add.textContent = open ? 'Close Entry' : '+  Add Food';
        if (open) requestAnimationFrame(() => main.querySelector('#pickMealScan')?.scrollIntoView({behavior:'smooth',block:'center'}));
      };
      meals.insertAdjacentElement('afterend', add);
    }
  }

  let queued=false;
  const obs = new MutationObserver(() => {
    if (queued) return; queued=true;
    requestAnimationFrame(() => { queued=false; enhance(); });
  });
  obs.observe(main,{childList:true,subtree:true});
  enhance();
})();
