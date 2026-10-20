(function(root){
'use strict';
const build=Object.freeze({version:'0.11.0-beta.6',label:'0.11.0 BETA 6',channel:'COMMERCIAL HARDENING',buildId:'20261020-founder-rebuild-v6.2.2',schema:5});
root.GARANG_BUILD=build;
if(!root.document)return;
document.documentElement.dataset.garangVersion=build.version;
document.documentElement.dataset.garangChannel=build.channel;
function addStyle(href,key){if(document.querySelector(`link[data-garang-style="${key}"]`))return;const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset.garangStyle=key;if(key==='founder-v6')link.dataset.garangPresentationV4='1';document.head.appendChild(link);}
function loadStyles(){addStyle('./03_styles/runtime/garang-founder-target-v6.css?v=6.2.2-clean-rebuild','founder-v6');addStyle('./03_styles/runtime/garang-muscular-anatomy-v1.css?v=1.0.0','muscular-anatomy');addStyle('./03_styles/runtime/garang-founder-target-v6-refinement.css?v=6.2.2','founder-v6-refinement');}
function screen(){return String(document.getElementById('main')?.dataset?.garangScreen||'');}
function currentGender(){try{return String(root.GarangRepositories?.StateRepository?.read?.()?.profile?.gender||'male').toLowerCase()==='female'?'female':'male';}catch{return'male';}}
function show(node,display='block'){if(!node)return;node.hidden=false;node.removeAttribute('aria-hidden');node.style.setProperty('display',display,'important');node.style.setProperty('visibility','visible','important');}
function hide(node){node?.style?.setProperty?.('display','none','important');}
function cleanText(value){return String(value||'').replace(/\s+/g,' ').trim();}
function muscularFigure(side='front',focus='upper'){const node=root.GarangMuscularAnatomyV1?.create?.(side,currentGender(),focus);if(node){node.classList.add('g3-body-model','garang-muscular-anatomy');node.dataset.garangAnatomyModel='muscular-v1';node.dataset.side=side;}return node;}
function canonicalizeWorkoutSession(){
 const main=document.getElementById('main');if(!main||screen()!=='workout')return;
 const bars=[...main.querySelectorAll('.workout-session-bar')];if(bars.length<2)return;
 const preferred=main.querySelector('.gws-panel[data-garang-workout-surface="exercise"] .workout-session-bar')||bars.find(bar=>bar.closest('.workout-execution-v2'))||bars.at(-1);
 bars.forEach(bar=>{if(bar===preferred){bar.removeAttribute('aria-hidden');return;}bar.dataset.garangDuplicateSession='1';bar.setAttribute('aria-hidden','true');bar.style.setProperty('display','none','important');bar.querySelectorAll('[id]').forEach(node=>{if(!node.dataset.garangDuplicateId)node.dataset.garangDuplicateId=node.id;node.removeAttribute('id');});});
}
function mountTodayAnatomy(main){
 const flow=main.querySelector('#garangTodayFlow');if(!flow)return;
 const panel=main.querySelector('.visual-today-hero .today-body-panel')||main.querySelector('.today-body-panel.g6-live-anatomy');
 if(panel){if(panel.parentElement!==flow)flow.appendChild(panel);panel.classList.add('g6-live-anatomy');show(panel,'grid');}
 hide(flow.querySelector('.g4-today-anatomy'));
 const card=flow.querySelector('.g5-today-workout-card');if(card&&root.GarangMuscularAnatomyV1){let mini=card.querySelector(':scope > .g6-anatomy-mini');if(!mini){mini=document.createElement('div');mini.className='g6-anatomy-mini';card.appendChild(mini);}if(mini.dataset.rendered!=='1'){mini.dataset.rendered='1';const figure=muscularFigure('front','upper');if(figure)mini.appendChild(figure);}show(mini,'block');}
}
function mountBodyAnatomy(main){
 const pair=main.querySelector('.g4-body-anatomy-pair');if(!pair||!root.GarangMuscularAnatomyV1)return;
 pair.classList.add('g6-body-muscle-pair');if(pair.dataset.garangMuscular!=='1'){pair.dataset.garangMuscular='1';while(pair.firstChild)pair.firstChild.remove();const front=muscularFigure('front','full'),back=muscularFigure('back','full');if(front&&back)pair.append(front,back);}show(pair,'grid');
 const tabs=main.querySelector('.g5-body-tabs');if(tabs&&!tabs.dataset.g6Bound){tabs.dataset.g6Bound='1';[...tabs.querySelectorAll('button')].forEach((button,index)=>button.addEventListener('click',()=>{[...tabs.querySelectorAll('button')].forEach(x=>x.classList.toggle('active',x===button));pair.dataset.view=['front','side','back'][index]||'front';}));}
}
function mountSummaryAnatomy(main){
 const result=main.querySelector('.workout-result-card'),grid=result?.querySelector('.workout-result-grid');if(!result||!grid||!root.GarangMuscularAnatomyV1)return;
 let holder=result.querySelector(':scope > .g6-summary-anatomy');if(!holder){holder=document.createElement('div');holder.className='g6-summary-anatomy';grid.insertAdjacentElement('afterend',holder);}if(holder.dataset.rendered!=='1'){holder.dataset.rendered='1';const figure=muscularFigure('front','upper');if(figure)holder.appendChild(figure);}show(holder,'block');hide(main.querySelector('.g5-summary-body'));
}
function mountSetContext(main){
 const row=main.querySelector('#workoutSetDetails .execution-set-row.current-set'),progress=main.querySelector(':scope > .g5-set-progress');if(!row||!progress)return;
 let context=main.querySelector(':scope > .g6-set-context');if(!context){context=document.createElement('section');context.className='g6-set-context';progress.insertAdjacentElement('afterend',context);}
 const previous=cleanText(row.querySelector('.execution-previous')?.textContent)||'—',target=cleanText(row.querySelector('.execution-target')?.textContent)||'—';context.innerHTML=`<div><span>이전 세트</span><strong>${previous}</strong></div><div class="target"><span>오늘 목표</span><strong>${target}</strong></div>`;show(context,'grid');
}
function mountFinishOwner(main){
 const details=main.querySelector('#workoutSetDetails'),finish=document.getElementById('finishWorkoutSession');if(!details||!finish)return;
 let host=main.querySelector('.g6-record-finish-host');if(!host){host=document.createElement('div');host.className='g6-record-finish-host';details.insertAdjacentElement('afterend',host);}
 if(finish.parentElement!==host)host.appendChild(finish);
 finish.classList.add('g5-session-finish');show(host,'block');show(finish,'grid');finish.disabled=false;
}
function focusWorkout(main){
 const live=!!main.querySelector('.workout-session-bar.is-live'),record=main.classList.contains('g5-record-list-mode');
 if(live){mountSetContext(main);if(!main.dataset.g6LiveFocused){main.dataset.g6LiveFocused='1';main.dataset.g6RecordFocused='';requestAnimationFrame(()=>{window.scrollTo(0,0);main.scrollTop=0;main.querySelector('.g5-workout-header')?.scrollIntoView?.({block:'start'});});}}
 if(!live){delete main.dataset.g6LiveFocused;delete main.dataset.g6RecordFocused;hide(main.querySelector(':scope > .g6-set-context'));}
 if(record){
  let tabs=main.querySelector(':scope > .g6-record-tabs');if(!tabs){tabs=document.createElement('div');tabs.className='g6-record-tabs';tabs.innerHTML='<span class="active">기록</span><span>분석</span><span>가이드</span>';const title=main.querySelector(':scope > .g5-workout-title');title?.insertAdjacentElement('afterend',tabs);}
  mountFinishOwner(main);
  if(!main.dataset.g6RecordFocused){main.dataset.g6RecordFocused='1';requestAnimationFrame(()=>{window.scrollTo(0,0);main.scrollTop=0;tabs?.scrollIntoView?.({block:'start'});});}
 }
}
function refineVisualOwners(){const main=document.getElementById('main');if(!main)return;const name=screen();if(name==='today')mountTodayAnatomy(main);if(name==='workout'){focusWorkout(main);if(main.classList.contains('g5-workout-summary-mode'))mountSummaryAnatomy(main);}if(name==='body')mountBodyAnatomy(main);}
function reconcile(){canonicalizeWorkoutSession();root.GarangFounderTargetV6?.schedule?.();refineVisualOwners();requestAnimationFrame(()=>{canonicalizeWorkoutSession();refineVisualOwners();});setTimeout(()=>{canonicalizeWorkoutSession();refineVisualOwners();},70);}
function installCompatibility(){
 let queued=false,timer=0;const sync=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;clearTimeout(timer);reconcile();timer=setTimeout(reconcile,32);});};
 ['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:workout-set-rows-rendered','garang:workout-session-started','garang:coach-mounted','garang:coach-message-rendered','pageshow'].forEach(name=>window.addEventListener(name,sync,{passive:true}));
 document.addEventListener('click',()=>setTimeout(sync,0),true);
 new MutationObserver(sync).observe(document.body,{subtree:true,childList:true});
 sync();
}
function loadPresentation(){if(document.querySelector('script[data-garang-presentation-v4]'))return;const anatomy=document.createElement('script');anatomy.src='./06_features/ui/runtime/garang-muscular-anatomy-v1.js?v=1.0.0';anatomy.defer=true;anatomy.dataset.garangAnatomyComponent='1';anatomy.addEventListener('load',()=>{const script=document.createElement('script');script.src='./06_features/ui/runtime/garang-founder-target-v6.js?v=6.2.2-clean-rebuild';script.defer=true;script.dataset.garangPresentationV4='1';script.dataset.garangFounderTargetV6='1';script.addEventListener('load',installCompatibility,{once:true});document.head.appendChild(script);},{once:true});document.head.appendChild(anatomy);}
loadStyles();loadPresentation();
})(typeof window==='undefined'?globalThis:window);
