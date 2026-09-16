(() => {
  'use strict';

  const ACTIVE_KEY='garang_wanted_demo_active_v1';
  const isActive=()=>localStorage.getItem(ACTIVE_KEY)==='1';
  const main=()=>document.getElementById('main');
  const currentScreen=()=>{
    try{return window.GarangRouter?.current?.()||main()?.dataset?.garangScreen||document.querySelector('#bottomNav button.active[data-page]')?.dataset?.page||null;}catch{return null;}
  };
  const navigate=route=>{
    try{if(window.GarangRouter?.navigate?.(route,{source:'wanted-judge-ux-v1',force:true})===true)return true;}catch{}
    const primary=document.querySelector(`#bottomNav button[data-page="${CSS.escape(route)}"]`);
    if(typeof primary?.onclick==='function'){primary.onclick.call(primary,{type:'wanted-route',target:primary,currentTarget:primary,preventDefault(){},stopPropagation(){}});return true;}
    return false;
  };

  function setGuideCollapsed(guide,collapsed){
    if(!guide)return;
    guide.classList.toggle('is-collapsed',!!collapsed);
    guide.dataset.wantedCollapsed=collapsed?'1':'0';
    const toggle=guide.querySelector('[data-wanted-guide-toggle]');
    if(toggle){
      toggle.setAttribute('aria-expanded',collapsed?'false':'true');
      toggle.setAttribute('aria-label',collapsed?'추천 동선 펼치기':'추천 동선 접기');
      toggle.textContent=collapsed?'열기':'접기';
    }
  }

  function ensureGuideControls(){
    if(!isActive())return;
    const guide=document.querySelector('.wanted-demo-guide');if(!guide)return;
    const head=guide.querySelector(':scope > div');
    if(head&&!head.classList.contains('wanted-demo-guide-head'))head.classList.add('wanted-demo-guide-head');
    if(head&&!head.querySelector('[data-wanted-guide-toggle]')){
      const toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='wanted-demo-guide-toggle';
      toggle.dataset.wantedGuideToggle='1';
      toggle.textContent='접기';
      toggle.setAttribute('aria-label','추천 동선 접기');
      toggle.setAttribute('aria-expanded','true');
      toggle.addEventListener('click',event=>{
        event.preventDefault();event.stopPropagation();
        setGuideCollapsed(guide,!guide.classList.contains('is-collapsed'));
      });
      head.appendChild(toggle);
    }
    guide.querySelectorAll('[data-wanted-route]').forEach(button=>{
      if(button.dataset.wantedUxBound==='1')return;
      button.dataset.wantedUxBound='1';
      button.addEventListener('click',()=>{
        if(button.dataset.wantedRoute==='coach')setGuideCollapsed(guide,true);
      },true);
    });
    if(currentScreen()==='coach')setGuideCollapsed(guide,true);
  }

  function planLabelNode(){
    const root=main();if(!root)return null;
    const exact=new Set(['오늘의 계획',"Today's plan"]);
    const preferred=root.querySelectorAll('h1,h2,h3,h4,h5,strong,b,span,.section-title,.card-title,[class*="title"],[class*="head"],[class*="label"]');
    for(const node of preferred){
      const text=String(node.textContent||'').replace(/\s+/g,' ').trim();
      if(exact.has(text))return node;
    }
    for(const node of preferred){
      const text=String(node.textContent||'').replace(/\s+/g,' ').trim();
      if((text.startsWith('오늘의 계획 ·')||text.startsWith("Today's plan ·"))&&text.length<180)return node;
    }
    return null;
  }

  function ensureTodayPlannerPlus(){
    if(!isActive()||currentScreen()!=='today')return;
    const root=main();if(!root||root.querySelector('[data-wanted-planner-plus]'))return;
    const label=planLabelNode();if(!label)return;
    const row=label.parentElement||label;
    row.classList.add('wanted-today-plan-title-row');
    const button=document.createElement('button');
    button.type='button';
    button.className='wanted-today-planner-plus';
    button.dataset.wantedPlannerPlus='1';
    button.setAttribute('aria-label','플래너 열기');
    button.setAttribute('title','플래너 열기');
    button.textContent='+';
    button.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();
      navigate('planner');
    });
    if(label.nextSibling)row.insertBefore(button,label.nextSibling);else row.appendChild(button);
  }

  function sync(){
    if(!isActive())return;
    ensureGuideControls();
    ensureTodayPlannerPlus();
  }

  function boot(){
    sync();
    window.addEventListener('garang:screen-rendered',()=>requestAnimationFrame(sync));
    window.addEventListener('garang:route-completed',()=>requestAnimationFrame(sync));
    const target=document.getElementById('appView')||document.body;
    const observer=new MutationObserver(()=>{if(isActive())requestAnimationFrame(sync);});
    if(target)observer.observe(target,{childList:true,subtree:true});
    setTimeout(sync,250);setTimeout(sync,900);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
