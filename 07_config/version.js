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
   if(!document.querySelector('link[data-garang-reference-ui-commercial]')){
     const commercial=document.createElement('link');
     commercial.rel='stylesheet';commercial.href='./03_styles/runtime/garang-reference-ui-commercial-v1.css?v=1.0.1-layout-safe';commercial.dataset.garangReferenceUiCommercial='1';
     document.head.appendChild(commercial);
   }
   if(!document.getElementById('garangReferenceTodayEvidenceGuard')){
     const style=document.createElement('style');style.id='garangReferenceTodayEvidenceGuard';
     style.textContent='#main.g-ref-screen-today #garangTodayFlow{display:grid!important}#main.g-ref-screen-today .g-ref-today-body-card{display:none!important}#main.g-ref-screen-today[data-gtf-body-evidence="1"] .g-ref-today-body-card{display:grid!important}#main[data-garang-screen="workout"] .workout-session-bar{width:100%!important;max-width:none!important;min-width:0!important;justify-self:stretch!important;align-self:stretch!important;box-sizing:border-box!important;margin-left:0!important;margin-right:0!important}@media(max-width:800px){#main.g-ref-screen-workout #workoutDraftArea .list-item{display:grid!important;grid-template-columns:minmax(0,1fr)!important;align-items:stretch!important;row-gap:6px!important}#main.g-ref-screen-workout #workoutDraftArea .list-item>div:first-child{width:100%!important;min-width:0!important}#main.g-ref-screen-workout #workoutDraftArea .workout-draft-actions{display:grid!important;grid-template-columns:minmax(0,1fr) 72px!important;align-items:stretch!important;width:100%!important;min-width:0!important;gap:8px!important;overflow:visible!important;position:relative!important;z-index:6!important;isolation:isolate!important}#main.g-ref-screen-workout #workoutDraftArea .workout-draft-record,#main.g-ref-screen-workout #workoutDraftArea [data-execute-workout]{width:100%!important;min-width:0!important;position:relative!important;z-index:2!important;pointer-events:auto!important;touch-action:manipulation!important;scroll-margin-bottom:calc(84px + env(safe-area-inset-bottom,0px))!important}#main.g-ref-screen-workout #workoutDraftArea .workout-draft-manage{width:72px!important;min-width:72px!important;min-height:44px!important;justify-self:stretch!important;position:relative!important;z-index:7!important;isolation:isolate!important}#main.g-ref-screen-workout #workoutDraftArea .workout-draft-manage>summary{width:100%!important;min-width:0!important;min-height:44px!important;margin-left:0!important;position:relative!important;pointer-events:auto!important;touch-action:manipulation!important;scroll-margin-bottom:calc(84px + env(safe-area-inset-bottom,0px))!important}#main.g-ref-screen-workout #workoutDraftArea .workout-draft-manage-actions{top:auto!important;bottom:calc(100% + 7px)!important;right:0!important;z-index:8!important}#main.g-ref-screen-workout #workoutDraftArea .workout-draft-meta{display:block!important;width:100%!important;min-width:0!important;margin:2px 0 0!important;padding:0 2px 10px!important;line-height:1.55!important;overflow-wrap:anywhere!important}#main.g-ref-screen-workout #workoutDraftArea:has(.workout-draft-manage[open]){position:relative!important;z-index:10!important;overflow:visible!important}#main.g-ref-screen-workout #workoutDraftArea .list-item:has(.workout-draft-manage[open]){position:relative!important;z-index:11!important;overflow:visible!important}#main.g-ref-screen-workout #workoutDraftArea .workout-draft-actions:has(.workout-draft-manage[open]){z-index:12!important}#main.g-ref-screen-workout #workoutDraftArea .workout-draft-manage[open]{z-index:13!important}#main.g-ref-screen-workout #workoutDraftArea .workout-draft-manage[open] .workout-draft-manage-actions{z-index:14!important;pointer-events:auto!important}}';
     document.head.appendChild(style);
   }
   function referenceStructureNeedsRepair(main){
     if(!main)return false;
     const screen=String(main.dataset?.garangScreen||'');
     if(screen==='today'){
       const flow=main.querySelector('#garangTodayFlow');
       return !!flow&&(!flow.parentElement?.classList?.contains('g-ref-today-stage')||!flow.classList.contains('g-ref-primary-decision'));
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
     if(!flow||!stage)return false;
     let changed=false;
     if(flow.parentElement!==stage){stage.prepend(flow);changed=true;}
     if(!flow.classList.contains('g-ref-primary-decision')){flow.classList.add('g-ref-primary-decision');changed=true;}
     if(!changed)return false;
     main.dataset.garangReferenceUi='v2';
     reconcileDependentPresentation(main);
     return true;
   }
   function reconcileWorkoutDraftDomOrder(main){
     if(String(main?.dataset?.garangScreen||'')!=='workout')return false;
     let changed=false;
     main.querySelectorAll('#workoutDraftArea .list-item').forEach(row=>{
       const info=row.firstElementChild,actions=row.querySelector('.workout-draft-actions');
       if(!info||!actions)return;
       let meta=row.querySelector(':scope > .workout-draft-meta')||info.querySelector(':scope > .muted');
       if(actions.parentElement!==row||info.nextElementSibling!==actions){info.after(actions);changed=true;}
       if(meta){
         meta.classList.add('workout-draft-meta');
         if(meta.parentElement!==row||actions.nextElementSibling!==meta){actions.after(meta);changed=true;}
       }
     });
     return changed;
   }
   function revealWorkoutDraftPrimaryAction(){
     const main=document.getElementById('main');
     if(String(main?.dataset?.garangScreen||'')!=='workout')return;
     requestAnimationFrame(()=>requestAnimationFrame(()=>{
       const target=main.querySelector('#workoutDraftArea [data-execute-workout]');
       target?.scrollIntoView?.({block:'center',inline:'nearest',behavior:'auto'});
     }));
   }
   function resyncWorkoutAfterSetCompletion(){
     const main=document.getElementById('main');
     if(String(main?.dataset?.garangScreen||'')!=='workout')return;
     const sync=()=>root.GarangWorkoutExecutionV2?.enhance?.();
     requestAnimationFrame(()=>requestAnimationFrame(sync));
     setTimeout(sync,120);
     setTimeout(sync,420);
   }
   function attachReferenceStructureGuard(){
     if(root.__GARANG_REFERENCE_STRUCTURE_GUARD__)return;
     const main=document.getElementById('main');
     if(!main){setTimeout(attachReferenceStructureGuard,80);return;}
     root.__GARANG_REFERENCE_STRUCTURE_GUARD__=true;
     reconcileWorkoutDraftDomOrder(main);
     const repair=()=>{
       const owned=repairTodayOwnership(main);
       ensureTodayPlannerShortcut(main);
       reconcileWorkoutDraftDomOrder(main);
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
       reconcileWorkoutDraftDomOrder(main);
       if(owned)return;
       if(!referenceStructureNeedsRepair(main))return;
       root.GarangReferenceUIV2?.apply?.();
       reconcileDependentPresentation(main);
     };
     root.addEventListener('garang:screen-rendered',repairOnLifecycle,{passive:true});
     root.addEventListener('garang:route-completed',repairOnLifecycle,{passive:true});
     root.addEventListener('garang:workout-exercise-added',revealWorkoutDraftPrimaryAction,{passive:true});
     document.addEventListener('click',event=>{if(event.target.closest?.('[data-execution-set-complete]'))resyncWorkoutAfterSetCompletion();},true);
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