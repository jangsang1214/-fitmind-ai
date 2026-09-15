/* GARANG Today Workout Preparation Integration v1
   Founder-directed Today simplification:
   - keeps Golden Path as the canonical workout execution owner
   - moves the visible workout-start entry into `오늘 운동 준비하기`
   - hides the duplicate standalone execution CTA only when the preparation card is ready
   - reuses the existing Workout Intelligence import path when a generated workout exists
   No state schema, plan mutation, or Workout write ownership changes.
*/
(() => {
  'use strict';
  if (window.GarangTodayWorkoutPrepIntegrationV1) return;

  const VERSION = '1.0.0';
  const STYLE_ID = 'garang-today-workout-prep-integration-v1-style';
  const PLAN_KEY = 'garang_daily_workout_plan_v1';
  const main = () => document.getElementById('main');
  let queued = false;

  function isEnglish() { return document.documentElement.lang === 'en'; }
  function readPlan() {
    try { return JSON.parse(sessionStorage.getItem(PLAN_KEY) || 'null')?.plan || null; }
    catch { return null; }
  }

  function canonicalWorkoutExecute() {
    const m = main();
    if (!m || m.dataset.garangScreen !== 'today') return null;
    const model = window.GarangTodaySingleNextActionV1?.currentModel?.();
    const type = model?.nextAction?.actionType || model?.nextPlan?.type;
    if (model?.nextAction?.action !== 'execute' || type !== 'workout') return null;
    return m.querySelector('#garangTodayFlow .gtf-next[data-gsn-action="execute"]');
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      html body #main[data-garang-screen="today"][data-garang-workout-prep-execution="1"] #garangTodayFlow .gtf-action{
        display:none!important;
        pointer-events:none!important;
      }
      html body #main[data-garang-screen="today"] .garang-daily-workout [data-garang-workout-prep-start="1"]{
        display:none!important;
      }
      html body #main[data-garang-screen="today"][data-garang-workout-prep-execution="1"] .garang-daily-workout [data-garang-workout-prep-start="1"]{
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        min-height:46px!important;
        flex:1 1 150px!important;
      }
      html body #main[data-garang-screen="today"][data-garang-workout-prep-execution="1"] .garang-daily-workout .garang-daily-summary{
        grid-template-columns:minmax(0,1fr) 36px!important;
      }
      html body #main[data-garang-screen="today"][data-garang-workout-prep-execution="1"] .garang-daily-workout .garang-daily-summary-copy>.eyebrow,
      html body #main[data-garang-screen="today"][data-garang-workout-prep-execution="1"] .garang-daily-workout .garang-daily-summary-mark,
      html body #main[data-garang-screen="today"][data-garang-workout-prep-execution="1"] .garang-daily-workout .garang-daily-head,
      html body #main[data-garang-screen="today"][data-garang-workout-prep-execution="1"] .garang-daily-workout .garang-daily-result>.garang-daily-note{
        display:none!important;
      }
      html body #main[data-garang-screen="today"][data-garang-workout-prep-execution="1"] .garang-daily-workout .garang-daily-result [data-daily-import]{
        display:none!important;
      }
      html body #main[data-garang-screen="today"][data-garang-workout-prep-execution="1"] .garang-daily-workout [data-daily-generate]{
        min-height:46px!important;
      }
    `;
    document.head.appendChild(style);
  }

  function startWorkout(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const m = main();
    const card = m?.querySelector('.garang-daily-workout');
    if (!m || !card) return false;

    const storedPlan = readPlan();
    const importButton = storedPlan?.exercises?.length ? card.querySelector('[data-daily-import]:not([disabled])') : null;
    if (importButton) {
      importButton.click();
      return true;
    }

    const canonical = canonicalWorkoutExecute();
    if (!canonical) return false;
    canonical.click();
    return true;
  }

  function ensureStartButton(card) {
    const actionRow = card?.querySelector('[data-daily-expand] > .garang-daily-actions');
    if (!actionRow) return null;
    let button = actionRow.querySelector('[data-garang-workout-prep-start="1"]');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'primary';
      button.dataset.garangWorkoutPrepStart = '1';
      button.addEventListener('click', startWorkout);
      actionRow.appendChild(button);
    }
    const label = isEnglish() ? 'Start workout' : '운동 시작';
    button.textContent = label;
    button.setAttribute('aria-label', label);
    return button;
  }

  function reconcile() {
    queued = false;
    ensureStyle();
    const m = main();
    if (!m || m.dataset.garangScreen !== 'today') {
      m?.removeAttribute('data-garang-workout-prep-execution');
      return;
    }

    const card = m.querySelector('.garang-daily-workout');
    const canonical = canonicalWorkoutExecute();
    const start = card ? ensureStartButton(card) : null;
    const integrated = !!(card && canonical && start);

    if (integrated) {
      m.dataset.garangWorkoutPrepExecution = '1';
      card.dataset.garangWorkoutPrepExecution = '1';
      canonical.setAttribute('aria-hidden','true');
      canonical.tabIndex = -1;
      const generate = card.querySelector('[data-daily-generate]');
      if (generate) generate.classList.remove('primary');
      if (generate) generate.classList.add('ghost');
    } else {
      m.removeAttribute('data-garang-workout-prep-execution');
      if (card) delete card.dataset.garangWorkoutPrepExecution;
      if (canonical) {
        canonical.removeAttribute('aria-hidden');
        canonical.removeAttribute('tabindex');
      }
    }
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => requestAnimationFrame(reconcile));
  }

  for (const eventName of [
    'garang:workout-intelligence-rendered',
    'garang:screen-rendered',
    'garang:route-completed',
    'garang:state-updated',
    'garang:state-hydrated',
    'pageshow'
  ]) window.addEventListener(eventName, schedule);

  ensureStyle();
  schedule();
  window.GarangTodayWorkoutPrepIntegrationV1 = Object.freeze({
    version:VERSION,
    reconcile:schedule,
    start:startWorkout
  });
})();
