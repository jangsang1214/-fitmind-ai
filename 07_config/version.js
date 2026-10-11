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
     guard.rel='stylesheet';guard.href='./03_styles/runtime/garang-reference-ui-v2-guards.css?v=2.1.5-draft-manage-safe';guard.dataset.garangReferenceUiV2Guards='1';
     document.head.appendChild(guard);
   }
   if(!document.getElementById('garangReferenceTodayEvidenceGuard')){
     const style=document.createElement('style');style.id='garangReferenceTodayEvidenceGuard';
     style.textContent='#main.g-ref-screen-today .g-ref-today-body-card{display:none!important}#main.g-ref-screen-today[data-gtf-body-evidence="1"] .g-ref-today-body-card{display:grid!important}#main[data-garang-screen="workout"] .workout-session-bar{width:100%!important;max-width:none!important;min-width:0!important;justify-self:stretch!important;align-self:stretch!important;box-sizing:border-box!important;margin-left:0!important;margin-right:0!important}@media(max-width:800px){#main.g-ref-screen-workout #workoutDraftArea .workout-draft-record,#main.g-ref-screen-workout #workoutDraftArea [data-execute-workout]{order:1!important;position:relative!important;z-index:8!important;pointer-events:auto!important;touch-action:manipulation!important}#main.g-ref-screen-workout #workoutDraftArea .workout-draft-manage{order:2!important;width:100%!important;min-height:44px!important;justify-self:stretch!important;position:relative!important;z-index:5!important;isolation:isolate!important}#main.g-ref-screen-workout #workoutDraftArea .workout-draft-manage>summary{min-height:44px!important;margin-left:auto!important;position:relative!important;z-index:6!important;pointer-events:auto!important;touch-action:manipulation!important}}';
     document.head.appendChild(style);
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
       const shell=main.querySelector('.garang-coach-v2')||main.querySelector('.coach-app-shell');
       return !!shell&&!shell.classList.contains('g-ref-coach-shell');
     }
     if(screen==='workout'){
       const execution=main.querySelector('.workout-execution-v2');
       return !!execution&&!execution.classList.contains('g-ref-workout-execution');
     }
     return false;
   }
   function ensureTodayPlannerShortcut(main){
     if(String(main?.dataset?.garangScreen||'')!=='today')return false;
     if(main.querySelector('[data-garang-planner-shortcut="1"]'))return true;
     if(!main.querySelector('.gpc-today-plan-head'))return false;
     return root.GarangMobileCheckinPlannerShortcutV1?.ensurePlannerShortcut?.()===true;
   }
   function reconcileDependentPresentation(main){
     if(String(main?.dataset?.garangScreen||'')!=='today')return;
     ensureTodayPlannerShortcut(main);
     setTimeout(()=>{root.GarangMobileCheckinPlannerShortcutV1?.reconcile?.();ensureTodayPlannerShortcut(main);},420);
   }
   function repairTodayOwnership(main){
     if(String(main?.dataset?.garangScreen||'')!=='today')return false;
     const flow=main.querySelector('#garangTodayFlow'),stage=main.querySelector(':scope > .g-ref-today-stage');
     if(!flow||!stage||flow.parentElement===stage)return false;
     stage.prepend(flow);
     main.dataset.garangReferenceUi='v2';
     reconcileDependentPresentation(main);
     return true;
   }
   function attachReferenceStructureGuard(){
     if(root.__GARANG_REFERENCE_STRUCTURE_GUARD__)return;
     const main=document.getElementById('main');
     if(!main){setTimeout(attachReferenceStructureGuard,80);return;}
     root.__GARANG_REFERENCE_STRUCTURE_GUARD__=true;
     const repair=()=>{
       const owned=repairTodayOwnership(main);
       ensureTodayPlannerShortcut(main);
       if(owned)return;
       if(!referenceStructureNeedsRepair(main))return;
       root.GarangReferenceUIV2?.apply?.();
       reconcileDependentPresentation(main);
     };
     const observer=new MutationObserver(repair);
     observer.observe(main,{childList:true,subtree:true});
     const repairOnLifecycle=()=>{
       const owned=repairTodayOwnership(main);
       ensureTodayPlannerShortcut(main);
       if(owned)return;
       if(!referenceStructureNeedsRepair(main))return;
       root.GarangReferenceUIV2?.apply?.();
       reconcileDependentPresentation(main);
     };
     root.addEventListener('garang:screen-rendered',repairOnLifecycle,{passive:true});
     root.addEventListener('garang:route-completed',repairOnLifecycle,{passive:true});
     reconcileDependentPresentation(main);
   }
   if(!document.querySelector('script[data-garang-reference-ui-v2]')){
     const script=document.createElement('script');
     script.src='./06_features/ui/runtime/garang-reference-ui-v2.js?v=2.0.6-stable-markup';script.defer=true;script.dataset.garangReferenceUiV2='1';
     script.addEventListener('load',()=>{root.GarangReferenceUIV2?.schedule?.();attachReferenceStructureGuard();},{once:true});
     document.head.appendChild(script);
   }
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attachReferenceStructureGuard,{once:true});else attachReferenceStructureGuard();
 }
})(typeof window==='undefined'?globalThis:window);