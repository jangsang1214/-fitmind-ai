/* GARANG V9.9 — FINAL TOUCH / INPUT GUARD */
(function(){
  'use strict';
  const AUTH='#auth';
  const STRUCTURAL=new Set(['HTML','BODY','SCRIPT','STYLE','MAIN','HEADER','NAV']);
  const authActive=()=>{const a=document.querySelector(AUTH);return !!(a&&a.classList.contains('active'));};
  const visible=el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'&&r.width>1&&r.height>1;};
  function hide(el){if(!el||STRUCTURAL.has(el.tagName)||el.closest(AUTH))return;el.dataset.garangTouchSuppressed='1';el.style.setProperty('pointer-events','none','important');el.style.setProperty('display','none','important');el.setAttribute('aria-hidden','true');}
  function run(){
    const auth=document.querySelector(AUTH); if(!auth)return;
    if(authActive()){
      // A setup modal must never sit over the unauthenticated login/signup surface.
      const setup=document.getElementById('garangV99Setup');
      if(setup){setup.classList.remove('open');setup.style.setProperty('display','none','important');setup.style.setProperty('pointer-events','none','important');}
      const w=innerWidth,h=innerHeight;
      document.body.querySelectorAll('*').forEach(el=>{
        if(el===auth||auth.contains(el)||el.id==='app'||el.id==='mainNav'||el.id==='garangV99Setup'||!visible(el))return;
        const s=getComputedStyle(el),r=el.getBoundingClientRect();
        if((s.position==='fixed'||s.position==='absolute')&&r.width>=w*.88&&r.height>=h*.82)hide(el);
      });
      auth.style.setProperty('position','relative','important');
      auth.style.setProperty('z-index','2147483646','important');
      auth.style.setProperty('pointer-events','auto','important');
      auth.querySelectorAll('button,input,select,textarea,label,a,[role="button"]').forEach(el=>{el.style.setProperty('pointer-events','auto','important');el.style.setProperty('touch-action','manipulation','important');});
    }else{
      document.querySelectorAll('[data-garang-touch-suppressed="1"]').forEach(el=>{el.style.removeProperty('display');el.style.removeProperty('pointer-events');el.removeAttribute('aria-hidden');delete el.dataset.garangTouchSuppressed;});
    }
  }
  function boot(){
    run();setTimeout(run,100);setTimeout(run,500);setTimeout(run,1200);
    window.addEventListener('pageshow',run);
    document.addEventListener('touchend',run,{capture:true,passive:true});
    document.addEventListener('click',e=>{const tab=e.target.closest('#authTabs button[data-tab]');if(tab&&typeof window.setAuthTab==='function'){e.preventDefault();window.setAuthTab(tab.dataset.tab);}},true);
    new MutationObserver(()=>{if(authActive())run();}).observe(document.body,{childList:true,subtree:true});
    window.GARANGTouchGuard={version:'9.9.2',run};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
