/* GARANG Commercial Mobile App v1
   Decorates the existing canonical product shell without taking ownership of product actions. */
(() => {
  'use strict';
  if (window.GarangCommercialMobileV1) return;

  const VERSION='garang-commercial-mobile-v1.0.0';
  const root=document.documentElement;
  const main=()=>document.getElementById('main');

  const icons={
    today:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 11.5 12 5l7.5 6.5v7a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5Z"/><path d="M9 20v-5.5h6V20"/></svg>',
    log:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5v15M4.5 12h15"/></svg>',
    coach:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5h14v9H9l-4 3v-12Z"/><path d="M9 10h6M9 13h4"/></svg>',
    progress:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18V13M10 18V9M15 18v-6M20 18V5"/></svg>',
    workout:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9v6M17 9v6M4 10.5v3M20 10.5v3M7 12h10"/></svg>',
    nutrition:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20c4-2.4 6-6 6-10-3.2 0-5.3 1.1-6 3.4C11.3 11.1 9.2 10 6 10c0 4 2 7.6 6 10Z"/><path d="M12 13V6"/></svg>',
    running:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="14.5" cy="5.5" r="2"/><path d="m12.5 9-2.5 4 3 2 1.5 4M13 10l3 2 3-.5M10 13l-3 5"/></svg>',
    body:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5.5" r="2"/><path d="M8.5 10c1-1.6 2.1-2.4 3.5-2.4s2.5.8 3.5 2.4M9.3 9.5 8 15l2 4M14.7 9.5 16 15l-2 4"/></svg>'
  };

  const recordIcons={workout:icons.workout,nutrition:icons.nutrition,running:icons.running,body:icons.body};

  function decorateNav(){
    document.querySelectorAll('#bottomNav [data-garang-primary-nav="1"]').forEach(button=>{
      const key=button.dataset.page;
      let host=button.querySelector('.gca-tab-icon')||button.querySelector('span');
      if(!host){
        host=document.createElement('span');
        button.prepend(host);
      }
      host.className='gca-tab-icon';
      if(host.dataset.gcaIcon!==key){
        host.innerHTML=icons[key]||'';
        host.dataset.gcaIcon=key||'';
      }
      const label=button.querySelector('b');
      if(label&&key==='progress')label.textContent='Progress';
      if(key==='log')button.setAttribute('aria-label','Record');
    });
  }

  function decorateRecordSheet(){
    document.querySelectorAll('.garang-record-route[data-garang-record-route]').forEach(button=>{
      const key=button.dataset.garangRecordRoute;
      let icon=button.querySelector('.gca-record-icon');
      if(!icon){
        icon=document.createElement('span');
        icon.className='gca-record-icon';
        icon.setAttribute('aria-hidden','true');
        button.appendChild(icon);
      }
      if(icon.dataset.gcaIcon!==key){
        icon.innerHTML=recordIcons[key]||'';
        icon.dataset.gcaIcon=key||'';
      }
    });
  }

  function decorateScreen(){
    const host=main();
    if(!host)return;
    const screen=host.dataset.garangScreen||'';
    host.dataset.gcaVisual='1';
    if(screen)root.dataset.garangCommercialScreen=screen;
    host.querySelectorAll('.page-head').forEach(head=>head.classList.add('gca-page-head'));
    if(screen==='today'){
      host.querySelector('#garangTodayFlow')?.classList.add('gca-today-flow');
      host.querySelector('.today-hero')?.classList.add('gca-hero-surface');
    }
    if(screen==='nutrition')host.querySelector('.nutrition-quick-summary')?.classList.add('gca-hero-surface');
    if(screen==='workout')host.querySelector('.workout-visual-hero')?.classList.add('gca-hero-surface');
    if(screen==='body')host.querySelector('.body-hero')?.classList.add('gca-hero-surface');
  }

  function reconcile(){
    root.dataset.garangCommercialApp='v1';
    decorateNav();
    decorateRecordSheet();
    decorateScreen();
  }

  const observer=new MutationObserver(records=>{
    if(records.some(record=>record.type==='childList'))requestAnimationFrame(reconcile);
  });
  const boot=()=>{
    reconcile();
    const target=document.getElementById('appView')||document.body;
    if(target)observer.observe(target,{childList:true,subtree:true});
  };

  window.addEventListener('garang:screen-rendered',reconcile);
  window.addEventListener('garang:route-completed',reconcile);
  window.addEventListener('garang:record-sheet-opened',()=>requestAnimationFrame(decorateRecordSheet));
  window.addEventListener('pageshow',reconcile);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

  window.GarangCommercialMobileV1=Object.freeze({version:VERSION,reconcile});
})();