/* GARANG Today Check-in Override v1
   Founder-directed UI fix for the Today workout-execution state:
   - the canonical workout execute action stays functional and visible as a quieter plan action
   - the bottom-most affordance is the existing canonical Check-in control
   - dark Today actions keep readable ivory-white text
   No state schema or write ownership changes.
*/
(() => {
  'use strict';
  if (window.GarangTodayCheckinOverrideV1) return;

  const main = () => document.getElementById('main');
  const executeSelector = '#garangTodayFlow .gtf-next[data-gsn-action="execute"]';
  let queued = false;
  let observer = null;
  let observedMain = null;

  function ensureStyle() {
    if (document.getElementById('garang-today-checkin-override-v1-style')) return;
    const style = document.createElement('style');
    style.id = 'garang-today-checkin-override-v1-style';
    style.textContent = `
      html body #main[data-garang-screen="today"] #garangTodayFlow .gtf-next{
        background:#080908!important;
        border-color:rgba(242,239,233,.22)!important;
        color:#f7f5f1!important;
        box-shadow:none!important;
      }
      html body #main[data-garang-screen="today"] #garangTodayFlow .gtf-next>span{
        color:#f7f5f1!important;
      }
      html body #main[data-garang-screen="today"] ${executeSelector}[data-garang-today-workout-execute="1"]{
        min-height:48px!important;
        font-size:0!important;
      }
      html body #main[data-garang-screen="today"] ${executeSelector}[data-garang-today-workout-execute="1"]::before{
        content:"오늘 운동 실행";
        color:#f7f5f1!important;
        font:600 11px/1 "Noto Sans KR",Inter,system-ui,sans-serif!important;
        letter-spacing:-.02em!important;
      }
      html[lang="en"] body #main[data-garang-screen="today"] ${executeSelector}[data-garang-today-workout-execute="1"]::before{content:"Start today's workout"}
      html body #main[data-garang-screen="today"] #garangTodayFlow>[data-garang-checkin-access="1"][data-garang-checkin-secondary="1"]{
        min-height:52px!important;
        margin:5px 0 12px!important;
        padding:0 16px!important;
        border:1px solid rgba(242,239,233,.22)!important;
        border-radius:11px 3px 11px 3px!important;
        background:#080908!important;
        color:#f7f5f1!important;
        box-shadow:none!important;
        grid-template-columns:minmax(0,1fr) auto!important;
        align-items:center!important;
        gap:18px!important;
        text-align:left!important;
        cursor:pointer!important;
      }
      html body #main[data-garang-screen="today"] #garangTodayFlow>[data-garang-checkin-access="1"][data-garang-checkin-secondary="1"]>span,
      html body #main[data-garang-screen="today"] #garangTodayFlow>[data-garang-checkin-access="1"][data-garang-checkin-secondary="1"]>strong,
      html body #main[data-garang-screen="today"] #garangTodayFlow>[data-garang-checkin-access="1"][data-garang-checkin-secondary="1"]>small{display:none!important}
      html body #main[data-garang-screen="today"] #garangTodayFlow>[data-garang-checkin-access="1"][data-garang-checkin-secondary="1"]::before{
        content:"체크인";
        color:#f7f5f1!important;
        font:650 12px/1 "Noto Sans KR",Inter,system-ui,sans-serif!important;
        letter-spacing:-.02em!important;
      }
      html body #main[data-garang-screen="today"] #garangTodayFlow>[data-garang-checkin-access="1"][data-garang-checkin-secondary="1"]::after{
        content:"→";
        color:#f7f5f1!important;
        font:400 16px/1 "Noto Sans KR",Inter,system-ui,sans-serif!important;
      }
      html[lang="en"] body #main[data-garang-screen="today"] #garangTodayFlow>[data-garang-checkin-access="1"][data-garang-checkin-secondary="1"]::before{content:"Check-in"}
      html body #main[data-garang-screen="today"] #garangTodayFlow .gtf-next:hover,
      html body #main[data-garang-screen="today"] #garangTodayFlow>[data-garang-checkin-access="1"][data-garang-checkin-secondary="1"]:hover{
        background:#101210!important;
        border-color:rgba(120,170,153,.46)!important;
      }
    `;
    document.head.appendChild(style);
  }

  function isWorkoutExecute(button) {
    if (!button) return false;
    return /운동\s*기록\s*열기|Open\s+workout\s+log/i.test(button.textContent || '');
  }

  function resetSecondaryCheckin(button) {
    if (!button || button.dataset.garangCheckinSecondary !== '1') return;
    delete button.dataset.garangCheckinSecondary;
    button.style.removeProperty('display');
    button.style.removeProperty('pointer-events');
    button.style.removeProperty('order');
  }

  function exposeSecondaryCheckin(flow) {
    let button = flow?.querySelector('[data-garang-checkin-access="1"]');
    if (!button) {
      try { window.GarangNonblockingActions?.promoteTodayCheckin?.(); } catch {}
      button = flow?.querySelector('[data-garang-checkin-access="1"]');
    }
    if (!button) return false;
    button.hidden = false;
    if (button.getAttribute('aria-hidden') !== null) button.removeAttribute('aria-hidden');
    if (button.hasAttribute('tabindex')) button.removeAttribute('tabindex');
    delete button.dataset.gsnSuppressed;
    button.dataset.garangCheckinSecondary = '1';
    button.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Check-in' : '체크인');
    button.style.setProperty('display','grid','important');
    button.style.setProperty('pointer-events','auto','important');
    button.style.setProperty('order','6','important');
    return true;
  }

  function reconcile() {
    queued = false;
    ensureStyle();
    const m = main();
    if (!m || m.dataset.garangScreen !== 'today') return;
    const flow = m.querySelector('#garangTodayFlow');
    if (!flow) return;
    const execute = flow.querySelector('.gtf-next[data-gsn-action="execute"]');
    const checkin = flow.querySelector('[data-garang-checkin-access="1"]');
    const workout = isWorkoutExecute(execute);
    if (execute) {
      if (workout) execute.dataset.garangTodayWorkoutExecute = '1';
      else delete execute.dataset.garangTodayWorkoutExecute;
    }
    if (workout) exposeSecondaryCheckin(flow);
    else resetSecondaryCheckin(checkin);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => requestAnimationFrame(reconcile));
  }

  function observe() {
    const m = main();
    if (!m || m === observedMain) return;
    observer?.disconnect();
    observedMain = m;
    observer = new MutationObserver(schedule);
    observer.observe(m, {childList:true, subtree:true, attributes:true, attributeFilter:['data-gsn-action','data-gsn-step','data-garang-screen','aria-hidden','tabindex','hidden']});
  }

  for (const eventName of ['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:state-hydrated','pageshow']) {
    window.addEventListener(eventName, () => { observe(); schedule(); });
  }
  observe();
  ensureStyle();
  schedule();
  window.GarangTodayCheckinOverrideV1 = Object.freeze({version:'1.1.0', reconcile:schedule});
})();