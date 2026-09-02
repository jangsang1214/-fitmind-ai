/* GARANG V9.5.2 TOUCH HOTFIX
   Scope: touch/input regression only. Does not alter app data, AI, auth logic, or navigation.
*/
(function(){
  'use strict';

  const OVERLAY_SELECTORS = [
    '#garang88AiModal',
    '.g88-ai-modal',
    '.g86-modal',
    '.shareModal'
  ];

  function closeInactiveOverlays(){
    OVERLAY_SELECTORS.forEach(sel=>{
      document.querySelectorAll(sel).forEach(el=>{
        const open = el.classList.contains('open');
        if(!open){
          el.style.pointerEvents='none';
          el.style.display='none';
          el.setAttribute('aria-hidden','true');
        }else{
          el.style.pointerEvents='auto';
          el.removeAttribute('aria-hidden');
        }
      });
    });
  }

  function protectAuthTouch(){
    const auth=document.getElementById('auth');
    if(!auth || !auth.classList.contains('active')) return;

    // Auth is a normal page, never a modal. Keep it above inactive legacy overlays.
    auth.style.position='relative';
    auth.style.zIndex='20000';
    auth.style.pointerEvents='auto';
    auth.querySelectorAll('button,input,select,label,a,[role="button"]').forEach(el=>{
      el.style.pointerEvents='auto';
      el.style.touchAction='manipulation';
    });

    // Disable only legacy full-screen layers while auth is visible.
    closeInactiveOverlays();
  }

  function boot(){
    closeInactiveOverlays();
    protectAuthTouch();

    document.addEventListener('click',()=>{
      closeInactiveOverlays();
      protectAuthTouch();
    },true);

    document.addEventListener('touchstart',()=>{
      closeInactiveOverlays();
      protectAuthTouch();
    },{capture:true,passive:true});

    window.addEventListener('pageshow',()=>{
      closeInactiveOverlays();
      protectAuthTouch();
    });

    // Covers dynamically-created legacy modals without observing/writing the whole app DOM.
    const mo=new MutationObserver(()=>{
      closeInactiveOverlays();
      protectAuthTouch();
    });
    mo.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
