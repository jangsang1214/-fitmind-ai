/* GARANG Today Check-in Override v1
   Founder-directed UI fix: when Today would show the workout-log execute CTA,
   present that same bottom affordance as Check-in and reuse the canonical app.js
   check-in owner. No state schema or write ownership changes.
*/
(() => {
  'use strict';
  if (window.GarangTodayCheckinOverrideV1) return;

  const main = () => document.getElementById('main');
  const selector = '#garangTodayFlow .gtf-next[data-gsn-action="execute"]';
  let queued = false;
  let observer = null;
  let observedMain = null;

  function ensureStyle() {
    if (document.getElementById('garang-today-checkin-override-v1-style')) return;
    const style = document.createElement('style');
    style.id = 'garang-today-checkin-override-v1-style';
    style.textContent = `
      html body #main[data-garang-screen="today"] ${selector}[data-garang-today-checkin-override="1"]{
        min-height:52px!important;
        background:#080908!important;
        border-color:rgba(242,239,233,.22)!important;
        color:#f7f5f1!important;
        font-size:0!important;
        box-shadow:none!important;
      }
      html body #main[data-garang-screen="today"] ${selector}[data-garang-today-checkin-override="1"]::before{
        content:"체크인";
        color:#f7f5f1!important;
        font:650 12px/1 "Noto Sans KR",Inter,system-ui,sans-serif!important;
        letter-spacing:-.02em!important;
      }
      html[lang="en"] body #main[data-garang-screen="today"] ${selector}[data-garang-today-checkin-override="1"]::before{content:"Check-in"}
      html body #main[data-garang-screen="today"] ${selector}[data-garang-today-checkin-override="1"]>span{
        color:#f7f5f1!important;
        font-size:16px!important;
      }
      html body #main[data-garang-screen="today"] ${selector}[data-garang-today-checkin-override="1"]:hover{
        background:#101210!important;
        border-color:rgba(120,170,153,.46)!important;
      }
    `;
    document.head.appendChild(style);
  }

  function isWorkoutExecute(button) {
    if (!button) return false;
    const text = `${button.getAttribute('aria-label') || ''} ${button.textContent || ''}`;
    return /운동\s*기록\s*열기|Open\s+workout\s+log/i.test(text);
  }

  function canonicalCheckin() {
    const m = main();
    if (!m || m.dataset.garangScreen !== 'today') return false;
    const owner = m.querySelector('.status-visual-card [data-action="open-checkin"], [data-action="open-checkin"]');
    if (!owner) return false;
    if (typeof owner.onclick === 'function') {
      owner.onclick.call(owner, {type:'garang-today-checkin-override', target:owner, currentTarget:owner, preventDefault(){}, stopPropagation(){}});
    } else owner.click();
    return true;
  }

  function reconcile() {
    queued = false;
    ensureStyle();
    const m = main();
    if (!m || m.dataset.garangScreen !== 'today') return;
    const button = m.querySelector(selector);
    if (!button) return;
    const shouldOverride = isWorkoutExecute(button) || button.dataset.garangTodayCheckinOverride === '1';
    if (!shouldOverride) {
      button.removeAttribute('data-garang-today-checkin-override');
      return;
    }
    button.dataset.garangTodayCheckinOverride = '1';
    button.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Check-in' : '체크인');
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
    observer.observe(m, {childList:true, subtree:true, attributes:true, attributeFilter:['data-gsn-action','data-gsn-step','data-garang-screen']});
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.(`${selector}[data-garang-today-checkin-override="1"]`);
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    canonicalCheckin();
  }, true);

  for (const eventName of ['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:state-hydrated','pageshow']) {
    window.addEventListener(eventName, () => { observe(); schedule(); });
  }
  observe();
  ensureStyle();
  schedule();
  window.GarangTodayCheckinOverrideV1 = Object.freeze({version:'1.0.0', reconcile:schedule, openCheckin:canonicalCheckin});
})();