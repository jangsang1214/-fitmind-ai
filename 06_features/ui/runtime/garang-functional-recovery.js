/* GARANG FUNCTIONAL RECOVERY v1.5
   Keep canonical app.js in control; repair only UI regressions introduced by reference facades.
   Destructive visible actions use non-blocking in-app confirmation for iOS/WebView safety.
   Data recovery ownership is delegated to GarangDataMigrationV2 so observers cannot fight over #importLegacy. */
(() => {
  'use strict';
  const main = document.getElementById('main');
  if (!main) return;
  const EXACT_MARK = './garang-mark.svg?v=approved-exact-20260903';
  const SESSION_KEY = 'garang_live_workout_session_v1';
  let sessionTimer = null;
  let cancelConfirmTimer = null;

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
      img?.addEventListener('error', () => { avatar.innerHTML = '<span class="garang-avatar-word">GARANG</span>'; }, {once:true});
    });
    document.querySelectorAll('.coach-app-shell img').forEach(img => {
      if (/garang-mark|brand|logo/i.test(img.getAttribute('src') || '') && img.getAttribute('src') !== EXACT_MARK) img.src = EXACT_MARK;
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
        if (zone.getAttribute('role') !== 'button') zone.setAttribute('role','button');
        if (zone.getAttribute('tabindex') !== '0') zone.setAttribute('tabindex','0');
        const label=`${key} 운동 필터`;if(zone.getAttribute('aria-label')!==label)zone.setAttribute('aria-label',label);
        if (zone.dataset.garangModelBound === '1') return;
        zone.dataset.garangModelBound = '1';
        const activate = () => { const pick = main.querySelector(`[data-muscle-pick="${key}"]`); if (pick) pick.click(); };
        zone.addEventListener('click', activate);
        zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
      });
    });
  }

  function scrollToTarget(selector, activeButton) {
    const target = main.querySelector(selector);if (!target) return;
    main.querySelectorAll('.garang-workout-tabs button').forEach(b => b.classList.toggle('active', b === activeButton));
    target.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function retireLegacyWorkoutSessionOwner(){
    try{sessionStorage.removeItem(SESSION_KEY);}catch{}
    main.querySelectorAll('.garang-session-start,.garang-live-session').forEach(node=>node.remove());
    if(sessionTimer){clearInterval(sessionTimer);sessionTimer=null;}
    if(cancelConfirmTimer){clearTimeout(cancelConfirmTimer);cancelConfirmTimer=null;}
  }

  function repairWorkout() {
    const hero=main.querySelector('.workout-hero-v2'),builder=main.querySelector('.workout-builder-v2');if(!hero||!builder)return;
    hero.querySelectorAll('img,picture,canvas').forEach(el=>el.remove());document.querySelectorAll('.grx-anatomy,.workout-reference-image').forEach(el=>el.remove());main.querySelectorAll('.gx-screen-tabs,.gx-workout-start,.gx-workout-summary').forEach(el=>el.remove());delete main.dataset.gxWorkoutTab;
    main.querySelectorAll('.garang-workout-tabs').forEach(el=>el.remove());
    retireLegacyWorkoutSessionOwner();
    makeModelInteractive();
  }

  function navigateAny(page) {
    try {
      return window.GarangRouter?.navigate?.(page,{source:'functional-recovery-more',force:true}) === true;
    } catch {
      return false;
    }
  }
  function openMore() {
    document.querySelector('.garang-more-sheet')?.remove();const sheet=document.createElement('div');sheet.className='garang-more-sheet';sheet.innerHTML=`<section class="garang-more-panel" role="dialog" aria-modal="true" aria-label="GARANG 전체 기능"><div class="garang-more-head"><strong>GARANG</strong><button type="button" aria-label="닫기">×</button></div><div class="garang-more-grid"><button data-route="running">Running<small>GPS · pace · records</small></button><button data-route="nutrition">Nutrition<small>Meal Scan · macros · meals</small></button><button data-route="planner">Planner<small>plans · AI suggestions</small></button><button data-route="memory">Memory<small>long-term context</small></button><button data-route="progress">Progress<small>analytics · weekly review</small></button><button data-route="profile">Profile<small>body · goals</small></button><button data-route="settings">Settings<small>sync · plan · data</small></button><button data-route="log">All Logs<small>workout · food · run · body</small></button><button data-route="onboarding">User Model<small>goal · preference</small></button></div></section>`;
    document.body.appendChild(sheet);sheet.querySelector('.garang-more-head button').onclick=()=>sheet.remove();sheet.addEventListener('click',e=>{if(e.target===sheet)sheet.remove();});sheet.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>{const route=b.dataset.route;if(!navigateAny(route)){const toast=document.getElementById('toast');if(toast){toast.textContent='화면을 열지 못했습니다.';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1800);}}else{sheet.remove();}});
  }
  function bindGlobalRecovery(){const menu=document.getElementById('menuBtn');if(menu&&menu.dataset.garangRecoveryBound!=='1'){menu.dataset.garangRecoveryBound='1';menu.addEventListener('click',openMore);}}
  function repairDataActions(){
    const exportButton=main.querySelector('#exportData');
    if(exportButton&&window.GarangSyncDurabilityRuntime?.exportVerifiedBackup&&exportButton.dataset.garangVerifiedExport!=='1'){
      exportButton.onclick=()=>window.GarangSyncDurabilityRuntime.exportVerifiedBackup();
      exportButton.dataset.garangVerifiedExport='1';
    }

    const importButton=main.querySelector('#importLegacy'),migration=window.GarangDataMigrationV2;
    if(!importButton||!migration?.importLegacy)return;
    const marker=migration.version||'recovery';
    const label='데이터 복구 확인';
    const title='기기·클라우드·백업의 기록을 확인하고 누락 기록을 안전하게 병합합니다.';
    if(importButton.textContent!==label)importButton.textContent=label;
    if(importButton.title!==title)importButton.title=title;
    if(importButton.dataset.garangSafeImport!==marker){
      importButton.onclick=()=>migration.importLegacy();
      importButton.dataset.garangSafeImport=marker;
    }
  }

  function repair(){killCachedFacades();repairBrandImages();repairCoach();repairWorkout();bindGlobalRecovery();repairDataActions();}
  let queued=false;function scheduleRepair(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;repair();});}
  window.addEventListener('garang:screen-rendered',scheduleRepair);
  window.addEventListener('garang:state-updated',scheduleRepair);
  window.addEventListener('garang:coach-mounted',scheduleRepair);
  window.addEventListener('garang:coach-message-rendered',scheduleRepair);
  window.addEventListener('pageshow',scheduleRepair);
  document.addEventListener('click',event=>{if(event.target.closest('#addWorkout,#clearWorkoutDraft,#saveWorkoutSession,[data-edit-workout],[data-remove-workout],#exportData,#importLegacy'))setTimeout(scheduleRepair,0);},true);
  repair();
})();
