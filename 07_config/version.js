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
   link.href='./03_styles/runtime/garang-founder-target-v5.css?v=5.0.6-founder-board-structure';
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

   hide(flow.querySelector(':scope > .g5-today-hero-copy'));
   hide(flow.querySelector(':scope > .g4-today-anatomy'));

   const canonicalAnatomy=main.querySelector('.today-body-panel');
   if(canonicalAnatomy){
     if(canonicalAnatomy.parentElement!==flow)flow.appendChild(canonicalAnatomy);
     canonicalAnatomy.dataset.garangFounderAnatomy='canonical';
     show(canonicalAnatomy,'grid');
     setImportant(canonicalAnatomy,'position','absolute');setImportant(canonicalAnatomy,'right','-8px');setImportant(canonicalAnatomy,'top','8px');setImportant(canonicalAnatomy,'z-index','2');setImportant(canonicalAnatomy,'width','49%');setImportant(canonicalAnatomy,'height','225px');setImportant(canonicalAnatomy,'min-height','0');setImportant(canonicalAnatomy,'margin','0');setImportant(canonicalAnatomy,'padding','0');setImportant(canonicalAnatomy,'border','0');setImportant(canonicalAnatomy,'background','transparent');setImportant(canonicalAnatomy,'overflow','hidden');setImportant(canonicalAnatomy,'pointer-events','none');
     canonicalAnatomy.querySelectorAll('.today-body-label,.today-body-view-controls,[data-today-view]').forEach(hide);
     const wrap=canonicalAnatomy.querySelector('.muscle-map-wrap');if(wrap){show(wrap,'flex');setImportant(wrap,'width','100%');setImportant(wrap,'height','100%');setImportant(wrap,'min-height','0');setImportant(wrap,'align-items','flex-start');setImportant(wrap,'justify-content','center');setImportant(wrap,'overflow','visible');}
     const map=canonicalAnatomy.querySelector('.muscle-map');if(map){show(map,'block');setImportant(map,'width','100%');setImportant(map,'height','100%');setImportant(map,'min-height','0');setImportant(map,'position','relative');}
     canonicalAnatomy.querySelectorAll('.body-view').forEach(view=>{setImportant(view,'width','100%');setImportant(view,'height','100%');setImportant(view,'align-items','flex-start');setImportant(view,'justify-content','center');});
     canonicalAnatomy.querySelectorAll('svg.g3-body-model,svg.g2-body-model').forEach(svg=>{show(svg,'block');setImportant(svg,'width','auto');setImportant(svg,'height','330px');setImportant(svg,'max-height','none');setImportant(svg,'max-width','190px');setImportant(svg,'transform','translateY(-2px) scale(1.32)');setImportant(svg,'transform-origin','center top');setImportant(svg,'filter','drop-shadow(0 22px 28px rgba(0,0,0,.60)) contrast(1.07) saturate(1.08)');});
   }

   const decision=flow.querySelector('.gtf-decision');
   if(decision){
     if(decision.parentElement!==flow){const date=flow.querySelector(':scope > .g5-today-date');flow.insertBefore(decision,date?.nextSibling||flow.firstChild);}
     show(decision,'block');
     setImportant(decision,'position','relative');setImportant(decision,'z-index','3');setImportant(decision,'width','100%');setImportant(decision,'max-width','none');setImportant(decision,'min-height','205px');setImportant(decision,'margin','0');setImportant(decision,'padding','28px 47% 18px 0');setImportant(decision,'background','transparent');setImportant(decision,'border','0');
     const h2=decision.querySelector('h2'),p=decision.querySelector('p');
     if(h2){setImportant(h2,'margin','0 0 10px');setImportant(h2,'font-size','26px');setImportant(h2,'line-height','1.08');setImportant(h2,'letter-spacing','-.055em');setImportant(h2,'font-weight','850');setImportant(h2,'color','#fff');}
     if(p){setImportant(p,'margin','0');setImportant(p,'font-size','11px');setImportant(p,'line-height','1.55');setImportant(p,'color','#9ba4b2');}
   }

   const workoutCard=flow.querySelector(':scope > .g5-today-workout-card');
   const canonicalAction=flow.querySelector('.gtf-action')||main.querySelector('.gtf-action');
   if(workoutCard&&canonicalAction){
     if(canonicalAction.parentElement!==workoutCard)workoutCard.prepend(canonicalAction);
     show(canonicalAction,'block');
     setImportant(canonicalAction,'grid-column','1');setImportant(canonicalAction,'grid-row','1 / 3');setImportant(canonicalAction,'position','relative');setImportant(canonicalAction,'z-index','3');setImportant(canonicalAction,'align-self','stretch');setImportant(canonicalAction,'min-width','0');setImportant(canonicalAction,'padding','0');setImportant(canonicalAction,'margin','0');setImportant(canonicalAction,'background','transparent');setImportant(canonicalAction,'border','0');
     const plan=canonicalAction.querySelector('.gtdw-plan');if(plan){show(plan,'grid');setImportant(plan,'gap','5px');setImportant(plan,'margin','0 0 8px');}
     const loading=canonicalAction.querySelector('.gtdw-loading');if(loading){show(loading,'grid');setImportant(loading,'gap','4px');}
     canonicalAction.querySelectorAll('.gtdw-row').forEach(row=>{show(row,'flex');setImportant(row,'min-height','22px');setImportant(row,'align-items','center');setImportant(row,'justify-content','space-between');setImportant(row,'gap','6px');setImportant(row,'font-size','10px');setImportant(row,'color','#a8b0bd');});
     const start=canonicalAction.querySelector('[data-garang-direct-workout-start="1"]');if(start){show(start,'grid');setImportant(start,'place-items','center');setImportant(start,'width','100%');setImportant(start,'min-height','48px');setImportant(start,'margin-top','6px');setImportant(start,'border-radius','9px');setImportant(start,'border','0');setImportant(start,'background','linear-gradient(135deg,#8b8eff,#6267ff)');setImportant(start,'color','#fff');setImportant(start,'font-size','14px');setImportant(start,'font-weight','800');}
     const cardAnatomy=workoutCard.querySelector(':scope > .g5-today-card-anatomy');if(cardAnatomy){show(cardAnatomy,'block');setImportant(cardAnatomy,'width','98px');setImportant(cardAnatomy,'height','146px');setImportant(cardAnatomy,'object-fit','cover');setImportant(cardAnatomy,'object-position','50% 4%');setImportant(cardAnatomy,'transform','translateY(13px) scale(1.38)');setImportant(cardAnatomy,'transform-origin','center top');setImportant(cardAnatomy,'opacity','.92');}
     hide(workoutCard.querySelector(':scope > .g5-today-workout-copy'));
   }

   const shortcut=main.querySelector('[data-garang-planner-shortcut="1"]');
   if(workoutCard&&shortcut){
     if(shortcut.parentElement!==workoutCard)workoutCard.appendChild(shortcut);
     shortcut.dataset.garangPlannerShortcutHost='founder';
     show(shortcut,'grid');
     setImportant(shortcut,'position','absolute');setImportant(shortcut,'right','7px');setImportant(shortcut,'top','7px');setImportant(shortcut,'z-index','9');setImportant(shortcut,'width','44px');setImportant(shortcut,'min-width','44px');setImportant(shortcut,'height','44px');setImportant(shortcut,'min-height','44px');setImportant(shortcut,'margin','0');
   }

   hide(flow.querySelector('.gpc-today-plan'));
   hide(flow.querySelector('.gtf-state'));
   [...flow.children].forEach(child=>{if(child!==decision&&child!==canonicalAnatomy&&/GARANG\s*SCORE/i.test(String(child.textContent||'')))hide(child);});
   show(flow.querySelector(':scope > .g5-today-status'),'block');
   show(flow.querySelector(':scope > .g5-today-coach'),'grid');
 }
 function reconcileWorkoutTarget(){
   const main=document.getElementById('main');
   if(!main||String(main.dataset.garangScreen||'')!=='workout')return;
   const live=main.querySelector('.workout-session-bar.is-live');
   if(!live)return;
   const media=main.querySelector('.g5-workout-media');
   const hero=main.querySelector('.workout-visual-hero');
   if(!media||!hero)return;
   if(hero.parentElement!==media)media.prepend(hero);
   media.classList.add('g5-has-canonical-workout-visual');
   show(hero,'block');
   setImportant(hero,'position','absolute');setImportant(hero,'inset','0');setImportant(hero,'width','100%');setImportant(hero,'height','100%');setImportant(hero,'min-height','0');setImportant(hero,'margin','0');setImportant(hero,'padding','0');setImportant(hero,'border','0');setImportant(hero,'border-radius','0');setImportant(hero,'background','transparent');setImportant(hero,'overflow','hidden');setImportant(hero,'pointer-events','none');
   hero.querySelectorAll('*').forEach(node=>setImportant(node,'pointer-events','none'));
 }
 function installSafety(){
   if(!document.getElementById('garang-founder-target-v5-safety')){
     const style=document.createElement('style');
     style.id='garang-founder-target-v5-safety';
     style.textContent=`
       #main.g5-screen-workout:not(:has(.workout-session-bar.is-live)) .workout-visual-hero,
       #main.g5-screen-workout:not(:has(.workout-session-bar.is-live)) .workout-visual-hero *{pointer-events:none!important}
       #main.g5-screen-workout .g5-workout-media.g5-has-canonical-workout-visual::before,
       #main.g5-screen-workout .g5-workout-media.g5-has-canonical-workout-visual::after{display:none!important;content:none!important}
       #main.g5-screen-workout .g5-workout-media.g5-has-canonical-workout-visual .workout-visual-hero,
       #main.g5-screen-workout .g5-workout-media.g5-has-canonical-workout-visual .workout-visual-hero *{pointer-events:none!important}
       #main.g5-screen-today .g5-today-hero-copy,#main.g5-screen-today .g5-today-workout-copy,#main.g5-screen-today #garangTodayFlow>.g4-today-anatomy{display:none!important}
       #main.g5-screen-today #garangTodayFlow>.today-body-panel[data-garang-founder-anatomy="canonical"]{display:grid!important}
       #main.g5-screen-today .g5-today-workout-card>.gtf-action{position:relative!important;z-index:3!important}
       #main.g5-screen-today .g5-today-workout-card .g5-today-card-anatomy{grid-column:2!important;grid-row:1 / 3!important}
       #main.g5-screen-today [data-garang-planner-shortcut="1"][data-garang-planner-shortcut-host="founder"]{background:rgba(9,13,20,.58)!important;border:1px solid rgba(255,255,255,.06)!important;backdrop-filter:blur(10px)!important}
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
       }else if(name==='workout')reconcileWorkoutTarget();
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
   script.src='./06_features/ui/runtime/garang-founder-target-v5.js?v=5.0.6-founder-board-structure';
   script.defer=true;
   script.dataset.garangPresentationV4='1';
   script.dataset.garangFounderTargetV5='1';
   script.addEventListener('load',()=>{root.GarangFounderTargetV5?.schedule?.();installSafety();},{once:true});
   document.head.appendChild(script);
 }
 loadStyle();
 loadPresentation();
})(typeof window==='undefined'?globalThis:window);
