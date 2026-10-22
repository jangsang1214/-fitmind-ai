/* GARANG Founder reference-lock v9 — binding showcase composition without cloning canonical owners. */
(()=>{
'use strict';
if(window.GarangFounderV8ExactBoard?.version==='9.0.3')return;
const $=(s,r=document)=>r?.querySelector?.(s)||null;
const $$=(s,r=document)=>[...(r?.querySelectorAll?.(s)||[])];
let queued=false,navObserver=null,mainObserver=null,observedMain=null;
function screen(){return String($('#main')?.dataset?.garangScreen||'');}
function readState(){try{return window.GarangRepositories?.StateRepository?.read?.()||null}catch{return null}}
function anatomy(side='front',focus='full'){
 const api=window.GarangAnatomyExactV2;if(!api?.create)return null;
 const gender=String(readState()?.profile?.gender||'male').toLowerCase()==='female'?'female':'male';
 return api.create(side,gender,focus);
}
function imp(node,property,value){if(!node)return;if(node.style.getPropertyValue(property)===value&&node.style.getPropertyPriority(property)==='important')return;node.style.setProperty(property,value,'important')}
function show(node,display){if(!node)return;node.hidden=false;node.removeAttribute('aria-hidden');node.style.removeProperty('visibility');node.style.removeProperty('pointer-events');if(display)imp(node,'display',display)}
function ensureStyle(){
 if($('#garang-founder-showcase-v9-runtime'))return;
 const style=document.createElement('style');style.id='garang-founder-showcase-v9-runtime';style.textContent=`
 html.garang-v8 body #main[data-garang-screen="today"] #garangTodayFlow.g8-canonical-today-owner,
 html.garang-v8 body #main[data-garang-screen="today"]>.g8-today{min-height:0!important;height:auto!important;max-height:none!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;background-image:none!important;box-shadow:none!important;overflow:hidden!important}
 html.garang-v8 body #main[data-garang-screen="today"]:before,html.garang-v8 body #main[data-garang-screen="today"]:after,
 html.garang-v8 body #main[data-garang-screen="today"] #garangTodayFlow.g8-canonical-today-owner:before,
 html.garang-v8 body #main[data-garang-screen="today"] #garangTodayFlow.g8-canonical-today-owner:after,
 html.garang-v8 body #main[data-garang-screen="today"]>.g8-today:before,html.garang-v8 body #main[data-garang-screen="today"]>.g8-today:after{content:none!important;display:none!important;background:none!important;background-image:none!important;box-shadow:none!important}
 html.garang-v8 body #main[data-garang-screen="today"] .g8-action-card [data-garang-direct-workout-start="1"],
 html.garang-v8 body #main[data-garang-screen="today"] .g8-action-card .gtdw-start{background:#111!important;background-image:none!important;border-color:#111!important;color:#fff!important;box-shadow:none!important}
 html.garang-v8 body #main[data-garang-screen="today"] .g9-showcase-build [data-garang-planner-shortcut="1"]:before,
 html.garang-v8 body #main[data-garang-screen="today"] .g9-showcase-build [data-garang-planner-shortcut="1"]:after{content:none!important;display:none!important}
 html.garang-v8 body #main[data-garang-screen="today"] .g8-state-card{overflow:hidden!important;isolation:isolate!important}
 html.garang-v8 body #main[data-garang-screen="today"] .g8-state-card .gtf-track-visual{overflow:hidden!important;isolation:isolate!important}
 html.garang-v8 body #main[data-garang-screen="today"] .g8-state-card .gtf-track{position:relative!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;min-width:0!important;min-height:58px!important;padding:7px 4px!important;border:0!important;border-radius:12px!important;background:#f7f5f1!important;overflow:hidden!important;color:#111!important}
 html.garang-v8 body #main[data-garang-screen="today"] .g8-state-card .gtf-track-icon,
 html.garang-v8 body #main[data-garang-screen="today"] .g8-state-card .gtf-track-line,
 html.garang-v8 body #main[data-garang-screen="today"] .g8-state-card .gtf-track-badge{display:none!important}
 html.garang-v8 body #main[data-garang-screen="today"] .g8-state-card .gtf-track-copy{display:grid!important;justify-items:center!important;gap:2px!important;width:100%!important;min-width:0!important}
 html.garang-v8 body #main[data-garang-screen="today"] .g8-state-card .gtf-track-copy>span{font-size:9px!important;line-height:1.2!important;color:#77736d!important;text-align:center!important;white-space:nowrap!important}
 html.garang-v8 body #main[data-garang-screen="today"] .g8-state-card .gtf-track-copy>strong{font-size:11px!important;line-height:1.2!important;color:#111!important;text-align:center!important;white-space:nowrap!important}
 html.garang-v8 body #main[data-garang-screen="workout"] .g8-workout-header #finishWorkoutSession.g8-finish-top{background:transparent!important;background-image:none!important;border:0!important;color:#ef263d!important;box-shadow:none!important}
 html.garang-v8 body #bottomNav.bottom-nav>button[data-garang-primary-nav="1"]>span::after{content:none!important;display:none!important;font-size:0!important}
 html[lang="ko"].garang-v8 body #bottomNav.bottom-nav>button[data-page]>b{font-size:0!important;line-height:1!important}
 html[lang="ko"].garang-v8 body #bottomNav.bottom-nav>button[data-page="today"]>b:after{content:"오늘"!important}
 html[lang="ko"].garang-v8 body #bottomNav.bottom-nav>button[data-page="log"]>b:after{content:"기록"!important}
 html[lang="ko"].garang-v8 body #bottomNav.bottom-nav>button[data-page="coach"]>b:after{content:"코치"!important}
 html[lang="ko"].garang-v8 body #bottomNav.bottom-nav>button[data-page="progress"]>b:after{content:"누적"!important}
 html[lang="ko"].garang-v8 body #bottomNav.bottom-nav>button[data-page]>b:after{display:block!important;font:750 10px/1.05 "Noto Sans KR",Inter,system-ui,sans-serif!important;letter-spacing:-.03em!important;color:inherit!important}
 `;document.head.appendChild(style);
}
function lockNav(){
 const nav=$('#bottomNav');if(!nav)return;
 imp(nav,'backdrop-filter','none');imp(nav,'-webkit-backdrop-filter','none');
 const ko=document.documentElement.lang!=='en';
 const labels=ko?['오늘','기록','코치','누적']:['Today','Record','Coach','Progress'];
 $$(':scope > button[data-garang-primary-nav="1"]',nav).slice(0,4).forEach((button,i)=>{
  const b=$('b',button);if(b&&b.textContent!==labels[i])b.textContent=labels[i];
  [...button.childNodes].forEach(node=>{if(node.nodeType===Node.TEXT_NODE&&/[A-Za-z가-힣]/.test(node.nodeValue||''))node.nodeValue=''});
  const icon=$(':scope > span:first-child',button);if(icon&&!icon.querySelector('svg,img')&&icon.textContent.trim())icon.textContent='';
  button.dataset.garangReferenceLabel=labels[i];
 });
 if(!navObserver){navObserver=new MutationObserver(()=>schedule());navObserver.observe(nav,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden','style','class','aria-hidden']})}
}
function neutralizeTodayOwner(flow){
 if(!flow)return;
 show(flow,'block');
 [['width','100%'],['min-width','0'],['min-height','0'],['height','auto'],['max-height','none'],['margin','0'],['padding','0'],['border','0'],['border-radius','0'],['background','transparent'],['background-image','none'],['box-shadow','none'],['overflow','hidden'],['filter','none']].forEach(([p,v])=>imp(flow,p,v));
}
function ensureBuild(shell,flow){
 if(!shell)return null;
 let build=$('.g8-secondary-action',shell);
 const planner=$('[data-garang-planner-shortcut="1"]',shell)||$('[data-garang-planner-shortcut="1"]',flow||document);
 if(!build&&planner){
  build=document.createElement('section');build.className='g8-secondary-action g9-showcase-build';build.dataset.garangReferenceBuild='1';
  build.innerHTML='<span class="g8-kicker">BUILD</span><strong>오늘 계획</strong><p>오늘 계획을 조정하고 다음 행동을 준비합니다.</p>';
  const state=$('.g8-state-card',shell);if(state)shell.insertBefore(build,state);else shell.appendChild(build);
 }
 if(build){
  build.classList.add('g9-showcase-build');
  if(planner&&planner.parentElement!==build)build.appendChild(planner);
  if(planner){
   planner.textContent=document.documentElement.lang==='en'?'Open plan':'계획 열기';planner.setAttribute('aria-label',planner.textContent);planner.title=planner.textContent;
   [['position','absolute'],['left','14px'],['right','14px'],['bottom','10px'],['top','auto'],['width','auto'],['min-width','0'],['height','38px'],['min-height','38px'],['margin','0'],['padding','0 14px'],['border','0'],['border-radius','10px'],['background','#f1efeb'],['color','#111'],['font-size','12px'],['font-weight','750'],['box-shadow','none']].forEach(([p,v])=>imp(planner,p,v));
  }
 }
 return build;
}
function remountTodayOwners(shell,flow){
 if(!shell)return;
 const hero=$('.g8-decision-card',shell);
 const decision=$('.gtf-decision',shell)||$('.gtf-decision',flow||document);
 if(hero&&decision&&!hero.contains(decision)){hero.replaceChildren(decision)}
 if(decision){show(decision,'block');imp(decision,'visibility','visible');imp(decision,'opacity','1')}
 const stateCard=$('.g8-state-card',shell);
 const tracks=$('.gtf-track-visual',shell)||$('.gtf-track-visual',flow||document);
 if(stateCard&&tracks&&!stateCard.contains(tracks)){stateCard.appendChild(tracks)}
 if(tracks){show(tracks,'grid');imp(tracks,'visibility','visible');imp(tracks,'opacity','1')}
}
function today(){
 const shell=$('.g8-today');if(!shell)return;
 const flow=$('#garangTodayFlow');neutralizeTodayOwner(flow);
 $$('.g8-today-anatomy',shell).forEach(n=>n.remove());
 $('.g8-decision-card',shell)?.classList.add('g9-showcase-hero');
 $('.g8-action-card',shell)?.classList.add('g9-showcase-train');
 remountTodayOwners(shell,flow);
 const build=ensureBuild(shell,flow);build?.classList.add('g9-showcase-build');
 $('.g8-state-card',shell)?.classList.add('g9-showcase-state');
 const start=$('.g8-action-card [data-garang-direct-workout-start="1"],.g8-action-card .gtdw-start',shell);
 if(start){imp(start,'background','#111');imp(start,'background-image','none');imp(start,'border-color','#111');imp(start,'color','#fff');imp(start,'box-shadow','none');}
 shell.dataset.garangReferenceLock='showcase-v9';
}
function observeMain(){
 const m=$('#main');if(!m||m===observedMain)return;
 mainObserver?.disconnect();observedMain=m;
 mainObserver=new MutationObserver(records=>{
  if(screen()!=='today')return;
  const changed=records.some(record=>record.type==='childList'&&([...record.addedNodes,...record.removedNodes].some(node=>node?.nodeType===1)));
  if(changed)schedule();
 });
 mainObserver.observe(m,{childList:true,subtree:true});
}
function body(){
 const host=$('.g8-body .g8-body-visual');if(!host||!window.GarangAnatomyExactV2)return;
 const active=($('.g8-body-tabs button.active')?.textContent||'FRONT').trim().toLowerCase();
 const side=['front','side','back'].includes(active)?active:'front';
 let pair=$(':scope > .g8-body-pair',host);if(!pair){pair=document.createElement('div');pair.className='g8-body-pair';host.prepend(pair)}
 const signature=`${side}:${window.GarangAnatomyExactV2.version}`;
 if(pair.dataset.signature!==signature){
  const companion=side==='back'?'front':'back';
  const primary=document.createElement('div');primary.className='g8-body-model g8-body-model-primary';primary.appendChild(anatomy(side,'full'));
  const secondary=document.createElement('div');secondary.className='g8-body-model g8-body-model-secondary';secondary.appendChild(anatomy(companion,'full'));
  pair.replaceChildren(primary,secondary);pair.dataset.signature=signature;
 }
 $$(':scope > img',host).forEach(n=>n.remove());
 const legacy=$('.g8-body-hit-layer',host);if(legacy){legacy.style.display='none';legacy.setAttribute('aria-hidden','true')}
 host.dataset.visibleAnatomy='exact-v2';
}
function lockCurrentSet(shell){
 const row=$('#workoutSetDetails .execution-set-row.current-set',shell);if(!row)return;
 row.classList.add('g9-reference-current-set');
 const previous=$('.execution-previous',row),target=$('.execution-target',row),weight=$('.execution-weight-field',row),reps=$('.execution-reps-field',row),complete=$('[data-execution-set-complete]',row),index=$('.execution-set-index',row);
 imp(row,'display','grid');imp(row,'grid-template-columns','minmax(0,1fr) minmax(0,1fr)');imp(row,'grid-template-areas','none');imp(row,'column-gap','9px');imp(row,'row-gap','7px');imp(row,'width','100%');imp(row,'max-width','100%');imp(row,'min-width','0');imp(row,'overflow','hidden');imp(row,'box-sizing','border-box');imp(row,'padding','11px 10px 10px');
 if(index)imp(index,'display','none');
 [[previous,'1','1'],[target,'2','1'],[weight,'1','2'],[reps,'2','2']].forEach(([node,col,r])=>{if(!node)return;imp(node,'grid-area','auto');imp(node,'grid-column',col);imp(node,'grid-row',r);imp(node,'min-width','0');imp(node,'max-width','100%');imp(node,'width','100%');imp(node,'box-sizing','border-box')});
 [weight,reps].forEach(field=>{if(!field)return;show(field,'block');const input=$('input',field);if(!input)return;imp(input,'width','100%');imp(input,'max-width','100%');imp(input,'min-width','0');imp(input,'height','54px');imp(input,'box-sizing','border-box')});
 if(complete){show(complete,'grid');imp(complete,'grid-area','auto');imp(complete,'grid-column','1 / -1');imp(complete,'grid-row','3');imp(complete,'justify-self','stretch');imp(complete,'width','100%');imp(complete,'max-width','100%');imp(complete,'min-width','0');imp(complete,'height','50px');imp(complete,'min-height','50px');imp(complete,'margin','0');imp(complete,'box-sizing','border-box');imp(complete,'background','#ef263d');imp(complete,'color','#fff');complete.setAttribute('aria-label','세트 완료')}
}
function workout(){
 const main=$('#main');if(!main)return;
 const shell=$('.g8-workout',main);if(!shell)return;
 shell.dataset.garangReferenceLock='showcase-v9';
 $('.g8-exercise-visual',shell)?.classList.add('g9-workout-visual');
 const finish=$('#finishWorkoutSession.g8-finish-top',shell);if(finish){imp(finish,'background','transparent');imp(finish,'background-image','none');imp(finish,'border','0');imp(finish,'color','#ef263d');imp(finish,'box-shadow','none')}
 lockCurrentSet(shell);
}
function rest(){
 const host=$('#workoutExecutionRest');if(!host||host.hidden||!host.classList.contains('active'))return;
 const row=$('#workoutSetDetails .execution-set-row.current-set')||$('#workoutSetDetails .execution-set-row:not(.completed)');
 let card=$(':scope > .g8-rest-next-card',host);
 if(!row){card?.remove();return;}
 if(!card){card=document.createElement('section');card.className='g8-rest-next-card';host.appendChild(card)}
 const previous=($('.execution-previous',row)?.textContent||'').trim();
 const target=($('.execution-target',row)?.textContent||'').trim();
 const weight=$('[data-set-weight]',row)?.value||$('input[type="number"]',row)?.value||'—';
 const reps=$('[data-set-reps]',row)?.value||$$('input[type="number"]',row)[1]?.value||'—';
 card.innerHTML=`<span>다음 세트</span><strong>${weight} kg × ${reps}회</strong><small>${target||previous||'현재 계획을 이어갑니다.'}</small>`;
}
function summary(){const shell=$('.g8-summary');if(!shell)return;$$(':scope > .g8-summary-anatomy',shell).forEach(n=>n.remove());shell.dataset.garangReferenceLock='showcase-v9';}
function reconcile(){
 ensureStyle();observeMain();lockNav();document.documentElement.dataset.garangVisualAuthority='founder-showcase-v9';
 const s=screen();if(s==='today')today();if(s==='body')body();if(s==='workout'){workout();rest();if($('#main')?.classList.contains('g8-summary-mode'))summary();}
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;reconcile();setTimeout(reconcile,80)})}
['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:state-hydrated','garang:workout-session-started','garang:workout-session-ended','garang:workout-set-rows-rendered','pageshow'].forEach(n=>window.addEventListener(n,schedule,{passive:true}));
document.addEventListener('click',()=>queueMicrotask(schedule),true);
window.GarangFounderV8ExactBoard=Object.freeze({schedule,reconcile,version:'9.0.3'});schedule();
})();
