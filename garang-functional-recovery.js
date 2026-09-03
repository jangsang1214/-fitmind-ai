/* GARANG FUNCTIONAL RECOVERY v1.0
   Repairs the current reference-layer regressions without replacing canonical app.js logic. */
(() => {
  'use strict';
  const main = document.getElementById('main');
  if (!main) return;

  const inlineMark = () => `
    <svg class="garang-inline-mark" viewBox="0 0 120 140" aria-hidden="true" focusable="false">
      <g fill="#F0EDE7" fill-rule="evenodd"><path d="M60 4C60 28 59 43 55 54C51 65 44 72 36 83C32 89 34 94 40 98C45 102 52 104 60 104C68 104 75 102 80 98C86 94 88 89 84 83C76 72 69 65 65 54C61 43 60 28 60 4ZM60 56C57 64 51 71 44 80C39 86 38 89 41 92C45 96 52 98 60 98C68 98 75 96 79 92C82 89 81 86 76 80C69 71 63 64 60 56Z"/></g>
      <g fill="none" stroke="#F0EDE7" stroke-linecap="round"><ellipse cx="60" cy="119" rx="12" ry="3.2" stroke-width="1.8"/><ellipse cx="60" cy="122" rx="27" ry="6.3" stroke-width="1.65" opacity=".94"/></g>
    </svg>`;

  function killCachedFacades() {
    document.querySelectorAll('.grx-facade,.grx-anatomy,.grx-reference-anatomy,[data-reference-bitmap="anatomy"]').forEach(el => el.remove());
    document.querySelectorAll('.grx-reference-original').forEach(el => { el.classList.remove('grx-reference-original'); });
  }

  function repairCoach() {
    document.querySelectorAll('.gpt-avatar').forEach(avatar => {
      if (avatar.querySelector('.garang-inline-mark')) return;
      avatar.innerHTML = inlineMark();
    });
    // If any old broken reference image survived in Coach chrome, remove the image instead of showing a blue ? box.
    document.querySelectorAll('.coach-app-shell img').forEach(img => {
      if (/garang-mark|brand|logo/i.test(img.getAttribute('src') || '') && !img.complete) img.remove();
    });
  }

  function muscleKeyFromZone(zone) {
    const names = ['chest','back','shoulders','biceps','triceps','core','legs'];
    return names.find(k => zone.classList.contains(`muscle-${k}`)) || null;
  }

  function makeModelInteractive() {
    const map = main.querySelector('.workout-hero-v2 .muscle-map.anatomical-pro');
    if (!map) return;
    map.querySelectorAll('.muscle-zone').forEach(zone => {
      const key = muscleKeyFromZone(zone);
      if (!key) return;
      zone.setAttribute('role','button');
      zone.setAttribute('tabindex','0');
      zone.setAttribute('aria-label',`${key} 운동 보기`);
      if (zone.dataset.garangModelBound === '1') return;
      zone.dataset.garangModelBound = '1';
      const activate = () => {
        const pick = main.querySelector(`[data-muscle-pick="${key}"]`);
        if (pick) pick.click();
      };
      zone.addEventListener('click', activate);
      zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
    });
  }

  function scrollToTarget(selector, activeButton) {
    const target = main.querySelector(selector);
    if (!target) return;
    main.querySelectorAll('.garang-workout-tabs button').forEach(b => b.classList.toggle('active', b === activeButton));
    target.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function repairWorkout() {
    const hero = main.querySelector('.workout-hero-v2');
    const builder = main.querySelector('.workout-builder-v2');
    if (!hero || !builder) return;

    // Never allow a static reference photograph to replace the real inline SVG body model.
    hero.querySelectorAll('img,picture,canvas').forEach(el => el.remove());
    document.querySelectorAll('.grx-anatomy,.workout-reference-image').forEach(el => el.remove());

    // Remove the old fake Start Session/tab layer if an old cached script injected it.
    main.querySelectorAll('.gx-screen-tabs,.gx-workout-start,.gx-workout-summary').forEach(el => el.remove());
    delete main.dataset.gxWorkoutTab;

    if (!main.querySelector('.garang-workout-tabs')) {
      const tabs = document.createElement('nav');
      tabs.className = 'garang-workout-tabs';
      tabs.setAttribute('aria-label','Workout sections');
      tabs.innerHTML = '<button type="button" class="active">Overview</button><button type="button">Exercises</button><button type="button">Log</button>';
      const buttons = tabs.querySelectorAll('button');
      buttons[0].onclick = () => scrollToTarget('.workout-hero-v2', buttons[0]);
      buttons[1].onclick = () => scrollToTarget('.exercise-visual-library', buttons[1]);
      buttons[2].onclick = () => scrollToTarget('.workout-builder-v2', buttons[2]);
      hero.parentNode.insertBefore(tabs, hero);
    }

    if (!main.querySelector('.garang-session-start')) {
      const start = document.createElement('button');
      start.type = 'button';
      start.className = 'garang-session-start';
      start.textContent = '세션 기록 시작';
      start.onclick = () => {
        builder.scrollIntoView({behavior:'smooth',block:'start'});
        requestAnimationFrame(() => main.querySelector('#wName')?.focus());
      };
      hero.insertAdjacentElement('afterend', start);
    }

    // Explicitly restore the real logger controls even if stale CSS tried to hide them.
    [builder, main.querySelector('#addWorkout'), main.querySelector('#clearWorkoutDraft'), main.querySelector('#saveWorkoutSession')].filter(Boolean).forEach(el => {
      el.style.removeProperty('display');
      el.style.removeProperty('visibility');
      el.style.removeProperty('opacity');
    });

    makeModelInteractive();
  }

  function navigateAny(page) {
    // Canonical `go()` is private inside app.js. Reuse an already-bound primary nav button as a safe proxy.
    const proxy = document.querySelector('#bottomNav button');
    if (!proxy) return;
    const old = proxy.dataset.page;
    proxy.dataset.page = page;
    proxy.click();
    proxy.dataset.page = old;
  }

  function openMore() {
    document.querySelector('.garang-more-sheet')?.remove();
    const sheet = document.createElement('div');
    sheet.className = 'garang-more-sheet';
    sheet.innerHTML = `<section class="garang-more-panel" role="dialog" aria-modal="true" aria-label="GARANG 전체 기능">
      <div class="garang-more-head"><strong>GARANG</strong><button type="button" aria-label="닫기">×</button></div>
      <div class="garang-more-grid">
        <button data-route="running">Running<small>GPS · pace · records</small></button>
        <button data-route="planner">Planner<small>plans · AI suggestions</small></button>
        <button data-route="memory">Memory<small>long-term context</small></button>
        <button data-route="progress">Progress<small>analytics · weekly review</small></button>
        <button data-route="profile">Profile<small>body · goals</small></button>
        <button data-route="settings">Settings<small>sync · plan · data</small></button>
        <button data-route="log">All Logs<small>workout · food · run · body</small></button>
        <button data-route="onboarding">User Model<small>goal · preference</small></button>
      </div>
    </section>`;
    document.body.appendChild(sheet);
    sheet.querySelector('.garang-more-head button').onclick = () => sheet.remove();
    sheet.addEventListener('click', e => { if (e.target === sheet) sheet.remove(); });
    sheet.querySelectorAll('[data-route]').forEach(b => b.onclick = () => { const route=b.dataset.route; sheet.remove(); navigateAny(route); });
  }

  function bindGlobalRecovery() {
    const menu = document.getElementById('menuBtn');
    if (menu && menu.dataset.garangRecoveryBound !== '1') {
      menu.dataset.garangRecoveryBound = '1';
      menu.addEventListener('click', openMore);
    }
  }

  function repair() {
    killCachedFacades();
    repairCoach();
    repairWorkout();
    bindGlobalRecovery();
  }

  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; repair(); });
  });
  observer.observe(main,{childList:true,subtree:true});
  repair();
})();
