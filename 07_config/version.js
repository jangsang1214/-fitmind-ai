(function(root){
 'use strict';
 const build=Object.freeze({version:'0.11.0-beta.6',label:'0.11.0 BETA 6',channel:'COMMERCIAL HARDENING',buildId:'20261019-founder-target-v5',schema:5});
 root.GARANG_BUILD=build;
 if(!root.document)return;
 document.documentElement.dataset.garangVersion=build.version;
 document.documentElement.dataset.garangChannel=build.channel;

 function loadStyle(){
   if(document.querySelector('link[data-garang-presentation-v4]'))return;
   const link=document.createElement('link');
   link.rel='stylesheet';
   link.href='./03_styles/runtime/garang-founder-target-v5.css?v=5.0.3-founder-board-structure';
   link.dataset.garangPresentationV4='1';
   link.dataset.garangFounderTargetV5='1';
   document.head.appendChild(link);
 }
 function setImportant(node,name,value){
   if(!node?.style)return;
   if(node.style.getPropertyValue(name)===value&&node.style.getPropertyPriority(name)==='important')return;
   node.style.setProperty(name,value,'important');
 }
 function show(node,display='block'){
   if(!node)return;
   if(node.hidden)node.hidden=false;
   if(node.getAttribute('aria-hidden')==='true')node.removeAttribute('aria-hidden');
   setImportant(node,'display',display);setImportant(node,'visibility','visible');setImportant(node,'opacity','1');
 }
 function hide(node){if(node)setImportant(node,'display','none');}
 function reconcileTodayTarget(){
   const main=document.getElementById('main');
   if(!main||String(main.dataset.garangScreen||'')!=='today')return;
   const flow=document.getElementById('garangTodayFlow');
   if(!flow)return;
   if(!flow.querySelector(':scope > .g5-today-date')||!flow.querySelector(':scope > .g5-today-workout-card')){
     root.GarangFounderTargetV5?.schedule?.();return;
   }

   const generatedCopy=flow.querySelector(':scope > .g5-today-hero-copy');
   hide(generatedCopy);

   const decision=flow.querySelector('.gtf-decision');
   if(decision){
     if(decision.parentElement!==flow){const date=flow.querySelector(':scope > .g5-today-date');flow.insertBefore(decision,date?.nextSibling||flow.firstChild);}
     show(decision,'block');
     setImportant(decision,'position','relative');setImportant(decision,'z-index','3');setImportant(decision,'width','100%');setImportant(decision,'max-width','none');setImportant(decision,'min-height','205px');setImportant(decision,'margin','0');setImportant(decision,'padding','28px 43% 18px 0');setImportant(decision,'background','transparent');setImportant(decision,'border','0');
     const h2=decision.querySelector('h2'),p=decision.querySelector('p');
     if(h2){setImportant(h2,'margin','0 0 10px');setImportant(h2,'font-size','27px');setImportant(h2,'line-height','1.08');setImportant(h2,'letter-spacing','-.055em');setImportant(h2,'font-weight','850');setImportant(h2,'color','#fff');}
     if(p){setImportant(p,'margin','0');setImportant(p,'font-size','11px');setImportant(p,'line-height','1.55');setImportant(p,'color','#9ba4b2');}
   }

   const workoutCard=flow.querySelector(':scope > .g5-today-workout-card');
   const direct=flow.querySelector('.gtdw-direct-workout')||main.querySelector('.gtdw-direct-workout');
   if(workoutCard&&direct){
     if(direct.parentElement!==workoutCard)workoutCard.prepend(direct);
     show(direct,'grid');setImportant(direct,'grid-column','1');setImportant(direct,'grid-row','1 / 3');setImportant(direct,'align-content','start');setImportant(direct,'gap','6px');setImportant(direct,'min-width','0');setImportant(direct,'padding','0');setImportant(direct,'margin','0');setImportant(direct,'background','transparent');setImportant(direct,'border','0');
     direct.querySelectorAll('.gtdw-row').forEach(row=>{show(row,'flex');setImportant(row,'min-height','22px');setImportant(row,'align-items','center');setImportant(row,'gap','6px');setImportant(row,'font-size','10px');setImportant(row,'color','#a8b0bd');});
     const start=direct.querySelector('.gtdw-start');if(start){show(start,'grid');setImportant(start,'place-items','center');setImportant(start,'width','100%');setImportant(start,'min-height','48px');setImportant(start,'margin-top','6px');setImportant(start,'border-radius','9px');setImportant(start,'border','0');setImportant(start,'background','linear-gradient(135deg,#8b8eff,#6267ff)');setImportant(start,'color','#fff');setImportant(start,'font-size','14px');setImportant(start,'font-weight','800');}
     hide(workoutCard.querySelector(':scope > .g5-today-workout-copy'));
     const legacyAction=workoutCard.querySelector(':scope > .gtf-action');if(legacyAction&&!direct.contains(legacyAction))hide(legacyAction);
   }

   hide(flow.querySelector('.gpc-today-plan'));
   hide(flow.querySelector('.gtf-state'));
   [...flow.children].forEach(child=>{if(child!==decision&&/GARANG\s*SCORE/i.test(String(child.textContent||'')))hide(child);});
   show(flow.querySelector(':scope > .g5-today-status'),'block');
   show(flow.querySelector(':scope > .g5-today-coach'),'grid');
 }
 function installSafety(){
   if(!document.getElementById('garang-founder-target-v5-safety')){
     const style=document.createElement('style');
     style.id='garang-founder-target-v5-safety';
     style.textContent=`
       #main.g5-screen-workout:not(:has(.workout-session-bar.is-live)) .workout-visual-hero,
       #main.g5-screen-workout:not(:has(.workout-session-bar.is-live)) .workout-visual-hero *{pointer-events:none!important}
       #main.g5-screen-today .g5-today-hero-copy,#main.g5-screen-today .g5-today-workout-copy{display:none!important}
       #main.g5-screen-today .g5-today-workout-card .gtdw-direct-workout{position:relative!important;z-index:3!important}
       #main.g5-screen-today .g5-today-workout-card .g5-today-card-anatomy{grid-column:2!important;grid-row:1 / 3!important}
     `;
     document.head.appendChild(style);
   }
   let navTimer=0,presentationTimer=0;
   const syncNav=()=>{
     clearTimeout(navTimer);
     navTimer=setTimeout(()=>{
       const main=document.getElementById('main');
       const nav=document.getElementById('bottomNav');
       if(!main||!nav)return;
       const workout=String(main.dataset.garangScreen||'')==='workout';
       const live=!!document.querySelector('.workout-session-bar.is-live');
       const rest=document.getElementById('workoutExecutionRest');
       const resting=!!rest&&!rest.hidden&&getComputedStyle(rest).display!=='none';
       nav.style.setProperty('display',workout&&(live||resting)?'none':'grid','important');
     },40);
   };
   const reconcilePresentation=()=>{
     clearTimeout(presentationTimer);
     presentationTimer=setTimeout(()=>{
       const main=document.getElementById('main');
       if(!main)return;
       const name=String(main.dataset.garangScreen||'');
       if(name==='today'){
         const flow=document.getElementById('garangTodayFlow');
         if(flow&&!flow.querySelector(':scope > .g5-today-workout-card'))root.GarangFounderTargetV5?.schedule?.();
         else reconcileTodayTarget();
       }
     },28);
   };
   const reconcile=()=>{syncNav();reconcilePresentation();};
   ['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:state-hydrated','garang:workout-session-started','garang:workout-set-rows-rendered','pageshow'].forEach(event=>window.addEventListener(event,reconcile,{passive:true}));
   document.addEventListener('click',syncNav,true);
   new MutationObserver(reconcile).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','style']});
   reconcile();
 }
 function loadPresentation(){
   if(document.querySelector('script[data-garang-presentation-v4]'))return;
   const script=document.createElement('script');
   script.src='./06_features/ui/runtime/garang-founder-target-v5.js?v=5.0.3-founder-board-structure';
   script.defer=true;
   script.dataset.garangPresentationV4='1';
   script.dataset.garangFounderTargetV5='1';
   script.addEventListener('load',()=>{root.GarangFounderTargetV5?.schedule?.();installSafety();},{once:true});
   document.head.appendChild(script);
 }
 loadStyle();
 loadPresentation();
})(typeof window==='undefined'?globalThis:window);
