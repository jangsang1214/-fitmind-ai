/* GARANG Today Single Next Action v1
   One visible next-action owner on Today.
   Golden Path keeps sequence truth; Today Action Flow keeps the visible CTA surface.
   Existing canonical routes, Record sheet, recovery modal and execution screens remain the mutation owners.
*/
(() => {
  'use strict';
  if (window.GarangTodaySingleNextActionV1) return;

  const main = document.getElementById('main');
  if (!main) return;

  const VERSION = 'garang-today-single-next-action-v1.0.11';
  const STYLE_ID = 'garang-today-single-next-action-v1-style';
  const isKo = () => document.documentElement.lang !== 'en';
  const state = () => { try { return window.GarangAgentStateBridge?.ready?.() ? window.GarangAgentStateBridge.getState() : null; } catch { return null; } };
  const list = value => Array.isArray(value) ? value : [];
  const pad = value => String(value).padStart(2,'0');
  const fallbackLocalDate = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1,'0')}-${pad(d.getDate(),'0')}`; };
  const localDate = () => { try { return window.GarangGoldenPath?.localDate?.() || fallbackLocalDate(); } catch { return fallbackLocalDate(); } };
  const sameDate = (row,date) => String(row?.date || row?.day || row?.performedAt || row?.createdAt || '').slice(0,10) === date;
  const hasTodayCheckin = snapshot => {
    const current = snapshot || state();
    if (!current) return false;
    const today = localDate();
    return [...list(current.dailyCheckins), ...list(current.checkins)].some(row => sameDate(row,today));
  };
  const hasTodayRecord = snapshot => {
    const current = snapshot || state();
    if (!current) return false;
    const today = localDate();
    return ['workouts','meals','runs','body'].some(key => list(current[key]).some(row => sameDate(row,today)));
  };
  const completedOnboarding = snapshot => list(snapshot?.analytics?.events).some(event => event?.name === 'onboarding_completed');
  const activationRecordEvents = new Set(['workout_saved','meal_saved','run_saved','body_saved']);
  const hasActivationRecordEvent = snapshot => list(snapshot?.analytics?.events).some(event => activationRecordEvents.has(event?.name));
  let scheduled = false;
  let delayedTimer = 0;
  let latestModel = null;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #main[data-garang-screen="today"] [data-golden-path-surface]{display:none!important}
      #main[data-garang-screen="today"][data-gsn-action="checkin"] #garangTodayFlow .gtf-action{display:none!important}
      #main[data-garang-screen="today"][data-garang-next-owner="today-action-flow"][data-gsn-action]:not([data-gsn-action="checkin"]) #garangTodayFlow .gtf-action{display:block!important;position:relative!important;z-index:4!important;pointer-events:auto!important}
      #main[data-garang-screen="today"][data-garang-next-owner="today-action-flow"][data-gsn-action]:not([data-gsn-action="checkin"]) #garangTodayFlow .gtf-next[data-gsn-action]{position:relative!important;z-index:5!important;pointer-events:auto!important}
      html body #main[data-garang-screen="today"][data-garang-next-owner="today-action-flow"][data-gsn-checked="true"][data-gsn-action]:not([data-gsn-action="checkin"]) #garangTodayFlow [data-garang-checkin-access="1"],
      html body #main[data-garang-screen="today"][data-garang-next-owner="today-action-flow"][data-gsn-activation="true"][data-gsn-action]:not([data-gsn-action="checkin"]) #garangTodayFlow [data-garang-checkin-access="1"]{display:none!important;pointer-events:none!important}
    `;
    document.head.appendChild(style);
  }

  function currentModel() {
    const Core = window.GarangGoldenPath;
    const snapshot = state();
    if (!Core || !snapshot) return null;
    try { return Core.derive(snapshot, { today:Core.localDate() }); } catch { return null; }
  }

  function actionFor(model) {
    if (!model) return null;
    const ko = isKo();
    if (model.step === 'first_record') return { id:'record', label:ko ? '첫 기록 남기기' : 'Leave first record' };
    if (model.step === 'coach') return { id:'coach', label:ko ? 'Coach에서 판단 보기' : 'Open Coach' };
    if (model.step === 'plan') return model.recoveryReady
      ? { id:'coach', label:ko ? 'Coach에서 계획 제안 받기' : 'Get plan from Coach' }
      : { id:'checkin', label:ko ? '오늘 상태 체크인' : 'Check in today' };
    if (model.step === 'execute') {
      const type = model.nextPlan?.type;
      if (type === 'running') return { id:'execute', label:ko ? '러닝 기록 열기' : 'Open running log' };
      if (type === 'nutrition') return { id:'execute', label:ko ? '식단 기록 열기' : 'Open meal log' };
      if (type === 'recovery') return { id:'execute', label:ko ? '오늘 상태 기록하기' : 'Open recovery check-in' };
      if (type === 'body') return { id:'execute', label:ko ? '체성분 기록 열기' : 'Open body log' };
      return { id:'execute', label:ko ? '운동 기록 열기' : 'Open workout log' };
    }
    if (model.step === 'accumulation') return { id:'accumulation', label:ko ? '누적 확인하기' : 'View accumulation' };
    return null;
  }

  function activationBeforeCheckin(model, snapshot) {
    if (!model || !snapshot) return false;
    if (model.step === 'first_record') return completedOnboarding(snapshot);
    if (model.step === 'coach') return hasTodayRecord(snapshot) && hasActivationRecordEvent(snapshot);
    return false;
  }

  function todayActionFor(model, checkedToday, snapshot) {
    if (checkedToday || activationBeforeCheckin(model, snapshot)) return actionFor(model);
    return { id:'checkin', label:isKo() ? '오늘 상태 체크인' : 'Check in today' };
  }

  function writeButtonLabel(button, label) {
    if (!button) return;
    let textNode = Array.from(button.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
    if (!textNode) {
      textNode = document.createTextNode('');
      button.insertBefore(textNode, button.firstChild || null);
    }
    textNode.nodeValue = label;
    let arrow = button.querySelector(':scope > span[aria-hidden="true"]');
    if (!arrow) {
      arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden','true');
      arrow.textContent = '→';
      button.appendChild(arrow);
    }
  }

  function rememberNative(button) {
    if (!button || button.dataset.gsnNativeSaved === '1') return;
    button.dataset.gsnNativeSaved = '1';
    button.dataset.gsnNativeRoute = button.getAttribute('data-gtf-route') || '';
    button.dataset.gsnNativeAction = button.getAttribute('data-gtf-action') || '';
    button.dataset.gsnNativeLabel = Array.from(button.childNodes).find(node => node.nodeType === Node.TEXT_NODE)?.nodeValue || '';
    button.dataset.gsnNativeGoldenPath = button.getAttribute('data-golden-path') || '';
  }

  function restoreNative(button) {
    if (!button || button.dataset.gsnNativeSaved !== '1') return;
    button.removeAttribute('data-gsn-action');
    button.removeAttribute('data-gsn-step');
    if (button.dataset.gsnNativeRoute) button.setAttribute('data-gtf-route', button.dataset.gsnNativeRoute); else button.removeAttribute('data-gtf-route');
    if (button.dataset.gsnNativeAction) button.setAttribute('data-gtf-action', button.dataset.gsnNativeAction); else button.removeAttribute('data-gtf-action');
    if (button.dataset.gsnNativeGoldenPath) button.setAttribute('data-golden-path', button.dataset.gsnNativeGoldenPath); else button.removeAttribute('data-golden-path');
    writeButtonLabel(button, button.dataset.gsnNativeLabel || '');
  }

  function suppressLegacyCheckin(flow, suppress) {
    const access = flow?.querySelector('[data-garang-checkin-access="1"]');
    if (!access) return;
    if (suppress) {
      access.dataset.gsnSuppressed = '1';
      access.setAttribute('aria-hidden','true');
      access.tabIndex = -1;
    } else {
      delete access.dataset.gsnSuppressed;
      access.removeAttribute('aria-hidden');
      access.removeAttribute('tabindex');
    }
  }

  function sync() {
    scheduled = false;
    ensureStyle();
    if (main.dataset.garangScreen !== 'today') {
      main.removeAttribute('data-garang-next-owner');
      main.removeAttribute('data-gsn-action');
      main.removeAttribute('data-gsn-checked');
      main.removeAttribute('data-gsn-activation');
      main.querySelectorAll('[data-golden-path-surface]').forEach(node => node.remove());
      return;
    }

    const snapshot = state();
    const model = currentModel();
    if (!model || !snapshot) return;
    latestModel = model;
    const checkedToday = hasTodayCheckin(snapshot);
    const activationPriority = !checkedToday && activationBeforeCheckin(model, snapshot);
    main.dataset.gpStep = model.step;
    main.dataset.gpComplete = model.completed ? 'true' : 'false';
    main.dataset.gsnChecked = checkedToday ? 'true' : 'false';
    main.dataset.gsnActivation = activationPriority ? 'true' : 'false';

    /* The legacy Golden Path UI may still calculate/render a sibling surface.
       Keep its routing logic available but never let it become a second visible owner. */
    main.querySelectorAll('[data-golden-path-surface]').forEach(node => node.remove());

    const flow = main.querySelector('#garangTodayFlow');
    if (!flow) return;
    const button = flow.querySelector('.gtf-next');
    const actionWrap = flow.querySelector('.gtf-action');
    const action = todayActionFor(model, checkedToday, snapshot);

    if (!action) {
      main.removeAttribute('data-garang-next-owner');
      main.removeAttribute('data-gsn-action');
      suppressLegacyCheckin(flow, false);
      restoreNative(button);
      return;
    }

    main.dataset.garangNextOwner = 'today-action-flow';
    main.dataset.gsnAction = action.id;
    flow.dataset.garangNextOwner = 'golden-path';

    if (action.id === 'checkin') {
      /* Recovery is the one intentional special case: the existing quiet state-entry
         control remains the single visible action because it owns the canonical modal. */
      restoreNative(button);
      if (actionWrap) actionWrap.style.setProperty('display','none','important');
      suppressLegacyCheckin(flow, false);
      try { window.GarangNonblockingActions?.promoteTodayCheckin?.(); } catch {}
      return;
    }

    if (!button) return;
    rememberNative(button);
    button.removeAttribute('data-gtf-route');
    button.removeAttribute('data-gtf-action');
    button.removeAttribute('data-golden-path');
    button.dataset.gsnAction = action.id;
    button.dataset.gsnStep = model.step;
    button.setAttribute('aria-label', action.label);
    writeButtonLabel(button, action.label);
    if (actionWrap) actionWrap.style.setProperty('display','block','important');
    suppressLegacyCheckin(flow, true);
  }

  function schedule() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => requestAnimationFrame(sync));
    }
    clearTimeout(delayedTimer);
    delayedTimer = setTimeout(sync, 420);
  }

  function afterRoute(route, callback) {
    const listener = event => {
      if (event?.detail?.route !== route) return;
      window.removeEventListener('garang:route-completed', listener);
      requestAnimationFrame(() => requestAnimationFrame(() => callback?.()));
    };
    window.addEventListener('garang:route-completed', listener);
    let ok = false;
    try { ok = window.GarangRouter?.navigate?.(route, { source:'today-single-next-action', force:true }) === true; } catch {}
    if (!ok) window.removeEventListener('garang:route-completed', listener);
    return ok;
  }

  function openRecord() {
    afterRoute('log', () => window.GarangSimplifiedShell?.openRecordSheet?.(document.querySelector('#bottomNav [data-garang-primary-nav="1"][data-page="log"]')));
  }

  function execute(model) {
    const type = model?.nextPlan?.type;
    if (type === 'running') return afterRoute('running');
    if (type === 'nutrition') return afterRoute('nutrition');
    if (type === 'body') return afterRoute('body');
    if (type === 'recovery') return afterRoute('today', () => document.querySelector('[data-action="open-checkin"]')?.click());
    if (type === 'workout') return afterRoute('workout');
    return afterRoute('planner', () => document.querySelector('#garangPlanExecution [data-gx-details]')?.click());
  }

  function handle(action) {
    const model = currentModel() || latestModel;
    if (!model) return;
    if (action === 'record') return openRecord();
    if (action === 'coach') return afterRoute('coach');
    if (action === 'execute') return execute(model);
    if (action === 'accumulation') return afterRoute('progress');
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('#garangTodayFlow [data-gsn-action]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    handle(button.dataset.gsnAction || '');
  }, true);

  for (const eventName of ['garang:screen-rendered','garang:state-updated','garang:state-hydrated','garang:route-completed','garang:agent-proposal-resolved']) window.addEventListener(eventName, schedule);
  document.documentElement.addEventListener('garang:language-changed', schedule);
  window.addEventListener('pageshow', schedule);

  window.GarangTodaySingleNextActionV1 = Object.freeze({ version:VERSION, refresh:schedule, currentModel, actionFor, todayActionFor, hasTodayCheckin, hasTodayRecord, activationBeforeCheckin, hasActivationRecordEvent });
  ensureStyle();
  schedule();
})();
