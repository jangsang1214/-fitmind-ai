/* GARANG Founder Target v6
   Clean presentation rebuild from the canonical GARANG runtime.
   Founder reference imagery is never loaded at runtime. Canonical state/action owners are moved, never cloned.
*/
(()=>{
'use strict';
if(window.GarangFounderTargetV6)return;
const VERSION='garang-presentation-v4.6.0-founder-rebuild';
const qs=(root,sel)=>root?.querySelector?.(sel)||null;
const qsa=(root,sel)=>[...(root?.querySelectorAll?.(sel)||[])];
const main=()=>document.getElementById('main');
const screen=()=>String(main()?.dataset?.garangScreen||'').trim();
const isNode=node=>node&&node.nodeType===1;
function imp(node,key,value){node?.style?.setProperty?.(key,value,'important');}
function show(node,display='block'){if(!isNode(node))return node;node.hidden=false;node.removeAttribute('aria-hidden');imp(node,'display',display);imp(node,'visibility','visible');return node;}
function hide(node){if(isNode(node))imp(node,'display','none');}
function move(parent,...nodes){nodes.flat().forEach(node=>{if(isNode(node)&&node!==parent&&node.parentElement!==parent)parent.appendChild(node);});}
function ensure(tag,cls,parent,before=null){let node=qs(parent,`:scope > .${cls}`);if(node)return node;node=document.createElement(tag);node.className=cls;if(before)parent.insertBefore(node,before);else parent.appendChild(node);return node;}
function text(node){return String(node?.textContent||'').replace(/\s+/g,' ').trim();}
function esc(value){return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function readState(){try{return window.GarangRepositories?.StateRepository?.read?.()||null;}catch{return null;}}
function gender(){return String(readState()?.profile?.gender||'male').toLowerCase()==='female'?'female':'male';}
function dateLabel(){const d=new Date();return `${d.getMonth()+1}월 ${d.getDate()}일 (${['일','월','화','수','목','금','토'][d.getDay()]})`;}
function isoToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function mark(m,name){[...m.classList].filter(c=>/^g[456]-screen-/.test(c)).forEach(c=>m.classList.remove(c));m.classList.add('g5-screen','g6-screen',`g5-screen-${name}`,`g6-screen-${name}`);m.dataset.garangPresentation='v4';}
function chrome(){
 const name=screen(),top=document.querySelector('.topbar'),nav=document.getElementById('bottomNav');
 document.documentElement.dataset.garangPresentation='v4';document.body.classList.add('garang-founder-rebuild-v6');document.body.classList.remove('garang-founder-target-v5');
 if(top){imp(top,'display',name==='today'?'grid':'none');}
 const workoutActive=name==='workout'&&(!!document.querySelector('.workout-session-bar.is-live')||!!document.querySelector('#workoutExecutionRest:not([hidden])')||main()?.classList.contains('g5-workout-summary-mode'));
 if(nav)imp(nav,'display',workoutActive?'none':'grid');
 ['syncBadge','planBadge','profileTopBtn','logoutBtn'].forEach(id=>hide(document.getElementById(id)));
}
function latest(list){return Array.isArray(list)&&list.length?list[list.length-1]:null;}
function todayPlanTitle(){const s=readState(),item=(s?.planner||[]).find(x=>String(x?.date||'')===isoToday()&&String(x?.type||'').toLowerCase()==='workout');return String(item?.title||'상체 근력 강화');}
function today(m){
 mark(m,'today');const flow=qs(m,'#garangTodayFlow');if(!flow)return false;const head=qs(m,':scope > .page-head');hide(head);
 let shell=qs(m,':scope > .g4-today-shell');if(!shell){shell=document.createElement('section');shell.className='g4-today-shell';m.insertBefore(shell,m.firstChild);}move(shell,flow);show(shell,'block');show(flow,'block');
 let date=qs(flow,':scope > .g5-today-date');if(!date){date=document.createElement('span');date.className='g5-today-date';flow.prepend(date);}date.textContent=dateLabel();show(date,'block');
 let anatomy=qs(flow,':scope > .g4-today-anatomy');if(!anatomy){anatomy=document.createElement('img');anatomy.className='g4-today-anatomy';anatomy.alt='';anatomy.setAttribute('aria-hidden','true');anatomy.draggable=false;flow.appendChild(anatomy);}anatomy.src=`./05_assets/body-model-v6/${gender()}-front.svg`;show(anatomy,'block');
 const decision=qs(flow,'.gtf-decision');if(decision){if(decision.parentElement!==flow)flow.insertBefore(decision,anatomy);show(decision,'block');}
 let workout=qs(flow,':scope > .g5-today-workout-card');if(!workout){workout=document.createElement('section');workout.className='g5-today-workout-card';flow.appendChild(workout);}let label=qs(workout,':scope > .g5-today-card-copy');if(!label){label=document.createElement('div');label.className='g5-today-card-copy';workout.prepend(label);}label.innerHTML=`<span>오늘 추천</span><strong>${esc(todayPlanTitle())}</strong><small>가슴 · 삼두 · 어깨 · 약 45분</small>`;
 const action=qs(flow,'.gtf-action')||qs(m,'.gtf-action');if(action){move(workout,action);show(action,'block');}
 let mini=qs(workout,':scope > .g5-today-card-anatomy');if(!mini){mini=document.createElement('img');mini.className='g5-today-card-anatomy';mini.alt='';mini.setAttribute('aria-hidden','true');mini.draggable=false;workout.appendChild(mini);}mini.src=`./05_assets/body-model-v6/${gender()}-front.svg`;show(mini,'block');
 const shortcut=qs(m,'[data-garang-planner-shortcut="1"]');if(shortcut){move(workout,shortcut);shortcut.dataset.garangPlannerShortcutHost='founder';show(shortcut,'grid');}
 let status=qs(flow,':scope > .g5-today-status');if(!status){status=document.createElement('section');status.className='g5-today-status';flow.appendChild(status);}let statusTitle=qs(status,':scope > .g5-section-title');if(!statusTitle){statusTitle=document.createElement('h3');statusTitle.className='g5-section-title';status.prepend(statusTitle);}statusTitle.textContent='오늘의 상태';const tracks=qs(flow,'.gtf-track-visual')||qs(m,'.gtf-track-visual');if(tracks){move(status,tracks);show(tracks,'grid');}
 let coach=qs(flow,':scope > .g5-today-coach');if(!coach){coach=document.createElement('section');coach.className='g5-today-coach';flow.appendChild(coach);}const s=readState(),last=latest(s?.aiChat),coachText=String(last?.text||'오늘은 상태가 안정적입니다. 계획한 운동에 집중하세요.');coach.innerHTML=`<div class="g5-coach-avatar" aria-hidden="true">G</div><div><strong>GARANG 코치</strong><p>${esc(coachText)}</p></div>`;show(coach,'grid');
 const checkin=qs(m,'[data-garang-bottom-checkin="1"]');if(checkin){move(flow,checkin);show(checkin,'grid');}
 hide(qs(m,'.visual-today-hero'));hide(qs(flow,'.gpc-today-plan'));qsa(flow,'.gtf-state,.gtf-detail,.gtf-disclosure,.gtf-checkin-access').forEach(hide);
 return true;
}
function currentExerciseName(m){return String(document.getElementById('wName')?.value||text(qs(m,'.workout-selected-name'))||'벤치프레스').replace(/^바벨\s+/,'');}
function ensureWorkoutChrome(m){
 let header=qs(m,':scope > .g5-workout-header');if(!header){header=document.createElement('div');header.className='g5-workout-header';header.innerHTML='<button type="button" class="g5-back" aria-label="뒤로">‹</button><b>운동 세션</b><button type="button" class="g5-end">종료</button>';m.prepend(header);header.querySelector('.g5-back').onclick=()=>window.GarangRouter?.navigate?.('today',{source:'founder-v6'});header.querySelector('.g5-end').onclick=()=>document.getElementById('finishWorkoutSession')?.click();}
 let title=qs(m,':scope > .g5-workout-title');if(!title){title=document.createElement('h1');title.className='g5-workout-title';header.insertAdjacentElement('afterend',title);}title.textContent=currentExerciseName(m);
 let tags=qs(m,':scope > .g5-workout-tags');if(!tags){tags=document.createElement('div');tags.className='g5-workout-tags';title.insertAdjacentElement('afterend',tags);}tags.innerHTML='<span>가슴</span><span>바벨</span><span>기본운동</span>';
 let media=qs(m,':scope > .g5-workout-media');if(!media){media=document.createElement('section');media.className='g5-workout-media';tags.insertAdjacentElement('afterend',media);media.innerHTML='<img src="./05_assets/workout-benchpress-v1.svg" alt="벤치프레스 운동 일러스트"><div class="g5-media-shade"></div>';}
 return media;
}
function workout(m){
 mark(m,'workout');hide(qs(m,':scope > .page-head'));m.classList.add('g4-workout-shell');const media=ensureWorkoutChrome(m);const session=qs(m,'.workout-session-bar');if(session){const tags=qs(m,':scope > .g5-workout-tags');if(tags?.nextElementSibling!==session)tags?.insertAdjacentElement('afterend',session);show(session,'grid');}
 const oldVisual=qs(m,'.workout-visual-hero');if(oldVisual)hide(oldVisual);qsa(m,'.exercise-visual-library,.section-title').forEach(node=>{if(node.closest('.workout-builder-v2'))return;hide(node);});
 const rows=qsa(m,'#workoutSetDetails .execution-set-row'),completed=rows.filter(r=>r.dataset.executionCompleted==='true').length,current=rows.find(r=>r.classList.contains('current-set'));const live=!!session?.classList.contains('is-live');
 let progress=qs(m,':scope > .g5-set-progress');if(!progress){progress=document.createElement('div');progress.className='g5-set-progress';media.insertAdjacentElement('afterend',progress);}const currentIndex=Math.max(1,rows.indexOf(current)+1);progress.innerHTML=`<span>←</span><b>세트 <strong>${currentIndex}</strong> / ${Math.max(rows.length,1)}</b><span>→</span>`;show(progress,'flex');
 let meta=qs(m,':scope > .g5-live-meta');if(!meta){meta=document.createElement('div');meta.className='g5-live-meta';progress.insertAdjacentElement('afterend',meta);}meta.innerHTML='<span>이전 세트와 오늘 목표를 비교해 기록하세요</span><b>LIVE</b>';show(meta,'flex');
 const builder=qs(m,'.workout-execution-v2')||qs(m,'.workout-builder-v2');if(builder)show(builder,'block');
 m.classList.toggle('g5-record-list-mode',live&&completed>=2&&!qs(m,'.workout-result-card'));const finish=document.getElementById('finishWorkoutSession');if(finish)finish.classList.add('g5-session-finish');
 const rest=document.getElementById('workoutExecutionRest');if(rest){if(rest.parentElement!==document.body)document.body.appendChild(rest);rest.classList.add('g4-rest-portal');let next=qs(rest,':scope > .g5-rest-next-card');if(!next){next=document.createElement('div');next.className='g5-rest-next-card';rest.appendChild(next);}const nextRow=rows.find(r=>r.dataset.executionCompleted!=='true');const w=nextRow?.querySelector('[data-set-weight]')?.value||document.getElementById('wWeight')?.value||'75',r=nextRow?.querySelector('[data-set-reps]')?.value||document.getElementById('wReps')?.value||'10';next.innerHTML=`<span>다음 세트</span><strong>${esc(currentExerciseName(m))}</strong><small>${esc(w)} kg × ${esc(r)}회</small>`;}
 const result=qs(m,'.workout-result-card');m.classList.toggle('g5-workout-summary-mode',!!result);if(result){let summary=qs(m,':scope > .g5-summary-shell');if(!summary){summary=document.createElement('section');summary.className='g5-summary-shell';m.prepend(summary);}move(summary,result);show(summary,'block');let body=qs(summary,':scope > .g5-summary-body');if(!body){body=document.createElement('img');body.className='g5-summary-body';body.alt='';body.setAttribute('aria-hidden','true');body.src=`./05_assets/body-model-v6/${gender()}-front.svg`;summary.appendChild(body);}show(body,'block');}
 return true;
}
function nutrition(m){
 mark(m,'nutrition');hide(qs(m,':scope > .page-head'));let shell=qs(m,':scope > .g4-nutrition-shell');if(!shell){shell=document.createElement('section');shell.className='g4-nutrition-shell';m.prepend(shell);}let header=qs(shell,':scope > .g5-screen-header');if(!header){header=document.createElement('header');header.className='g5-screen-header';header.innerHTML='<span>‹</span><b>식단 기록</b><i></i>';shell.appendChild(header);}const meal=qs(m,'.meal-scan-card');if(meal){move(shell,meal);show(meal,'block');}
 const detail=qs(m,'.nutrition-quick-summary');if(detail){move(shell,detail);show(detail,'block');}qsa(m,'.adaptive-nutrition-card,.recent-meals-card').forEach(node=>move(shell,node));
 const s=readState(),todayMeals=(s?.meals||[]).filter(x=>String(x?.date||'')===isoToday()),kcal=todayMeals.reduce((a,x)=>a+(Number(x?.kcal)||0),0),target=Number(s?.profile?.calorieTarget)||2100;let summary=qs(shell,':scope > .g5-nutrition-summary');if(!summary){summary=document.createElement('section');summary.className='g5-nutrition-summary';shell.appendChild(summary);}summary.innerHTML=`<div><span>오늘의 식단</span><strong>${Math.round(kcal).toLocaleString()} <small>/ ${Math.round(target).toLocaleString()} kcal</small></strong></div><div class="g5-kcal-ring" style="--g5-kcal:${Math.min(100,Math.round(kcal/Math.max(1,target)*100))}%"><b>${todayMeals.length}</b><span>끼</span></div>`;show(summary,'grid');return true;
}
function body(m){
 mark(m,'body');hide(qs(m,':scope > .page-head'));let shell=qs(m,':scope > .g4-body-shell');if(!shell){shell=document.createElement('section');shell.className='g4-body-shell';m.prepend(shell);}let header=qs(shell,':scope > .g5-body-tabs');if(!header){header=document.createElement('div');header.className='g5-body-tabs';header.innerHTML='<button class="active">FRONT</button><button>SIDE</button><button>BACK</button>';shell.appendChild(header);}const hero=qs(m,'.body-hero');if(hero){move(shell,hero);show(hero,'grid');const anatomy=qs(hero,'.body-hero-anatomy');if(anatomy){let pair=qs(anatomy,':scope > .g4-body-anatomy-pair');if(!pair){pair=document.createElement('div');pair.className='g4-body-anatomy-pair';anatomy.appendChild(pair);pair.innerHTML=`<img src="./05_assets/body-model-v6/${gender()}-front.svg" alt="Front anatomy"><img src="./05_assets/body-model-v6/${gender()}-back.svg" alt="Back anatomy">`;}qsa(anatomy,':scope > *').forEach(node=>{if(node!==pair)hide(node);});show(pair,'grid');}qsa(hero,'.body-hero-metrics > *').forEach((node,index)=>index<3?show(node,'block'):hide(node));}
 ['.body-trend-card','.body-entry-drawer','.compact-history'].forEach(sel=>{const node=qs(m,sel);if(node)move(shell,node);});return true;
}
function coach(m){
 mark(m,'coach');hide(qs(m,':scope > .page-head'));let shell=qs(m,':scope > .g5-coach-page');if(!shell){shell=document.createElement('section');shell.className='g5-coach-page';m.prepend(shell);}let head=qs(shell,':scope > .g5-coach-head');if(!head){head=document.createElement('header');head.className='g5-coach-head';head.innerHTML='<div class="g5-coach-avatar">G</div><div><b>GARANG AI 코치</b><span>온라인 · 개인화 분석 기반</span></div><button type="button">⋮</button>';shell.appendChild(head);}const owner=qs(m,'.garang-coach-v2')||qs(m,'.coach-app-shell');if(owner){owner.classList.add('g4-coach-shell');move(shell,owner);show(owner,'block');}return true;
}
function monthCalendar(records){const now=new Date(),y=now.getFullYear(),mo=now.getMonth(),first=new Date(y,mo,1),days=new Date(y,mo+1,0).getDate(),lead=first.getDay(),recordSet=new Set((records||[]).map(x=>String(x?.date||'')));let cells='';for(let i=0;i<lead;i++)cells+='<span></span>';for(let d=1;d<=days;d++){const iso=`${y}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,today=iso===isoToday();cells+=`<button class="${today?'today':''} ${recordSet.has(iso)?'has-record':''}">${d}</button>`;}return `<div class="g5-calendar-week"><b>일</b><b>월</b><b>화</b><b>수</b><b>목</b><b>금</b><b>토</b></div><div class="g5-calendar-grid">${cells}</div>`;}
function history(m){
 mark(m,'progress');hide(qs(m,':scope > .page-head'));let board=qs(m,':scope > .g5-history-board');if(!board){board=document.createElement('section');board.className='g5-history-board';m.prepend(board);}const s=readState(),workouts=s?.workouts||[],monthCount=workouts.filter(x=>String(x?.date||'').slice(0,7)===isoToday().slice(0,7)).length,totalHours=Math.round(workouts.reduce((a,x)=>a+(Number(x?.duration)||0),0)/60);board.innerHTML=`<div class="g5-history-tabs"><button class="active">운동</button><button>식단</button><button>신체</button><button>인사이트</button></div><div class="g5-history-month"><button>‹</button><b>${new Date().getFullYear()}년 ${new Date().getMonth()+1}월</b><button>›</button></div>${monthCalendar(workouts)}<section class="g5-month-summary"><span>이번 달 요약</span><div><b>${monthCount}<small>회</small></b><b>${totalHours}<small>시간</small></b><b>+12<small>% 활동</small></b></div></section>`;show(board,'block');const owner=document.getElementById('garangAccumulationOverview');if(owner){move(board,owner);show(owner,'block');owner.classList.add('g5-history-owner');}qsa(m,':scope > :not(.g5-history-board)').forEach(node=>{if(node.id!=='garangAccumulationOverview')hide(node);});return true;
}
function settings(m){
 mark(m,'settings');hide(qs(m,':scope > .page-head'));let shell=qs(m,':scope > .g5-settings-shell');if(!shell){shell=document.createElement('section');shell.className='g5-settings-shell';m.prepend(shell);}const s=readState(),profile=s?.profile||{};let profileCard=qs(shell,':scope > .g5-settings-profile');if(!profileCard){profileCard=document.createElement('section');profileCard.className='g5-settings-profile';shell.appendChild(profileCard);}profileCard.innerHTML=`<div class="g5-profile-avatar">${esc(String(profile?.name||'G').slice(0,1))}</div><div><strong>${esc(profile?.name||'GARANG 사용자')}</strong><span>@garang_user</span></div>`;const stack=qs(m,'.settings-stack');if(stack){move(shell,stack);show(stack,'grid');}return true;
}
function apply(){const m=main();if(!m)return;chrome();const name=screen();if(name==='today')today(m);else if(name==='workout')workout(m);else if(name==='nutrition')nutrition(m);else if(name==='body')body(m);else if(name==='coach')coach(m);else if(name==='progress')history(m);else if(name==='settings')settings(m);chrome();}
let raf=0;function schedule(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;apply();});}
['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:state-hydrated','garang:workout-session-started','garang:workout-set-rows-rendered','garang:coach-mounted','garang:coach-message-rendered','pageshow'].forEach(name=>window.addEventListener(name,schedule,{passive:true}));
document.addEventListener('click',()=>setTimeout(schedule,0),true);new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
window.GarangFounderTargetV6=Object.freeze({version:VERSION,schedule});window.GarangPresentationV4=window.GarangFounderTargetV6;schedule();
})();