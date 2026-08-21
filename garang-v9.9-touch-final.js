/* GARANG V9.9.3 TOUCH ROOT FIX
   Scope: touch/input routing only.
   Preserves V9.9 feature code. No AI/data/auth/navigation logic changes.
*/
(function(){
  'use strict';

  var STYLE_ID='garangV993TouchRootFix';
  var LEGACY_OVERLAYS=[
    '#garang88AiModal',
    '.g88-ai-modal',
    '.g86-modal',
    '.shareModal'
  ];

  function installStyle(){
    if(document.getElementById(STYLE_ID)) return;
    var s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=
      'html,body{touch-action:manipulation!important;}' +
      '.page:not(.active){pointer-events:none!important;}' +
      '.page.active{pointer-events:auto!important;}' +
      '#auth.active{position:relative!important;z-index:2147483646!important;pointer-events:auto!important;}' +
      '#auth.active button,#auth.active input,#auth.active select,#auth.active textarea,#auth.active label,#auth.active a,#auth.active [role="button"]{' +
        'pointer-events:auto!important;touch-action:manipulation!important;}' +
      '#auth.active #garang88AiModal,#auth.active .g88-ai-modal,#auth.active .g86-modal,#auth.active .shareModal{' +
        'display:none!important;pointer-events:none!important;}';
    document.head.appendChild(s);
  }

  function closeLegacyOverlaysOnAuth(){
    var auth=document.getElementById('auth');
    if(!auth || !auth.classList.contains('active')) return;
    LEGACY_OVERLAYS.forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){
        el.classList.remove('open');
        el.style.setProperty('display','none','important');
        el.style.setProperty('pointer-events','none','important');
        el.setAttribute('aria-hidden','true');
      });
    });
  }

  function normalizePages(){
    document.querySelectorAll('.page').forEach(function(p){
      if(p.classList.contains('active')){
        p.style.setProperty('pointer-events','auto','important');
      }else{
        p.style.setProperty('pointer-events','none','important');
      }
    });
  }

  function protectAuth(){
    var auth=document.getElementById('auth');
    if(!auth || !auth.classList.contains('active')) return;
    auth.style.setProperty('position','relative','important');
    auth.style.setProperty('z-index','2147483646','important');
    auth.style.setProperty('pointer-events','auto','important');
    auth.querySelectorAll('button,input,select,textarea,label,a,[role="button"]').forEach(function(el){
      el.style.setProperty('pointer-events','auto','important');
      el.style.setProperty('touch-action','manipulation','important');
    });
    closeLegacyOverlaysOnAuth();
  }

  function sync(){
    installStyle();
    normalizePages();
    protectAuth();
  }

  function boot(){
    sync();
    window.addEventListener('pageshow',sync);
    window.addEventListener('popstate',sync);
    window.addEventListener('hashchange',sync);
    window.addEventListener('garang-auth-state',function(){setTimeout(sync,0);});
    document.addEventListener('click',function(){setTimeout(sync,0);},true);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }

  window.GARANGTouchGuard={
    version:'9.9.3-rootfix',
    sync:sync
  };
})();
