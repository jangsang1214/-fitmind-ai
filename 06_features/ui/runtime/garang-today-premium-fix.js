/* GARANG Today premium anatomy runtime fix
   Today keeps the detailed code-rendered FRONT/BACK anatomy together.
   Workout-only controls are replaced with a compact lower-right key. */
(() => {
  'use strict';
  const main=document.getElementById('main');
  if(!main)return;

  let scheduled=false;

  function ensureKey(panel){
    panel.querySelectorAll(':scope > .g3-anatomy-tools').forEach(el=>el.remove());
    let key=panel.querySelector(':scope > .today-anatomy-key');
    if(!key){
      key=document.createElement('div');
      key.className='today-anatomy-key';
      key.setAttribute('aria-label','Anatomy view and muscle intensity legend');
      key.innerHTML='<span class="today-view-key">FRONT&nbsp;&nbsp;BACK</span><span class="today-key-item primary"><i></i>Primary</span><span class="today-key-item secondary"><i></i>Secondary</span><span class="today-key-item tertiary"><i></i>Tertiary</span>';
      panel.appendChild(key);
    }
  }

  function polishToday(){
    scheduled=false;
    const panel=main.querySelector('.today-body-panel');
    if(!panel)return;
    const wrap=panel.querySelector('.muscle-map-wrap.compact-map');
    if(!wrap)return;

    const label=panel.querySelector('.today-body-label');
    if(label){
      const eyebrow=label.querySelector('.eyebrow');
      if(eyebrow)eyebrow.textContent=document.documentElement.lang==='en'?'FOCUS AREA':'주요 부위';
      label.querySelectorAll('strong').forEach(el=>el.remove());
    }

    ensureKey(panel);
    wrap.classList.add('garang-today-anatomy-premium');
    wrap.dataset.g3View='both';
    const map=wrap.querySelector('.muscle-map');
    if(!map)return;
    map.classList.add('garang-today-anatomy-map');

    map.querySelectorAll('.body-view').forEach(view=>{
      view.hidden=false;
      view.removeAttribute('aria-hidden');
      view.style.setProperty('display','flex','important');
      const caption=view.querySelector(':scope > span');
      if(caption)caption.hidden=true;
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
  document.documentElement.addEventListener('garang:language-changed',schedule);
  schedule();
})();
