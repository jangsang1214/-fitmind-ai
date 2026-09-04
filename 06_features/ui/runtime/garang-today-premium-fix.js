/* GARANG Today premium anatomy runtime fix
   Keeps the detailed code-rendered anatomy, but removes workout-only controls from Today
   and restores a clean two-model composition after every render. */
(() => {
  'use strict';
  const main=document.getElementById('main');
  if(!main)return;

  let scheduled=false;
  function polishToday(){
    scheduled=false;
    const panel=main.querySelector('.today-body-panel');
    if(!panel)return;
    const wrap=panel.querySelector('.muscle-map-wrap.compact-map');
    if(!wrap)return;

    /* garang-polish-v3 upgrades every anatomy map and injects workout FRONT/BACK tools.
       They are useful on Workout, but visually wrong in the compact Today card. */
    panel.querySelectorAll(':scope > .g3-anatomy-tools').forEach(el=>el.remove());

    wrap.classList.add('garang-today-anatomy-premium');
    wrap.dataset.g3View='both';
    const map=wrap.querySelector('.muscle-map');
    if(!map)return;
    map.classList.add('garang-today-anatomy-map');

    /* Today intentionally shows FRONT and BACK together. No functionality is removed:
       the SVG muscle zones remain the same interactive nodes. */
    map.querySelectorAll('.body-view').forEach(view=>{
      view.hidden=false;
      view.removeAttribute('aria-hidden');
      view.style.removeProperty('display');
    });
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>requestAnimationFrame(polishToday));
  }

  const observer=new MutationObserver(schedule);
  observer.observe(main,{childList:true,subtree:true});
  window.addEventListener('resize',schedule,{passive:true});
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-page="today"],[data-pagego="today"]'))setTimeout(schedule,0);
  },true);
  schedule();
})();
