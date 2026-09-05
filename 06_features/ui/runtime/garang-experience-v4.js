/* GARANG experience v4.4
   - Memory remains fully internal to GARANG's intelligence/data model.
   - Settings has one canonical entry: the permanent top-bar gear.
   - Today removes the obsolete duplicate FRONT/BACK tools; only the interactive compact switch remains.
   - Keeps Nutrition manual entry open after adding a draft item so Save meal stays immediately available.
   - Adds compact Korean subtitles to the hamburger navigation without replacing primary route labels.
   - Screen identity and page-header policy are owned by GarangScreens.
*/
(() => {
  'use strict';

  const main = document.getElementById('main');
  if (!main) return;
  let scheduled = false;
  let redirecting = false;
  let mealEntryScrollY = null;

  const isKo = () => document.documentElement.lang !== 'en';
  const routeSubtitles = Object.freeze({
    today:'오늘', coach:'코치', log:'기록', workout:'운동', nutrition:'식단', running:'달리기',
    body:'체성분', planner:'계획', progress:'분석', profile:'프로필', onboarding:'모델링'
  });

  function ensureExperienceStyle() {
    if (document.getElementById('garang-experience-v44-style')) return;
    const style = document.createElement('style');
    style.id = 'garang-experience-v44-style';
    style.textContent = `
      .garang-more-sheet [data-route]{position:relative}
      .garang-more-sheet .garang-route-subtitle{display:block;margin-top:2px;font-size:10px;line-height:1.1;font-weight:500;letter-spacing:0;color:rgba(255,255,255,.48);text-transform:none}
      .manual-entry[open] #saveMeal:not(:disabled){position:relative}
    `;
    document.head.appendChild(style);
  }

  function markSingleRoute(parent) {
    if (parent && (parent.classList.contains('grid') || parent.classList.contains('utility-row'))) parent.classList.add('garang-single-route');
  }

  function removeRoute(selector) {
    document.querySelectorAll(selector).forEach(el => {
      const parent = el.parentElement;
      el.remove();
      markSingleRoute(parent);
    });
  }

  function cleanMoreSheet() {
    document.querySelectorAll('.garang-more-sheet [data-route="memory"], .garang-more-sheet [data-route="settings"]').forEach(el => {
      const parent = el.parentElement;
      el.remove();
      markSingleRoute(parent);
    });
  }

  function decorateMoreSheet() {
    document.querySelectorAll('.garang-more-sheet [data-route]').forEach(el => {
      const subtitle = routeSubtitles[String(el.dataset.route || '').toLowerCase()];
      if (!subtitle) return;
      let small = el.querySelector('.garang-route-subtitle');
      if (!small) {
        small = document.createElement('small');
        small.className = 'garang-route-subtitle';
        el.appendChild(small);
      }
      small.textContent = subtitle;
    });
  }

  function keepMealEntryOpen() {
    const save = main.querySelector('#saveMeal');
    const details = save?.closest('details.manual-entry');
    if (details && !save.disabled) details.open = true;
    if (mealEntryScrollY !== null && details) {
      const y = mealEntryScrollY;
      mealEntryScrollY = null;
      requestAnimationFrame(() => window.scrollTo({ top:y, behavior:'auto' }));
    }
  }

  function cleanTodayAnatomy() {
    main.querySelectorAll('.today-body-panel .g3-anatomy-tools').forEach(el => el.remove());
  }

  function internalizeMemorySurface() {
    removeRoute('[data-pagego="memory"], [data-page="memory"]');
    removeRoute('[data-pagego="settings"], [data-page="settings"]');
    cleanMoreSheet();

    main.querySelectorAll('.section-title h2').forEach(title => {
      const text = title.textContent.trim();
      if (text === '계획과 기억' || text.toLowerCase() === 'plan & memory') title.textContent = isKo() ? '계획' : 'Plan';
    });

    main.querySelectorAll('.plan-choice li').forEach(item => {
      if (/advanced\s+memory/i.test(item.textContent)) item.textContent = isKo() ? '지속 개인화' : 'Persistent personalization';
    });

    if (!redirecting && main.querySelector('#saveMemory, .memory-card')) {
      const today = document.querySelector('#bottomNav [data-page="today"]');
      if (today) {
        redirecting = true;
        today.click();
        setTimeout(() => { redirecting = false; }, 0);
      } else main.replaceChildren();
    }
  }

  function run() {
    scheduled = false;
    ensureExperienceStyle();
    internalizeMemorySurface();
    decorateMoreSheet();
    cleanTodayAnatomy();
    keepMealEntryOpen();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => requestAnimationFrame(run));
  }

  new MutationObserver(schedule).observe(main, { childList:true, subtree:true });
  new MutationObserver(schedule).observe(document.body, { childList:true, subtree:true });
  new MutationObserver(schedule).observe(document.documentElement, { attributes:true, attributeFilter:['lang'] });
  document.addEventListener('click', event => {
    if (event.target.closest('#addFood')) mealEntryScrollY = window.scrollY;
    if (event.target.closest('[data-page],[data-pagego],#menuBtn,#settingsTopBtn,#addFood')) setTimeout(schedule, 0);
  }, true);

  schedule();
})();
