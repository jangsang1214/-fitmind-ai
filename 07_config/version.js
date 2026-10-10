(function(root){
 'use strict';
 const build=Object.freeze({version:'0.11.0-beta.6',label:'0.11.0 BETA 6',channel:'COMMERCIAL HARDENING',buildId:'20260922-y2g-1',schema:5});
 root.GARANG_BUILD=build;
 if(root.document){
   document.documentElement.dataset.garangVersion=build.version;
   document.documentElement.dataset.garangChannel=build.channel;
   if(!document.querySelector('link[data-garang-reference-ui-v2]')){
     const link=document.createElement('link');
     link.rel='stylesheet';link.href='./03_styles/runtime/garang-reference-ui-v2.css?v=2.0.0';link.dataset.garangReferenceUiV2='1';
     document.head.appendChild(link);
   }
   if(!document.querySelector('link[data-garang-reference-ui-v2-guards]')){
     const guard=document.createElement('link');
     guard.rel='stylesheet';guard.href='./03_styles/runtime/garang-reference-ui-v2-guards.css?v=2.0.0';guard.dataset.garangReferenceUiV2Guards='1';
     document.head.appendChild(guard);
   }
   function referenceStructureNeedsRepair(main){
     if(!main)return false;
     const screen=String(main.dataset?.garangScreen||'');
     if(screen==='today'){
       const flow=main.querySelector('#garangTodayFlow');
       return !!flow&&!flow.parentElement?.classList?.contains('g-ref-today-stage');
     }
     if(screen==='nutrition'){
       const scan=main.querySelector('.meal-scan-card');
       return !!scan&&!scan.parentElement?.classList?.contains('g-ref-nutrition-stage');
     }
     if(screen==='body'){
       const hero=main.querySelector('.body-hero');
       return !!hero&&!hero.parentElement?.classList?.contains('g-ref-body-stage');
     }
     if(screen==='coach'){
       const shell=main.querySelector('.coach-app-shell');
       return !!shell&&!shell.classList.contains('g-ref-coach-shell');
     }
     if(screen==='workout'){
       const execution=main.querySelector('.workout-execution-v2');
       return !!execution&&!execution.classList.contains('g-ref-workout-execution');
     }
     return false;
   }
   function reconcileDependentPresentation(main){
     if(String(main?.dataset?.garangScreen||'')!=='today')return;
     setTimeout(()=>root.GarangMobileCheckinPlannerShortcutV1?.reconcile?.(),420);
   }
   function attachReferenceStructureGuard(){
     if(root.__GARANG_REFERENCE_STRUCTURE_GUARD__)return;
     const main=document.getElementById('main');
     if(!main){setTimeout(attachReferenceStructureGuard,80);return;}
     root.__GARANG_REFERENCE_STRUCTURE_GUARD__=true;
     let queued=false;
     const repair=()=>{
       queued=false;
       if(!referenceStructureNeedsRepair(main))return;
       root.GarangReferenceUIV2?.apply?.();
       reconcileDependentPresentation(main);
     };
     const observer=new MutationObserver(()=>{
       if(queued||!referenceStructureNeedsRepair(main))return;
       queued=true;requestAnimationFrame(repair);
     });
     observer.observe(main,{childList:true,subtree:true});
     const repairOnLifecycle=()=>{
       if(!referenceStructureNeedsRepair(main))return;
       root.GarangReferenceUIV2?.apply?.();
       reconcileDependentPresentation(main);
     };
     root.addEventListener('garang:screen-rendered',repairOnLifecycle,{passive:true});
     root.addEventListener('garang:route-completed',repairOnLifecycle,{passive:true});
   }
   if(!document.querySelector('script[data-garang-reference-ui-v2]')){
     const script=document.createElement('script');
     script.src='./06_features/ui/runtime/garang-reference-ui-v2.js?v=2.0.0';script.defer=true;script.dataset.garangReferenceUiV2='1';
     script.addEventListener('load',()=>{root.GarangReferenceUIV2?.schedule?.();attachReferenceStructureGuard();},{once:true});
     document.head.appendChild(script);
   }
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attachReferenceStructureGuard,{once:true});else attachReferenceStructureGuard();
 }
})(typeof window==='undefined'?globalThis:window);
