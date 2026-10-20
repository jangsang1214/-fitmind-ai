(function(root){
'use strict';
const build=Object.freeze({version:'0.11.0-beta.6',label:'0.11.0 BETA 6',channel:'COMMERCIAL HARDENING',buildId:'20261020-founder-rebuild-v6.1',schema:5});
root.GARANG_BUILD=build;
if(!root.document)return;
document.documentElement.dataset.garangVersion=build.version;
document.documentElement.dataset.garangChannel=build.channel;
function addStyle(href,key){if(document.querySelector(`link[data-garang-style="${key}"]`))return;const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset.garangStyle=key;if(key==='founder-v6')link.dataset.garangPresentationV4='1';document.head.appendChild(link);}
function loadStyles(){addStyle('./03_styles/runtime/garang-founder-target-v6.css?v=6.1.0-clean-rebuild','founder-v6');addStyle('./03_styles/runtime/garang-muscular-anatomy-v1.css?v=1.0.0','muscular-anatomy');addStyle('./03_styles/runtime/garang-founder-target-v6-refinement.css?v=6.1.0','founder-v6-refinement');}
function screen(){return String(document.getElementById('main')?.dataset?.garangScreen||'');}
function currentGender(){try{return String(root.GarangRepositories?.StateRepository?.read?.()?.profile?.gender||'male').toLowerCase()==='female'?'female':'male';}catch{return'male';}}
function show(node,display='block'){if(!node)return;node.hidden=false;node.removeAttribute('aria-hidden');node.style.setProperty('display',display,'important');node.style.setProperty('visibility','visible','important');}
function hide(node){node?.style?.setProperty?.('display','none','important');}
function canonicalizeWorkoutSession(){
 const main=document.getElementById('main');if(!main||screen()!=='workout')return;
 const bars=[...main.querySelectorAll('.workout-session-bar')];if(bars.length<2)return;
 const preferred=main.querySelector('.gws-panel[data-garang-workout-surface="exercise"] .workout-session-bar')||bars.find(bar=>bar.closest('.workout-execution-v2'))||bars.at(-1);
 bars.forEach(bar=>{if(bar===preferred){bar.removeAttribute('aria-hidden');return;}bar.dataset.garangDuplicateSession='1';bar.setAttribute('aria-hidden','true');bar.style.setProperty('display','none','important');bar.querySelectorAll('[id]').forEach(node=>{if(!node.dataset.garangDuplicateId)node.dataset.garangDuplicateId=node.id;node.removeAttribute('id');});});
}
function mountTodayAnatomy(main){
 const flow=main.querySelector('#garangTodayFlow');if(!flow)return;
 const panel=main.querySelector('.visual-today-hero .today-body-panel')||main.querySelector('.today-body-panel.g6-live-anatomy');
 if(panel){if(panel.parentElement!==flow)flow.appendChild(panel);panel.classList.add('g6-live-anatomy');show(panel,'grid');root.GarangTodayAnatomy?.schedule?.();}
 hide(flow.querySelector('.g4-today-anatomy'));
 const card=flow.querySelector('.g5-today-workout-card');if(card&&root.GarangMuscularAnatomyV1){let mini=card.querySelector(':scope > .g6-anatomy-mini');if(!mini){mini=document.createElement('div');mini.className='g6-anatomy-mini';card.appendChild(mini);}if(mini.dataset.rendered!=='1'){mini.dataset.rendered='1';mini.appendChild(root.GarangMuscularAnatomyV1.create('front',currentGender(),'upper'));}show(mini,'block');}
}
function mountBodyAnatomy(main){
 const pair=main.querySelector('.g4-body-anatomy-pair');if(!pair||!root.GarangMuscularAnatomyV1)return;
 pair.classList.add('g6-body-muscle-pair');if(pair.dataset.garangMuscular!=='1'){pair.dataset.garangMuscular='1';while(pair.firstChild)pair.firstChild.remove();pair.append(root.GarangMuscularAnatomyV1.create('front',currentGender(),'full'),root.GarangMuscularAnatomyV1.create('back',currentGender(),'full'));}show(pair,'grid');
 const tabs=main.querySelector('.g5-body-tabs');if(tabs&&!tabs.dataset.g6Bound){tabs.dataset.g6Bound='1';[...tabs.querySelectorAll('button')].forEach((button,index)=>button.addEventListener('click',()=>{[...tabs.querySelectorAll('button')].forEach(x=>x.classList.toggle('active',x===button));pair.dataset.view=['front','side','back'][index]||'front';}));}
}
function mountSummaryAnatomy(main){
 const result=main.querySelector('.workout-result-card'),grid=result?.querySelector('.workout-result-grid');if(!result||!grid||!root.GarangMuscularAnatomyV1)return;
 let holder=result.querySelector(':scope > .g6-summary-anatomy');if(!holder){holder=document.createElement('div');holder.className='g6-summary-anatomy';grid.insertAdjacentElement('afterend',holder);}if(holder.dataset.rendered!=='1'){holder.dataset.rendered='1';holder.appendChild(root.GarangMuscularAnatomyV1.create('front',currentGender(),'upper'));}show(holder,'block');hide(main.querySelector('.g5-summary-body'));
}
function focusWorkout(main){
 const live=!!main.querySelector('.workout-session-bar.is-live'),record=main.classList.contains('g5-record-list-mode');
 if(live&&!main.dataset.g6LiveFocused){main.dataset.g6LiveFocused='1';main.dataset.g6RecordFocused='';requestAnimationFrame(()=>{window.scrollTo(0,0);main.scrollTop=0;main.querySelector('.g5-workout-header')?.scrollIntoView?.({block:'start'});});}
 if(!live){delete main.dataset.g6LiveFocused;delete main.dataset.g6RecordFocused;}
 if(record){let tabs=main.querySelector(':scope > .g6-record-tabs');if(!tabs){tabs=document.createElement('div');tabs.className='g6-record-tabs';tabs.innerHTML='<span class="active">기록</span><span>분석</span><span>가이드</span>';const title=main.querySelector(':scope > .g5-workout-title');title?.insertAdjacentElement('afterend',tabs);}if(!main.dataset.g6RecordFocused){main.dataset.g6RecordFocused='1';requestAnimationFrame(()=>{window.scrollTo(0,0);main.scrollTop=0;tabs?.scrollIntoView?.({block:'start'});});}}
}
function refineVisualOwners(){
 const main=document.getElementById('main');if(!main)return;const name=screen();
 if(name==='today')mountTodayAnatomy(main);
 if(name==='workout'){focusWorkout(main);if(main.classList.contains('g5-workout-summary-mode'))mountSummaryAnatomy(main);}
 if(name==='body')mountBodyAnatomy(main);
}
function reconcile(){canonicalizeWorkoutSession();root.GarangFounderTargetV6?.schedule?.();refineVisualOwners();requestAnimationFrame(()=>{canonicalizeWorkoutSession();root.GarangFounderTargetV6?.schedule?.();refineVisualOwners();});setTimeout(()=>{canonicalizeWorkoutSession();refineVisualOwners();},40);setTimeout(()=>{canonicalizeWorkoutSession();refineVisualOwners();},140);}
function installCompatibility(){let timer=0;const sync=()=>{clearTimeout(timer);reconcile();timer=setTimeout(reconcile,24);};['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:workout-set-rows-rendered','garang:workout-session-started','garang:coach-mounted','garang:coach-message-rendered','pageshow'].forEach(name=>window.addEventListener(name,sync,{passive:true}));document.addEventListener('click',sync,true);new MutationObserver(sync).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});sync();}
function loadPresentation(){
 if(document.querySelector('script[data-garang-presentation-v4]'))return;
 const anatomy=document.createElement('script');anatomy.src='./06_features/ui/runtime/garang-muscular-anatomy-v1.js?v=1.0.0';anatomy.defer=true;anatomy.dataset.garangAnatomyComponent='1';
 anatomy.addEventListener('load',()=>{const script=document.createElement('script');script.src='./06_features/ui/runtime/garang-founder-target-v6.js?v=6.1.0-clean-rebuild';script.defer=true;script.dataset.garangPresentationV4='1';script.dataset.garangFounderTargetV6='1';script.addEventListener('load',installCompatibility,{once:true});document.head.appendChild(script);},{once:true});document.head.appendChild(anatomy);
}
loadStyles();loadPresentation();
})(typeof window==='undefined'?globalThis:window);
