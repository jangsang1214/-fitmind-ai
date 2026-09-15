/* GARANG Today Check-in Override v1
   Founder-directed UI fix for the Today workout-execution state:
   - canonical workout execution remains the Golden Path next action
   - a separate bottom Check-in affordance reuses the canonical app.js check-in owner
   - dark Today actions use readable ivory-white text
   No state schema or write ownership changes.
*/
(() => {
  'use strict';
  if (window.GarangTodayCheckinOverrideV1) return;

  const main = () => document.getElementById('main');
  const executeSelector = '#garangTodayFlow .gtf-next[data-gsn-action="execute"]';
  const BOTTOM_ATTR = 'data-garang-bottom-checkin';
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
      html body #main[data-garang-screen="today"] #garangTodayFlow .gtf-next>span{color:#f7f5f1!important}
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
      html body #main[data-garang-screen="today"]>[${BOTTOM_ATTR}="1"]{
        width:100%!important;
        min-height:52px!important;
        display:grid!important;
        grid-template-columns:minmax(0,1fr) auto!important;
        align-items:center!important;
        gap:18px!important;
        margin:8px 0 18px!important;
        padding:0 16px!important;
        border:1px solid rgba(242,239,233,.22)!important;
        border-radius:11px 3px 11px 3px!important;
        background:#080908!important;
        color:#f7f5f1!important;
        box-shadow:none!important;
        text-align:left!important;
        cursor:pointer!important;
        font:650 12px/1 "Noto Sans KR",Inter,system-ui,sans-serif!important;
        letter-spacing:-.02em!important;
      }
      html body #main[data-garang-screen="today"]>[${BOTTOM_ATTR}="1"]>span{color:#f7f5f1!important;font:400 16px/1 "Noto Sans KR",Inter,system-ui,sans-serif!important}
      html body #main[data-garang-screen="today"] #garangTodayFlow .gtf-next:hover,
      html body #main[data-garang-screen="today"]>[${BOTTOM_ATTR}="1"]:hover{
        background:#101210!important;
        border-color:rgba(120,170,153,.46)!important;
      }
      html body #main[data-garang-screen="today"]>[${BOTTOM_ATTR}="1"]:focus-visible{outline:1px solid rgba(120,170,153,.72)!important;outline-offset:3px!important}
    `;
    document.head.appendChild(style);
  }

  function isWorkoutExecute(button) {
    if (!button) return false;
    return /운동\s*기록\s*열기|Open\s+workout\s+log/i.test(button.textContent || '');
  }

  function canonicalCheckin() {
    const m = main();
    if (!m || m.dataset.garangScreen !== 'today') return false;
    const owner = m.querySelector('.status-visual-card [data-action="open-checkin"], [data-action="open-checkin"]');
    if (!owner) return false;
    if (typeof owner.onclick === 'function') {
      owner.onclick.call(owner,{type:'garang-bottom-checkin',target:owner,currentTarget:owner,preventDefault(){},stopPropagation(){}});
    } else owner.click();
    return true;
  }

  function removeBottomCheckin() {
    main()?.querySelector(`[${BOTTOM_ATTR}="1"]`)?.remove();
  }

  function ensureBottomCheckin(flow) {
    const m = main();
    if (!m || !flow) return null;
    let button = m.querySelector(`:scope > [${BOTTOM_ATTR}="1"]`);
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.setAttribute(BOTTOM_ATTR,'1');
      button.innerHTML = '<strong></strong><span aria-hidden="true">→</span>';
      button.onclick = event => { event.preventDefault(); event.stopPropagation(); canonicalCheckin(); };
      flow.insertAdjacentElement('afterend',button);
    } else if (button.previousElementSibling !== flow) {
      flow.insertAdjacentElement('afterend',button);
    }
    const english = document.documentElement.lang === 'en';
    button.querySelector('strong').textContent = english ? 'Check-in' : '체크인';
    button.setAttribute('aria-label', english ? 'Check-in' : '체크인');
    return button;
  }

  function reconcile() {
    queued = false;
    ensureStyle();
    const m = main();
    if (!m || m.dataset.garangScreen !== 'today') { removeBottomCheckin(); return; }
    const flow = m.querySelector('#garangTodayFlow');
    if (!flow) { removeBottomCheckin(); return; }
    const execute = flow.querySelector('.gtf-next[data-gsn-action="execute"]');
    const workout = isWorkoutExecute(execute);
    if (execute) {
      if (workout) execute.dataset.garangTodayWorkoutExecute = '1';
      else delete execute.dataset.garangTodayWorkoutExecute;
    }
    if (workout) ensureBottomCheckin(flow);
    else removeBottomCheckin();
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
    observer.observe(m,{childList:true,subtree:true,attributes:true,attributeFilter:['data-gsn-action','data-gsn-step','data-garang-screen']});
  }

  for (const eventName of ['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:state-hydrated','pageshow']) {
    window.addEventListener(eventName,() => { observe(); schedule(); });
  }
  observe();
  ensureStyle();
  schedule();
  window.GarangTodayCheckinOverrideV1 = Object.freeze({version:'1.2.0',reconcile:schedule,openCheckin:canonicalCheckin});
})();