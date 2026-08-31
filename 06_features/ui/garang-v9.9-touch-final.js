/* GARANG V9.9.4 TOUCH ROUTER
   Input routing only. V9.9 feature/data/AI/navigation logic is preserved.
   This file intentionally avoids body-wide observers and click/touch interception.
*/
(function(){
  'use strict';
  var STYLE_ID='garangV994TouchRouter';
  var LEGACY_OVERLAYS=['#garang88AiModal','.g88-ai-modal','.g86-modal','.shareModal'];

  function installStyle(){
    if(document.getElementById(STYLE_ID)) return;
    var s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=
      'html,body{touch-action:manipulation;}' +
      '.page:not(.active){pointer-events:none;}' +
      '.page.active{pointer-events:auto;}' +
      '#auth.active{position:relative;z-index:2147483646;pointer-events:auto;}' +
      '#auth.active button,#auth.active input,#auth.active select,#auth.active textarea,#auth.active label,#auth.active a,#auth.active [role="button"]{pointer-events:auto;touch-action:manipulation;}';
    document.head.appendChild(s);
  }

  function protectAuth(){
    var auth=document.getElementById('auth');
    if(!auth || !auth.classList.contains('active')) return;
    auth.style.setProperty('pointer-events','auto','important');
    auth.style.setProperty('z-index','2147483646','important');
    LEGACY_OVERLAYS.forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){
        if(!el.classList.contains('open')){
          el.style.setProperty('display','none','important');
          el.style.setProperty('pointer-events','none','important');
          el.setAttribute('aria-hidden','true');
        }
      });
    });
  }

  function sync(){
    installStyle();
    protectAuth();
  }

  function boot(){
    sync();
    window.addEventListener('pageshow',sync);
    window.addEventListener('popstate',sync);
    window.addEventListener('hashchange',sync);
    window.addEventListener('garang-auth-state',function(){setTimeout(sync,0);});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.GARANGTouchGuard={version:'9.9.4',sync:sync};
})();
