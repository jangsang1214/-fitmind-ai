/* GARANG experience v4.6 — luxury simplification owner
   Keeps the existing product policy while making observer reconciliation idempotent.
   One body observer owns subtree changes; identical text/HTML state is never rewritten. */
(() => {
  'use strict';

  const main = document.getElementById('main');
  if (!main) return;
  let scheduled = false;
  let mealEntryScrollY = null;
  const DESIGN_VERSION='garang-design-simplification-v2.0.0';

  const isKo = () => document.documentElement.lang !== 'en';
  const setText=(el,value)=>{const next=String(value??'');if(el&&el.textContent!==next)el.textContent=next;};
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
      #main[data-garang-screen="today"] #garangTodayFlow .gtf-action{position:relative;z-index:4}
      #main[data-garang-screen="today"] #garangTodayFlow .gtf-next[data-gsn-action]{position:relative;z-index:5;pointer-events:auto!important}
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
      setText(small,subtitle);
    });
  }

  function keepMealEntryOpen() {
    const save = main.querySelector('#saveMeal');
    const details = save?.closest('details.manual-entry');
    if (details && !save.disabled && !details.open) details.open = true;
    if (mealEntryScrollY !== null && details) {
      const y = mealEntryScrollY;
      mealEntryScrollY = null;
      requestAnimationFrame(() => window.scrollTo({ top:y, behavior:'auto' }));
    }
  }

  function cleanTodayAnatomy() {
    main.querySelectorAll('.today-body-panel .g3-anatomy-tools').forEach(el => el.remove());
  }

  function ensureLuxuryDrawer(id,label,description,nodes){
    const usable=(nodes||[]).filter(Boolean);
    if(!usable.length)return null;
    let drawer=main.querySelector('#'+id);
    if(!drawer){
      drawer=document.createElement('details');
      drawer.id=id;
      drawer.className='garang-luxury-drawer';
      drawer.dataset.garangDesignDrawer='1';
      const summary=document.createElement('summary');
      summary.innerHTML='<span><b></b><small></small></span><i aria-hidden="true">＋</i>';
      drawer.appendChild(summary);
      const body=document.createElement('div');
      body.className='garang-luxury-drawer-body';
      drawer.appendChild(body);
      const first=usable[0];
      first.parentElement?.insertBefore(drawer,first);
    }
    const summary=drawer.querySelector(':scope>summary');
    setText(summary?.querySelector('b'),label);
    setText(summary?.querySelector('small'),description);
    const body=drawer.querySelector('.garang-luxury-drawer-body');
    usable.forEach(node=>{if(node&&body&&node.parentElement!==body)body.appendChild(node);});
    drawer.open=false;
    return drawer;
  }

  function simplifyWorkout(){
    if(main.dataset.garangScreen!=='workout')return;
    main.dataset.garangDesignV2='workout';
    const builder=main.querySelector('.workout-builder-v2');
    if(!builder)return;
    builder.classList.add('garang-workout-luxury-v2');
    const advanced=builder.querySelector('.workout-advanced-tools');
    const secondary=builder.querySelector('.workout-secondary-capabilities');
    ensureLuxuryDrawer(
      'garangWorkoutTools',
      isKo()?'도구 및 옵션':'Tools & options',
      isKo()?'그룹 · 워밍업 · 플레이트 · 프로그램 · Health':'Group · warm-up · plates · program · Health',
      [advanced,secondary]
    );
    const evidence=main.querySelector('.photo-evidence-card-workout');
    ensureLuxuryDrawer(
      'garangWorkoutEvidence',
      isKo()?'운동 사진':'Workout evidence',
      isKo()?'원할 때만 사진을 기록하세요':'Optional photo evidence',
      [evidence]
    );
    main.querySelectorAll('.compact-history').forEach(node=>node.classList.add('garang-history-quiet'));
  }

  function simplifyProgress(){
    if(main.dataset.garangScreen!=='progress')return;
    main.dataset.garangDesignV2='progress';
    const overview=main.querySelector('#garangAccumulationOverview');
    if(overview)overview.classList.add('garang-progress-luxury-v2');
    main.querySelectorAll('.progress-tabs,.grid.grid-4').forEach(node=>node.classList.add('garang-progress-legacy-detail'));
  }

  function simplifyCoach(){
    if(main.dataset.garangScreen!=='coach')return;
    main.dataset.garangDesignV2='coach';
    const root=main.querySelector('.garang-coach-v2,.coach-app-shell');
    if(root)root.classList.add('garang-coach-luxury-v2');
  }

  function applyP5Cleanup(){
    main.classList.add('garang-p5-clean');
    const screen=main.dataset.garangScreen||'';
    if(['workout','progress','coach','today'].includes(screen))main.dataset.garangLowDensity='1';
    else delete main.dataset.garangLowDensity;
  }

  function internalizeMemorySurface() {
    removeRoute('[data-pagego="memory"], [data-page="memory"]');
    removeRoute('[data-pagego="settings"], [data-page="settings"]');
    cleanMoreSheet();

    main.querySelectorAll('.section-title h2').forEach(title => {
      const text = title.textContent.trim();
      if (text === '계획과 기억' || text.toLowerCase() === 'plan & memory') setText(title,isKo() ? '계획' : 'Plan');
    });

    main.querySelectorAll('.plan-choice li').forEach(item => {
      if (/advanced\s+memory/i.test(item.textContent)) setText(item,isKo() ? '지속 개인화' : 'Persistent personalization');
    });

    /* Product consolidation keeps Memory out of first-level navigation while preserving
       its canonical direct route for capability maintenance and verification. */
  }

  function run() {
    scheduled = false;
    ensureExperienceStyle();
    internalizeMemorySurface();
    decorateMoreSheet();
    cleanTodayAnatomy();
    keepMealEntryOpen();
    simplifyWorkout();
    simplifyProgress();
    simplifyCoach();
    applyP5Cleanup();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => requestAnimationFrame(run));
  }

  /* Screen/state lifecycle replaces broad body reconciliation. */
  window.addEventListener('garang:screen-rendered', schedule);
  window.addEventListener('garang:state-updated', schedule);
  new MutationObserver(schedule).observe(document.documentElement, { attributes:true, attributeFilter:['lang'] });
  document.addEventListener('click', event => {
    if (event.target.closest('#addFood')) mealEntryScrollY = window.scrollY;
    if (event.target.closest('[data-page],[data-pagego],#menuBtn,#settingsTopBtn,#addFood,#saveMeal,#clearMealScan,#confirmMealScan')) {setTimeout(schedule,0);requestAnimationFrame(schedule);}
  }, true);

  window.GarangDesignSimplificationV2=Object.freeze({version:DESIGN_VERSION,sync:schedule});
  schedule();
})();

