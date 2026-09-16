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

  const VERSION = '1.0.2';
  const STYLE_ID = 'garang-today-workout-prep-integration-v1-style';
  const PLAN_KEY = 'garang_daily_workout_plan_v1';
  const main = () => document.getElementById('main');
  let queued = false;
  let observedMain = null;
  let mountObserver = null;
  let mountRetryTimer = null;
  let mountRetryDeadline = 0;

  function isEnglish() { return document.documentElement.lang === 'en'; }
  function readPlan() {
    try { return JSON.parse(sessionStorage.getItem(PLAN_KEY) || 'null')?.plan || null; }
    catch { return null; }
  }

  function workoutExpected(button) {
    const model = window.GarangTodaySingleNextActionV1?.currentModel?.();
    const type = model?.nextAction?.actionType || model?.nextPlan?.type || '';
    if (type === 'workout') return true;
    if (!button) return false;
    const marked = button.dataset.garangTodayWorkoutExecute === '1';
    const copy = `${button.textContent || ''} ${button.getAttribute('aria-label') || ''}`;
    const workoutCopy = /운동\s*기록\s*열기|오늘\s*운동\s*실행|Open\s+workout\s+log|Start\s+today(?:'|’)?s\s+workout/i.test(copy);
    return marked || workoutCopy;
  }

  function canonicalWorkoutExecute() {
    const m = main();
    if (!m || m.dataset.garangScreen !== 'today') return null;
    const button = m.querySelector('#garangTodayFlow .gtf-next[data-gsn-action="execute"]');
    return workoutExpected(button) ? button : null;
  }

  function stopMountRetry() {
    if (mountRetryTimer) clearTimeout(mountRetryTimer);
    mountRetryTimer = null;
    mountRetryDeadline = 0;
  }

  function requestWorkoutPreparationMount(m, execute) {
    if (!m || m.dataset.garangScreen !== 'today' || m.querySelector('.garang-daily-workout') || !workoutExpected(execute)) {
      stopMountRetry();
      return;
    }
    const now = Date.now();
    if (!mountRetryDeadline) mountRetryDeadline = now + 3000;
    if (now >= mountRetryDeadline) {
      stopMountRetry();
      return;
    }
    if (mountRetryTimer) return;
    mountRetryTimer = setTimeout(() => {
      mountRetryTimer = null;
      const current = main();
      const currentExecute = current?.querySelector('#garangTodayFlow .gtf-next[data-gsn-action="execute"]');
      if (!current || current.dataset.garangScreen !== 'today' || current.querySelector('.garang-daily-workout') || !workoutExpected(currentExecute)) {
        stopMountRetry();
        return;
      }
      try {
        window.dispatchEvent(new CustomEvent('garang:state-updated', { detail:{ source:'today-workout-prep-mount-retry' } }));
      } catch {}
      requestWorkoutPreparationMount(current,currentExecute);
    },120);
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      html body #main[data-garang-screen="today"][data-garang-workout-prep-execution="1"] .garang-daily-workout{
        display:grid!important;
        visibility:visible!important;
        opacity:1!important;
        pointer-events:auto!important;
      }
      html body #main[data-garang-screen="today"][data-garang-workout-prep-execution="1"] .garang-daily-workout [data-daily-toggle]{
        display:grid!important;
        visibility:visible!important;
        opacity:1!important;
        pointer-events:auto!important;
      }
      html body #main[data-garang-screen="today"][data-garang-workout-prep-execution="1"] #garangTodayFlow .gtf-action{
        max-height:0!important;
        min-height:0!important;
        height:0!important;
        margin-top:0!important;
        margin-bottom:0!important;
        padding-top:0!important;
        padding-bottom:0!important;
        border:0!important;
        overflow:hidden!important;
        opacity:0!important;
        pointer-events:none!important;
      }
      html body #main[data-garang-screen="today"][data-garang-workout-prep-execution="1"] #garangTodayFlow .gtf-next[data-gsn-action="execute"],
      html body #main[data-garang-screen="today"] #garangTodayFlow .gtf-next[data-gsn-action="execute"][data-garang-today-workout-execute="1"]{
        display:none!important;
        pointer-events:none!important;
      }
      html body #main[data-garang-screen="today"] .garang-daily-workout [data-garang-workout-prep-actions="1"]{
        display:none!important;
      }
      html body #main[data-garang-screen="today"][data-garang-workout-prep-execution="1"] .garang-daily-workout [data-garang-workout-prep-actions="1"]{
        display:flex!important;
        gap:8px!important;
        padding:0 0 10px!important;
      }
      html body #main[data-garang-screen="today"][data-garang-workout-prep-execution="1"] .garang-daily-workout [data-garang-workout-prep-start="1"]{
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        width:100%!important;
        min-height:46px!important;
      }
      html body #main[data-garang-screen="today"][data-garang-workout-prep-execution="1"] .garang-daily-workout .garang-daily-summary{
        grid-template-columns:minmax(0,1fr) 36px!important;
      }
      html body #main[data-garang-screen="today"][data-garang-workout-prep-execution="1"] .garang-daily-workout .garang-daily-summary-copy>.eyebrow,
      html body #main[data-garang-screen="today"][data-garang-workout-prep-execution="1"] .garang-daily-workout .garang-daily-summary-mark,
      html body #main[data-garang-screen="today"][data-garang-workout-prep-execution="1"] .garang-daily-workout .garang-daily-head>div,
      html body #main[data-garang-screen="today"][data-garang-workout-prep-execution="1"] .garang-daily-workout .garang-daily-result>.garang-daily-note{
        display:none!important;
      }
      html body #main[data-garang-screen="today"][data-garang-workout-prep-execution="1"] .garang-daily-workout .garang-daily-head{
        min-height:32px!important;
        justify-content:flex-end!important;
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
    const expand = card?.querySelector('[data-daily-expand]');
    const head = expand?.querySelector('.garang-daily-head');
    if (!expand || !head) return null;
    let actionRow = expand.querySelector(':scope > [data-garang-workout-prep-actions="1"]');
    if (!actionRow) {
      actionRow = document.createElement('div');
      actionRow.className = 'garang-daily-actions garang-workout-prep-actions';
      actionRow.dataset.garangWorkoutPrepActions = '1';
      expand.insertBefore(actionRow, head);
    }
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
    if (button.textContent !== label) button.textContent = label;
    if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label);
    return button;
  }

  function setImportant(node, property, value) {
    if (!node) return;
    if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === 'important') return;
    node.style.setProperty(property, value, 'important');
  }

  function revealPreparation(card) {
    if (!card) return;
    if (card.hidden) card.hidden = false;
    if (card.getAttribute('aria-hidden') === 'true') card.removeAttribute('aria-hidden');
    if (card.dataset.garangWorkoutPrepVisibilityOwner !== '1') card.dataset.garangWorkoutPrepVisibilityOwner = '1';
    setImportant(card,'display','grid');
    setImportant(card,'visibility','visible');
    setImportant(card,'opacity','1');
    setImportant(card,'pointer-events','auto');
    const toggle = card.querySelector('[data-daily-toggle]');
    if (!toggle) return;
    if (toggle.hidden) toggle.hidden = false;
    if (toggle.getAttribute('aria-hidden') === 'true') toggle.removeAttribute('aria-hidden');
    if (toggle.getAttribute('tabindex') === '-1') toggle.removeAttribute('tabindex');
    if (toggle.dataset.garangWorkoutPrepVisibilityOwner !== '1') toggle.dataset.garangWorkoutPrepVisibilityOwner = '1';
    setImportant(toggle,'display','grid');
    setImportant(toggle,'visibility','visible');
    setImportant(toggle,'opacity','1');
    setImportant(toggle,'pointer-events','auto');
  }

  function releasePreparationVisibility(card) {
    if (!card) return;
    if (card.dataset.garangWorkoutPrepVisibilityOwner === '1') {
      delete card.dataset.garangWorkoutPrepVisibilityOwner;
      for (const property of ['display','visibility','opacity','pointer-events']) card.style.removeProperty(property);
    }
    const toggle = card.querySelector('[data-daily-toggle]');
    if (toggle?.dataset?.garangWorkoutPrepVisibilityOwner === '1') {
      delete toggle.dataset.garangWorkoutPrepVisibilityOwner;
      for (const property of ['display','visibility','opacity','pointer-events']) toggle.style.removeProperty(property);
    }
  }

  function concealCanonical(button) {
    if (!button) return;
    if (!button.hidden) button.hidden = true;
    if (button.style.getPropertyValue('display') !== 'none' || button.style.getPropertyPriority('display') !== 'important') {
      button.style.setProperty('display','none','important');
    }
    if (button.getAttribute('aria-hidden') !== 'true') button.setAttribute('aria-hidden','true');
    if (button.tabIndex !== -1) button.tabIndex = -1;
  }

  function stabilizeExpectedPresentation(m = main()) {
    if (!m || m.dataset.garangScreen !== 'today') return false;
    const card = m.querySelector('.garang-daily-workout');
    const execute = m.querySelector('#garangTodayFlow .gtf-next[data-gsn-action="execute"]');
    if (!card || !workoutExpected(execute)) return false;
    stopMountRetry();
    if (m.dataset.garangWorkoutPrepExecution !== '1') m.dataset.garangWorkoutPrepExecution = '1';
    if (card.dataset.garangWorkoutPrepExecution !== '1') card.dataset.garangWorkoutPrepExecution = '1';
    revealPreparation(card);
    concealCanonical(execute);
    return true;
  }

  function restorePresentation(m,card) {
    if (m?.hasAttribute('data-garang-workout-prep-execution')) m.removeAttribute('data-garang-workout-prep-execution');
    if (card) {
      releasePreparationVisibility(card);
      if (card.hasAttribute('data-garang-workout-prep-execution')) delete card.dataset.garangWorkoutPrepExecution;
      const generate = card.querySelector('[data-daily-generate]');
      if (generate) {
        generate.classList.remove('ghost');
        generate.classList.add('primary');
      }
    }
    const current = m?.querySelector('#garangTodayFlow .gtf-next[data-gsn-action]');
    if (current) {
      if (current.hidden) current.hidden = false;
      if (current.style.getPropertyValue('display')) current.style.removeProperty('display');
      if (current.hasAttribute('aria-hidden')) current.removeAttribute('aria-hidden');
      if (current.hasAttribute('tabindex')) current.removeAttribute('tabindex');
    }
  }

  function reconcile() {
    queued = false;
    ensureStyle();
    const m = main();
    if (!m || m.dataset.garangScreen !== 'today') {
      stopMountRetry();
      if (m?.hasAttribute('data-garang-workout-prep-execution')) m.removeAttribute('data-garang-workout-prep-execution');
      return;
    }

    const card = m.querySelector('.garang-daily-workout');
    const execute = m.querySelector('#garangTodayFlow .gtf-next[data-gsn-action="execute"]');
    const expected = workoutExpected(execute);
    if (expected && !card) requestWorkoutPreparationMount(m,execute);
    else if (card || !expected) stopMountRetry();
    const start = card ? ensureStartButton(card) : null;

    if (expected && card && start) {
      stabilizeExpectedPresentation(m);
      const generate = card.querySelector('[data-daily-generate]');
      if (generate) {
        generate.classList.remove('primary');
        generate.classList.add('ghost');
      }
      return;
    }

    restorePresentation(m,card);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => requestAnimationFrame(reconcile));
  }

  function observeMounts() {
    const m = main();
    if (!m || m === observedMain) return;
    mountObserver?.disconnect();
    observedMain = m;
    mountObserver = new MutationObserver(() => {
      stabilizeExpectedPresentation(m);
      schedule();
    });
    mountObserver.observe(m, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:[
        'class',
        'data-gsn-action',
        'data-gsn-step',
        'data-garang-today-workout-execute',
        'data-garang-screen',
        'data-garang-workout-prep-execution',
        'hidden',
        'style',
        'aria-hidden',
        'tabindex'
      ]
    });
  }

  for (const eventName of [
    'garang:workout-intelligence-rendered',
    'garang:screen-rendered',
    'garang:route-completed',
    'garang:state-updated',
    'garang:state-hydrated',
    'pageshow'
  ]) window.addEventListener(eventName, () => { observeMounts(); stabilizeExpectedPresentation(); schedule(); });

  ensureStyle();
  observeMounts();
  stabilizeExpectedPresentation();
  schedule();
  window.GarangTodayWorkoutPrepIntegrationV1 = Object.freeze({
    version:VERSION,
    reconcile:schedule,
    start:startWorkout
  });
})();
