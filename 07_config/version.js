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
   link.href='./03_styles/runtime/garang-founder-target-v5.css?v=5.0.8-founder-board-structure';
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

   const legacyHero=main.querySelector('.visual-today-hero');
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
   hide(legacyHero);
   hide(main.querySelector('.today-decision-panel'));

   const decision=flow.querySelector('.gtf-decision');
   if(decision){
     if(decision.parentElement!==flow){const date=flow.querySelector(':scope > .g5-today-date');flow.insertBefore(decision,date?.nextSibling||flow.firstChild);}
     show(decision,'block');
     setImportant(decision,'position','relative');setImportant(decision,'z-index','3');setImportant(decision,'width','100%');setImportant(decision,'max-width','none');setImportant(decision,'min-height','198px');setImportant(decision,'margin','0');setImportant(decision,'padding','22px 47% 14px 0');setImportant(decision,'background','transparent');setImportant(decision,'border','0');
     const h2=decision.querySelector('h2'),p=decision.querySelector('p');
     if(h2){setImportant(h2,'margin','0 0 9px');setImportant(h2,'font-size','26px');setImportant(h2,'line-height','1.08');setImportant(h2,'letter-spacing','-.055em');setImportant(h2,'font-weight','850');setImportant(h2,'color','#fff');}
     if(p){setImportant(p,'margin','0');setImportant(p,'font-size','11px');setImportant(p,'line-height','1.5');setImportant(p,'color','#9ba4b2');}
   }

   const workoutCard=flow.querySelector(':scope > .g5-today-workout-card');
   const canonicalAction=flow.querySelector('.gtf-action')||main.querySelector('.gtf-action');
   if(workoutCard&&canonicalAction){
     setImportant(workoutCard,'min-height','148px');setImportant(workoutCard,'margin','6px 0 15px');setImportant(workoutCard,'padding','12px');setImportant(workoutCard,'grid-template-columns','minmax(0,1fr) 100px');setImportant(workoutCard,'grid-template-rows','auto auto');
     const summary=workoutCard.querySelector(':scope > .g5-today-workout-copy');
     if(summary){show(summary,'grid');setImportant(summary,'grid-column','1');setImportant(summary,'grid-row','1');setImportant(summary,'gap','4px');setImportant(summary,'padding-right','4px');}
     if(canonicalAction.parentElement!==workoutCard)workoutCard.prepend(canonicalAction);
     show(canonicalAction,'block');
     setImportant(canonicalAction,'grid-column','1');setImportant(canonicalAction,'grid-row','2');setImportant(canonicalAction,'position','relative');setImportant(canonicalAction,'z-index','3');setImportant(canonicalAction,'align-self','end');setImportant(canonicalAction,'min-width','0');setImportant(canonicalAction,'padding','0');setImportant(canonicalAction,'margin','0');setImportant(canonicalAction,'background','transparent');setImportant(canonicalAction,'border','0');
     const plan=canonicalAction.querySelector('.gtdw-plan');if(plan)hide(plan);
     const loading=canonicalAction.querySelector('.gtdw-loading');
     const start=canonicalAction.querySelector('[data-garang-direct-workout-start="1"]');
     if(start){if(start.disabled){if(loading)show(loading,'grid');}else if(loading)hide(loading);show(start,'grid');setImportant(start,'place-items','center');setImportant(start,'width','100%');setImportant(start,'min-height','48px');setImportant(start,'margin-top','5px');setImportant(start,'border-radius','9px');setImportant(start,'border','0');setImportant(start,'background','linear-gradient(135deg,#8b8eff,#6267ff)');setImportant(start,'color','#fff');setImportant(start,'font-size','14px');setImportant(start,'font-weight','800');}
     const cardAnatomy=workoutCard.querySelector(':scope > .g5-today-card-anatomy');if(cardAnatomy){show(cardAnatomy,'block');setImportant(cardAnatomy,'width','94px');setImportant(cardAnatomy,'height','138px');setImportant(cardAnatomy,'object-fit','cover');setImportant(cardAnatomy,'object-position','50% 4%');setImportant(cardAnatomy,'transform','translateY(15px) scale(1.36)');setImportant(cardAnatomy,'transform-origin','center top');setImportant(cardAnatomy,'opacity','.92');}
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
   const status=flow.querySelector(':scope > .g5-today-status');
   if(status){show(status,'block');setImportant(status,'margin','0 0 12px');const grid=status.querySelector('.g5-today-status-grid');if(grid){setImportant(grid,'grid-template-columns','repeat(3,78px)');setImportant(grid,'justify-content','space-between');setImportant(grid,'gap','6px');grid.querySelectorAll('.g5-status-meter').forEach(meter=>{setImportant(meter,'width','78px');setImportant(meter,'height','78px');setImportant(meter,'min-height','78px');const value=meter.querySelector('b');if(value)setImportant(value,'font-size','17px');});}}
   const coach=flow.querySelector(':scope > .g5-today-coach');if(coach){show(coach,'grid');setImportant(coach,'margin','0');setImportant(coach,'min-height','62px');}
 }
 function reconcileWorkoutTarget(){
   const main=document.getElementById('main');
   if(!main||String(main.dataset.garangScreen||'')!=='workout')return;
   const result=main.querySelector('.workout-result-card');
   if(result&&getComputedStyle(result).display!=='none'){
     main.classList.add('g5-workout-summary-mode');
     let shell=main.querySelector(':scope > .g5-founder-summary-shell');
     if(!shell){shell=document.createElement('section');shell.className='g5-founder-summary-shell';main.prepend(shell);}
     let heading=main.querySelector(':scope > .g5-summary-heading')||shell.querySelector(':scope > .g5-summary-heading');
     if(!heading){heading=document.createElement('section');heading.className='g5-summary-heading';heading.innerHTML='<strong>운동 완료 🎉</strong><span>오늘의 결과와 다음 행동</span>';}
     if(heading.parentElement!==shell)shell.prepend(heading);
     if(result.parentElement!==shell)shell.appendChild(result);
     [...main.children].forEach(child=>{if(child===shell)show(child,'block');else hide(child);});
     show(shell,'block');show(heading,'grid');show(result,'block');
     setImportant(shell,'min-height','calc(100dvh - 40px)');setImportant(shell,'padding','10px 0 20px');setImportant(shell,'background','#05070a');
     setImportant(heading,'gap','4px');setImportant(heading,'margin','2px 0 14px');
     const headStrong=heading.querySelector('strong'),headSmall=heading.querySelector('span');if(headStrong){setImportant(headStrong,'font-size','25px');setImportant(headStrong,'line-height','1.15');setImportant(headStrong,'color','#fff');}if(headSmall){setImportant(headSmall,'font-size','10px');setImportant(headSmall,'color','#858e9c');}
     setImportant(result,'position','relative');setImportant(result,'min-height','620px');setImportant(result,'margin','0');setImportant(result,'padding','0');setImportant(result,'border','0');setImportant(result,'background','transparent');setImportant(result,'box-shadow','none');setImportant(result,'overflow','visible');
     const kicker=result.querySelector('.workout-result-kicker');if(kicker){show(kicker,'flex');setImportant(kicker,'margin','0 0 8px');setImportant(kicker,'color','#858aff');setImportant(kicker,'font-size','9px');}
     const title=result.querySelector('h2');if(title){setImportant(title,'margin','0 0 14px');setImportant(title,'font-size','19px');setImportant(title,'line-height','1.25');}
     const grid=result.querySelector('.workout-result-grid');if(grid){setImportant(grid,'display','grid');setImportant(grid,'grid-template-columns','repeat(2,minmax(0,1fr))');setImportant(grid,'gap','8px');grid.querySelectorAll(':scope > div').forEach(cell=>{setImportant(cell,'min-height','82px');setImportant(cell,'padding','12px');setImportant(cell,'border','1px solid rgba(255,255,255,.07)');setImportant(cell,'border-radius','13px');setImportant(cell,'background','#0d1219');});}
     let anatomy=result.querySelector(':scope > .g5-summary-anatomy');if(!anatomy){anatomy=document.createElement('img');anatomy.className='g5-summary-anatomy';anatomy.alt='';anatomy.setAttribute('aria-hidden','true');anatomy.src='./05_assets/body-model-v6/male-front.svg';result.appendChild(anatomy);}show(anatomy,'block');setImportant(anatomy,'width','126px');setImportant(anatomy,'height','176px');setImportant(anatomy,'object-fit','cover');setImportant(anatomy,'object-position','50% 4%');setImportant(anatomy,'margin','16px auto 8px');setImportant(anatomy,'filter','drop-shadow(0 18px 24px rgba(0,0,0,.55))');
     const interpretation=result.querySelector('p');if(interpretation){show(interpretation,'block');setImportant(interpretation,'max-width','none');setImportant(interpretation,'margin','8px 0 0');setImportant(interpretation,'padding','13px');setImportant(interpretation,'border','1px solid rgba(255,255,255,.06)');setImportant(interpretation,'border-radius','13px');setImportant(interpretation,'background','#0d1219');setImportant(interpretation,'font-size','11px');setImportant(interpretation,'line-height','1.6');setImportant(interpretation,'color','#b4bbc6');}
     const pr=result.querySelector('.workout-result-pr');if(pr){setImportant(pr,'margin-top','9px');setImportant(pr,'font-size','10px');setImportant(pr,'color','#61dfb2');}
     return;
   }
   main.classList.remove('g5-workout-summary-mode');
   const media=main.querySelector('.g5-workout-media');if(media)media.classList.remove('g5-has-canonical-workout-visual');
   const live=main.querySelector('.workout-session-bar.is-live');if(live){const picker=main.querySelector('#wName')?.closest('.field');if(picker)hide(picker);hide(main.querySelector('#openWorkoutExerciseSearch'));}
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
       #main.g5-screen-today .g5-today-hero-copy,#main.g5-screen-today #garangTodayFlow>.g4-today-anatomy{display:none!important}
       #main.g5-screen-today .visual-today-hero,#main.g5-screen-today .today-decision-panel{display:none!important}
       #main.g5-screen-today #garangTodayFlow>.today-body-panel[data-garang-founder-anatomy="canonical"]{display:grid!important}
       #main.g5-screen-today .g5-today-workout-card>.gtf-action{position:relative!important;z-index:3!important}
       #main.g5-screen-today .g5-today-workout-card .g5-today-card-anatomy{grid-column:2!important;grid-row:1 / 3!important}
       #main.g5-screen-today [data-garang-planner-shortcut="1"][data-garang-planner-shortcut-host="founder"]{background:rgba(9,13,20,.58)!important;border:1px solid rgba(255,255,255,.06)!important;backdrop-filter:blur(10px)!important}
       #main.g5-screen-workout.g5-workout-summary-mode>.g5-founder-summary-shell{display:block!important}
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
   script.src='./06_features/ui/runtime/garang-founder-target-v5.js?v=5.0.8-founder-board-structure';
   script.defer=true;
   script.dataset.garangPresentationV4='1';
   script.dataset.garangFounderTargetV5='1';
   script.addEventListener('load',()=>{root.GarangFounderTargetV5?.schedule?.();installSafety();},{once:true});
   document.head.appendChild(script);
 }
 loadStyle();
 loadPresentation();
})(typeof window==='undefined'?globalThis:window);
