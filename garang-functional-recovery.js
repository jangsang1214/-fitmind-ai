/* GARANG FUNCTIONAL RECOVERY v1.1
   Keep canonical app.js in control; repair only UI regressions introduced by reference facades. */
(() => {
  'use strict';
  const main = document.getElementById('main');
  if (!main) return;
  const EXACT_MARK = './garang-mark.svg?v=approved-exact-20260903';
  const SESSION_KEY = 'garang_live_workout_session_v1';
  let sessionTimer = null;

  function killCachedFacades() {
    document.querySelectorAll('.grx-facade,.grx-anatomy,.grx-reference-anatomy,.workout-reference-image,[data-reference-bitmap="anatomy"]').forEach(el => el.remove());
    document.querySelectorAll('.grx-reference-original').forEach(el => el.classList.remove('grx-reference-original'));
  }

  function repairBrandImages() {
    document.querySelectorAll('img[src*="garang-mark.svg"]').forEach(img => {
      if (img.dataset.garangExact === '1') return;
      img.dataset.garangExact = '1';
      img.src = EXACT_MARK;
      img.addEventListener('error', () => {
        img.style.display = 'none';
        img.parentElement?.classList.add('garang-mark-load-fallback');
      }, {once:true});
    });
  }

  function repairCoach() {
    document.querySelectorAll('.gpt-avatar').forEach(avatar => {
      if (avatar.querySelector('img[data-garang-exact="1"]')) return;
      avatar.innerHTML = `<img data-garang-exact="1" src="${EXACT_MARK}" alt="GARANG">`;
      const img = avatar.querySelector('img');
      img?.addEventListener('error', () => {
        avatar.innerHTML = '<span class="garang-avatar-word">GARANG</span>';
      }, {once:true});
    });
    document.querySelectorAll('.coach-app-shell img').forEach(img => {
      if (/garang-mark|brand|logo/i.test(img.getAttribute('src') || '')) img.src = EXACT_MARK;
    });
  }

  function muscleKeyFromZone(zone) {
    return ['chest','back','shoulders','biceps','triceps','core','legs'].find(k => zone.classList.contains(`muscle-${k}`)) || null;
  }

  function makeModelInteractive() {
    const maps = main.querySelectorAll('.muscle-map.anatomical-pro');
    maps.forEach(map => {
      map.querySelectorAll('.muscle-zone').forEach(zone => {
        const key = muscleKeyFromZone(zone);
        if (!key) return;
        zone.setAttribute('role','button');
        zone.setAttribute('tabindex','0');
        zone.setAttribute('aria-label',`${key} 운동 필터`);
        if (zone.dataset.garangModelBound === '1') return;
        zone.dataset.garangModelBound = '1';
        const activate = () => {
          const pick = main.querySelector(`[data-muscle-pick="${key}"]`);
          if (pick) pick.click();
        };
        zone.addEventListener('click', activate);
        zone.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
        });
      });
    });
  }

  function scrollToTarget(selector, activeButton) {
    const target = main.querySelector(selector);
    if (!target) return;
    main.querySelectorAll('.garang-workout-tabs button').forEach(b => b.classList.toggle('active', b === activeButton));
    target.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function readLiveSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
  }
  function writeLiveSession(value) {
    if (value) sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(SESSION_KEY);
  }
  function formatElapsed(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    return h ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  function updateLiveSessionBar() {
    const bar = main.querySelector('.garang-live-session');
    if (!bar) return;
    const live = readLiveSession();
    if (!live) { bar.remove(); clearInterval(sessionTimer); sessionTimer=null; return; }
    const time = bar.querySelector('[data-live-elapsed]');
    if (time) time.textContent = formatElapsed(Date.now() - live.startedAt);
  }
  function startLiveSession(builder) {
    let live = readLiveSession();
    if (!live) {
      live = {startedAt:Date.now()};
      writeLiveSession(live);
    }
    ensureLiveSessionBar(builder);
    builder.scrollIntoView({behavior:'smooth',block:'start'});
    requestAnimationFrame(() => main.querySelector('#wName')?.focus());
  }
  function ensureLiveSessionBar(builder) {
    if (!readLiveSession() || main.querySelector('.garang-live-session')) return;
    const bar = document.createElement('section');
    bar.className = 'garang-live-session';
    bar.innerHTML = `<div><small>ACTIVE SESSION</small><strong data-live-elapsed>00:00</strong><span>종목을 추가하고 세션 저장을 누르면 실제 기록에 저장됩니다.</span></div><button type="button" data-live-cancel>종료</button>`;
    builder.parentNode.insertBefore(bar,builder);
    bar.querySelector('[data-live-cancel]').onclick = () => {
      if (window.confirm('현재 진행 표시를 종료할까요? 추가한 운동 초안은 유지됩니다.')) {
        writeLiveSession(null); updateLiveSessionBar();
      }
    };
    updateLiveSessionBar();
    if (!sessionTimer) sessionTimer=setInterval(updateLiveSessionBar,1000);
  }

  function repairWorkout() {
    const hero = main.querySelector('.workout-hero-v2');
    const builder = main.querySelector('.workout-builder-v2');
    if (!hero || !builder) return;

    // The model must be the real DOM/SVG model generated by canonical app.js, never a screenshot/photo.
    hero.querySelectorAll('img,picture,canvas').forEach(el => el.remove());
    document.querySelectorAll('.grx-anatomy,.workout-reference-image').forEach(el => el.remove());
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
      start.textContent = readLiveSession() ? '진행 중인 세션 계속' : '세션 기록 시작';
      start.onclick = () => startLiveSession(builder);
      hero.insertAdjacentElement('afterend', start);
    }

    [builder, main.querySelector('#addWorkout'), main.querySelector('#clearWorkoutDraft'), main.querySelector('#saveWorkoutSession')].filter(Boolean).forEach(el => {
      el.style.setProperty('display', el.tagName === 'BUTTON' ? 'flex' : 'block', 'important');
      el.style.setProperty('visibility','visible','important');
      el.style.setProperty('opacity','1','important');
    });

    const save = main.querySelector('#saveWorkoutSession');
    if (save && save.dataset.garangRecoveryBound !== '1') {
      save.dataset.garangRecoveryBound='1';
      save.addEventListener('click', () => {
        // Canonical app.js performs validation + persistence. We only clear the live timer when a real draft existed.
        if (main.querySelectorAll('[data-remove-workout]').length > 0) setTimeout(() => { writeLiveSession(null); clearInterval(sessionTimer); sessionTimer=null; }, 100);
      }, true);
    }

    ensureLiveSessionBar(builder);
    makeModelInteractive();
  }

  function navigateAny(page) {
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
        <button data-route="nutrition">Nutrition<small>Meal Scan · macros · meals</small></button>
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
    repairBrandImages();
    repairCoach();
    repairWorkout();
    bindGlobalRecovery();
  }

  let queued=false;
  const observer=new MutationObserver(()=>{
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;repair();});
  });
  observer.observe(main,{childList:true,subtree:true});
  repair();
})();
