/* GARANG Founder Target v5
   Founder-board-first presentation. The board image is reference only and is never loaded at runtime.
   Dynamic write/session owners stay canonical; this layer composes their visible presentation.
*/
(()=>{
'use strict';
if(window.GarangFounderTargetV5)return;
const VERSION='garang-presentation-v4.5.5-founder-target';
const main=()=>document.getElementById('main');
const app=()=>document.getElementById('appView');
const qs=(root,sel)=>root?.querySelector?.(sel)||null;
const qsa=(root,sel)=>[...(root?.querySelectorAll?.(sel)||[])];
const isNode=node=>node&&node.nodeType===1;
const screen=()=>String(main()?.dataset?.garangScreen||'').trim();
function move(parent,...nodes){nodes.flat().forEach(node=>{if(isNode(node)&&node!==parent&&node.parentElement!==parent)parent.appendChild(node);});}
function ensure(tag,cls,parent,before=null){let el=qs(parent,`:scope > .${cls}`);if(el)return el;el=document.createElement(tag);el.className=cls;if(before)parent.insertBefore(el,before);else parent.appendChild(el);return el;}
function imp(node,name,value){node?.style?.setProperty?.(name,value,'important');}
function reveal(node,display='block'){if(!isNode(node))return node;node.hidden=false;node.removeAttribute('aria-hidden');imp(node,'display',display);imp(node,'visibility','visible');return node;}
function hide(node){if(!isNode(node))return;imp(node,'display','none');}
function text(node){return String(node?.textContent||'').replace(/\s+/g,' ').trim();}
function esc(value){return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function state(){try{return window.GarangRepositories?.StateRepository?.read?.()||null;}catch{return null;}}
function gender(){return String(state()?.profile?.gender||'male').toLowerCase()==='female'?'female':'male';}
function latest(list){return Array.isArray(list)&&list.length?list[list.length-1]:null;}
function numberFrom(value){const match=String(value||'').match(/-?\d+(?:\.\d+)?/);return match?Number(match[0]):null;}
function dateLabel(){const d=new Date();return `${d.getMonth()+1}월 ${d.getDate()}일 (${['일','월','화','수','목','금','토'][d.getDay()]})`;}
function todayIso(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function mark(m,name){[...m.classList].filter(c=>/^g[45]-screen-/.test(c)).forEach(c=>m.classList.remove(c));m.classList.add('g5-screen',`g5-screen-${name}`);m.dataset.garangPresentation='v4';}
function chrome(){
  document.documentElement.dataset.garangPresentation='v4';document.body.classList.add('garang-founder-target-v5');
  const name=screen(),top=document.querySelector('.topbar'),menu=document.getElementById('menuBtn'),brand=top?.querySelector('.brand.mini'),actions=top?.querySelector('.top-actions'),settings=document.getElementById('settingsTopBtn');
  if(top){imp(top,'display',name==='today'?'grid':'none');imp(top,'grid-template-columns','44px minmax(0,1fr) 44px');imp(top,'align-items','center');imp(top,'min-height','56px');imp(top,'padding','7px 12px 6px');imp(top,'background','#05070a');imp(top,'border','0');}
  if(menu){imp(menu,'grid-column','1');imp(menu,'grid-row','1');imp(menu,'justify-self','start');imp(menu,'display','grid');}
  if(brand){imp(brand,'grid-column','2');imp(brand,'grid-row','1');imp(brand,'justify-self','center');imp(brand,'position','static');imp(brand,'left','auto');imp(brand,'transform','none');}
  if(actions){imp(actions,'grid-column','3');imp(actions,'grid-row','1');imp(actions,'display','flex');imp(actions,'justify-content','flex-end');imp(actions,'width','44px');}
  if(settings){imp(settings,'display','grid');imp(settings,'place-items','center');imp(settings,'width','40px');imp(settings,'height','40px');}
  ['syncBadge','planBadge','profileTopBtn','logoutBtn'].forEach(id=>hide(document.getElementById(id)));
  const nav=document.getElementById('bottomNav');if(nav)imp(nav,'display',name==='workout'?'none':'grid');
}
function ensureRuntimeStyle(){
  if(document.getElementById('garang-founder-target-v5-runtime-style'))return;
  const style=document.createElement('style');style.id='garang-founder-target-v5-runtime-style';style.textContent=`
  #main.g5-screen-today .g5-today-hero-copy{position:relative;min-height:205px;padding:28px 43% 18px 0}
  #main.g5-screen-today .g5-today-hero-copy h1{margin:0 0 10px;font-size:27px;line-height:1.08;letter-spacing:-.055em;color:#fff;font-weight:850}
  #main.g5-screen-today .g5-today-hero-copy p{margin:0;font-size:11px;line-height:1.55;color:#9ba4b2}
  #main.g5-screen-today .g5-today-workout-copy{display:grid;gap:7px;align-content:start;min-width:0}
  #main.g5-screen-today .g5-today-workout-copy>span{font-size:8px;color:#777fff;letter-spacing:.08em;font-weight:800}
  #main.g5-screen-today .g5-today-workout-copy strong{font-size:16px;color:#fff;line-height:1.2}
  #main.g5-screen-today .g5-today-workout-copy small{font-size:9px;color:#9099a7;line-height:1.45}
  #main.g5-screen-today .g5-today-status-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  #main.g5-screen-today .g5-status-meter{aspect-ratio:1;display:grid;place-items:center;text-align:center;border-radius:50%;background:radial-gradient(circle,#080c12 55%,transparent 56%),conic-gradient(#64dfb4 0 var(--g5-pct),#22303b var(--g5-pct) 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.025)}
  #main.g5-screen-today .g5-status-meter div{display:grid;gap:2px}.g5-status-meter b{font-size:19px;color:#fff}.g5-status-meter span{font-size:8px;color:#a4adba}.g5-status-meter small{font-size:7px;color:#5bd6a4}
  #main.g5-screen-today .g5-today-coach{display:grid;grid-template-columns:38px 1fr;gap:10px;align-items:center;padding:12px;border-radius:14px;background:#0b1016;border:1px solid rgba(255,255,255,.055)}
  #main.g5-screen-today .g5-today-coach i{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 50% 30%,#8a6c5e 0 18%,#252a32 19% 100%);font-style:normal;font-size:16px}.g5-today-coach strong{display:block;font-size:9px;margin-bottom:3px}.g5-today-coach p{margin:0;color:#a5adba;font-size:9px;line-height:1.45}
  #main.g5-screen-workout .g5-workout-tags{display:flex;gap:7px;margin:-2px 0 9px}.g5-workout-tags span{padding:5px 9px;border-radius:999px;background:#10151d;color:#a7afbb;font-size:8px;border:1px solid rgba(255,255,255,.055)}
  #main.g5-screen-workout .g5-live-meta{display:flex;justify-content:space-between;align-items:center;margin:0 0 8px;color:#88919f;font-size:9px}.g5-live-meta b{font-size:10px;color:#858aff}
  #main.g5-screen-workout.g5-record-list-mode .g5-workout-media,#main.g5-screen-workout.g5-record-list-mode .g5-set-progress,#main.g5-screen-workout.g5-record-list-mode .g5-live-meta{display:none!important}
  #main.g5-screen-workout .g5-exercise-tabs{display:none;grid-template-columns:repeat(3,1fr);border-bottom:1px solid rgba(255,255,255,.07);margin:0 0 14px}.g5-exercise-tabs button{min-height:42px;background:transparent;border:0;color:#76808f;font-size:10px}.g5-exercise-tabs button.active{color:#fff;border-bottom:2px solid #7478ff}
  #main.g5-screen-workout.g5-record-list-mode .g5-exercise-tabs{display:grid}.g5-record-list-mode #workoutSetDetails{display:grid!important;gap:9px!important}.g5-record-list-mode #workoutSetDetails .execution-set-row{display:grid!important;grid-template-columns:1fr auto!important;min-height:66px!important;padding:12px!important;border-radius:12px!important;background:#10151c!important;border:1px solid rgba(255,255,255,.055)!important}.g5-record-list-mode #workoutSetDetails .execution-set-row.current-set{grid-template-columns:1fr 1fr!important;border-color:#6f73ff!important}.g5-record-list-mode #workoutSetDetails .execution-set-row.completed{opacity:.82!important}.g5-record-list-mode #workoutSetDetails .execution-set-row.upcoming-set{opacity:.62!important}
  #main.g5-screen-workout .g5-record-memo{display:none;margin:12px 0;padding:12px;border-radius:12px;background:#0d1219;border:1px solid rgba(255,255,255,.055);font-size:9px;color:#9da6b4}.g5-record-list-mode .g5-record-memo{display:block}.g5-record-list-mode .g5-session-finish{display:block!important;width:100%;min-height:54px;margin-top:12px;border:0;border-radius:12px;background:linear-gradient(135deg,#777bff,#4f61f6);color:#fff;font-size:15px}
  body.garang-founder-target-v5>.g4-rest-portal .g5-rest-next-card span{font-size:8px;color:#7d8695}body.garang-founder-target-v5>.g4-rest-portal .g5-rest-next-card strong{font-size:13px;color:#f2f4f8}
  `;document.head.appendChild(style);
}
function actualTodayDecision(flow){const source=qs(flow,'.gtf-decision');return {title:text(qs(source,'h2'))||'오늘, 이 운동을 추천했어요.',reason:text(qs(source,'p'))||'최근 기록과 회복 상태를 반영해 오늘의 행동을 정리했습니다.'};}
function todayPlanTitle(){const s=state(),plan=(s?.planner||[]).find(item=>String(item?.date||'')===todayIso()&&String(item?.type||'').toLowerCase()==='workout');return String(plan?.title||'오늘의 추천 운동');}
function todayStatusValues(originalTracks){
  const s=state(),check=latest(s?.checkins)||latest(s?.dailyCheckins)||{},texts=qsa(originalTracks,':scope > *').map(text),nums=texts.map(numberFrom).filter(v=>v!==null);
  const energy=Number(check?.energy),sleep=Number(check?.sleep),stress=Number(check?.stress);
  const recovery=Number.isFinite(energy)&&energy>0?Math.round(Math.min(5,energy)/5*100):(nums[0]??null);
  const sleepValue=Number.isFinite(sleep)&&sleep>0?sleep:(nums[1]??null);
  const stressValue=Number.isFinite(stress)&&stress>=0?Math.round(Math.min(5,stress)/5*100):(nums[2]??null);
  return [{label:'회복도',value:recovery===null?'—':Math.round(recovery),unit:recovery===null?'':'',pct:recovery===null?52:Math.max(8,Math.min(100,recovery)),tone:'양호'},{label:'수면',value:sleepValue===null?'—':Number(sleepValue).toFixed(1),unit:sleepValue===null?'':'h',pct:sleepValue===null?58:Math.max(8,Math.min(100,Number(sleepValue)/9*100)),tone:'균형'},{label:'스트레스',value:stressValue===null?'—':Math.round(stressValue),unit:'',pct:stressValue===null?42:Math.max(8,100-Math.min(100,stressValue)),tone:'낮음'}];
}
function today(m){
  const flow=qs(m,'#garangTodayFlow');if(!flow)return false;const decisionData=actualTodayDecision(flow),originalTracks=qs(flow,'.gtf-track-visual')||qs(m,'.gtf-track-visual'),statusData=todayStatusValues(originalTracks),head=qs(m,':scope > .page-head');hide(head);
  reveal(flow,'block');['position','min-height','padding','border','border-radius','background','box-shadow','overflow'].forEach(()=>{});imp(flow,'position','relative');imp(flow,'min-height','0');imp(flow,'padding','0');imp(flow,'border','0');imp(flow,'border-radius','0');imp(flow,'background','transparent');imp(flow,'box-shadow','none');imp(flow,'overflow','visible');
  const shell=ensure('section','g4-today-shell',m,head?.nextSibling||m.firstChild);reveal(shell,'block');move(shell,flow);
  let date=qs(flow,':scope > .g5-today-date');if(!date){date=document.createElement('span');date.className='g5-today-date';flow.prepend(date);}date.textContent=dateLabel();reveal(date,'block');
  const copy=ensure('section','g5-today-hero-copy',flow,date.nextSibling);copy.innerHTML=`<h1>오늘, 이 운동을<br>추천했어요.</h1><p>${esc(decisionData.reason)}</p>`;reveal(copy,'block');
  let anatomy=qs(flow,':scope > .g4-today-anatomy');if(!anatomy){anatomy=document.createElement('img');anatomy.className='g4-today-anatomy';anatomy.alt='';anatomy.setAttribute('aria-hidden','true');anatomy.draggable=false;flow.appendChild(anatomy);}anatomy.src=`./05_assets/body-model-v6/${gender()}-front.svg`;reveal(anatomy,'block');
  const workout=ensure('section','g5-today-workout-card',flow);reveal(workout,'grid');let workoutCopy=qs(workout,':scope > .g5-today-workout-copy');if(!workoutCopy){workoutCopy=document.createElement('div');workoutCopy.className='g5-today-workout-copy';workout.prepend(workoutCopy);}const available=Number(state()?.onboarding?.availableMinutes)||45,goal=String(state()?.onboarding?.goal||'오늘 목표');workoutCopy.innerHTML=`<span>${esc(goal)}</span><strong>${esc(todayPlanTitle())}</strong><small>오늘 상태를 반영한 ${available}분 내외 추천</small>`;
  const canonicalAction=qs(flow,'.gtf-action')||qs(m,'.gtf-action');move(workout,canonicalAction);reveal(canonicalAction,'block');
  let cardAnatomy=qs(workout,':scope > .g5-today-card-anatomy');if(!cardAnatomy){cardAnatomy=document.createElement('img');cardAnatomy.className='g5-today-card-anatomy';cardAnatomy.alt='';cardAnatomy.setAttribute('aria-hidden','true');cardAnatomy.draggable=false;workout.appendChild(cardAnatomy);}cardAnatomy.src=`./05_assets/body-model-v6/${gender()}-front.svg`;reveal(cardAnatomy,'block');imp(cardAnatomy,'grid-column','2');imp(cardAnatomy,'grid-row','1 / 3');imp(cardAnatomy,'align-self','end');imp(cardAnatomy,'justify-self','center');imp(cardAnatomy,'width','102px');imp(cardAnatomy,'height','148px');imp(cardAnatomy,'object-fit','cover');imp(cardAnatomy,'object-position','50% 5%');imp(cardAnatomy,'pointer-events','none');
  const status=ensure('section','g5-today-status',flow);status.innerHTML=`<div class="g5-today-status-grid">${statusData.map(x=>`<div class="g5-status-meter" style="--g5-pct:${Math.round(x.pct)}%"><div><span>${x.label}</span><b>${x.value}${x.unit}</b><small>${x.tone}</small></div></div>`).join('')}</div>`;reveal(status,'block');
  const coach=ensure('section','g5-today-coach',flow);coach.innerHTML=`<i>◉</i><div><strong>GARANG 코치</strong><p>${esc(decisionData.reason)}</p></div>`;reveal(coach,'grid');
  const allowed=new Set([date,copy,anatomy,workout,status,coach]);[...flow.children].forEach(child=>{if(!allowed.has(child))hide(child);});
  qsa(m,'.visual-today-hero,.today-body-panel,.gtf-state,.gtf-context,.gtf-decision,.gtf-disclosure,.gtf-detail,.gpc-today-plan').forEach(hide);
  const support=ensure('section','g5-today-support',shell);hide(support);[...m.children].forEach(child=>{if(child!==head&&child!==shell)move(support,child);});
  return true;
}
function selectedExercise(m){return String(document.getElementById('wName')?.value||text(qs(m,'.workout-selected-name'))||'벤치프레스').trim();}
function currentSetLabel(m){const rows=qsa(m,'#workoutSetDetails [data-set-row],#workoutSetDetails .execution-set-row'),current=rows.find(row=>row.classList.contains('current-set'));return {index:current?rows.indexOf(current)+1:1,total:Math.max(1,rows.length||4),rows,current};}
function completedCount(m){return qsa(m,'#workoutSetDetails [data-set-row]').filter(row=>row.dataset.executionCompleted==='true').length;}
function hideLiveSetup(m,execution){
  const step=qs(m,'[data-gws-step]');hide(step?.parentElement);
  qsa(m,'.workout-visual-hero,.section-title,.exercise-visual-library,.one-rm-panel,.workout-recent-reuse,.gws-reuse,.workout-mini-stats,#workoutSessionFeedback,.execution-sets-field,.execution-duration-field,[data-workout-setup]').forEach(hide);
  const fields=qs(m,'.workout-fields');if(fields)hide(fields);
  const advanced=qs(m,'.workout-advanced-disclosure');hide(advanced);hide(qs(m,'.workout-advanced-tools'));hide(qs(m,'.workout-entry-actions'));
  reveal(qs(m,'#workoutSetDetails'),'block');reveal(execution,'block');
}
function styleRecordRows(m){const {rows}=currentSetLabel(m);rows.forEach(row=>{reveal(row,'grid');if(row.classList.contains('current-set')){imp(row,'grid-template-columns','1fr 1fr');}else{qsa(row,'input,select,.set-detail-toggle,.set-delete-button').forEach(hide);const previous=qs(row,'.execution-previous'),target=qs(row,'.execution-target');if(previous)reveal(previous,'block');if(target)reveal(target,'block');}});}
function decorateRest(rest,m){
  if(!rest)return;let card=qs(rest,':scope > .g5-rest-next-card');if(!card){card=document.createElement('section');card.className='g5-rest-next-card';rest.appendChild(card);}const set=currentSetLabel(m),row=set.current,exercise=selectedExercise(m),weight=qs(row,'[data-set-weight]')?.value||'',reps=qs(row,'[data-set-reps]')?.value||'';card.innerHTML=`<span>다음 세트</span><strong>${esc(exercise)} · ${esc(weight)} kg × ${esc(reps)}회</strong>`;reveal(card,'grid');imp(card,'width','100%');imp(card,'max-width','340px');imp(card,'margin','18px 0 0');imp(card,'padding','14px');imp(card,'border','1px solid rgba(255,255,255,.075)');imp(card,'border-radius','14px');imp(card,'background','#0b1016');imp(card,'gap','5px');
}
function summaryMode(m,result){
  if(!result)return false;m.classList.add('g5-workout-summary-mode');window.scrollTo?.(0,0);const heading=ensure('section','g5-summary-heading',m,m.firstChild);heading.innerHTML='<strong>운동 완료 🎉</strong><span>오늘의 결과와 다음 행동</span>';reveal(heading,'grid');imp(heading,'gap','4px');imp(heading,'margin','4px 0 12px');imp(heading.querySelector('strong'),'font-size','24px');imp(heading.querySelector('span'),'font-size','10px');imp(heading.querySelector('span'),'color','#858e9c');[...m.children].forEach(child=>{if(child!==heading&&!child.contains(result)&&child!==result)hide(child);});reveal(result,'block');imp(result,'margin','0');imp(result,'border','0');imp(result,'background','transparent');imp(result,'box-shadow','none');let img=qs(result,':scope > .g5-summary-anatomy');if(!img){img=document.createElement('img');img.className='g5-summary-anatomy';img.alt='';img.setAttribute('aria-hidden','true');result.appendChild(img);}img.src=`./05_assets/body-model-v6/${gender()}-front.svg`;reveal(img,'block');imp(img,'width','118px');imp(img,'height','150px');imp(img,'object-fit','cover');imp(img,'object-position','50% 7%');imp(img,'margin','14px auto 0');return true;
}
function workout(m){
  m.classList.add('g4-workout-shell');const result=qs(m,'.workout-result-card');if(result&&getComputedStyle(result).display!=='none')return summaryMode(m,result);m.classList.remove('g5-workout-summary-mode');
  hide(qs(m,':scope > .page-head'));const header=ensure('div','g5-workout-header',m,m.firstChild);reveal(header,'grid');if(!header.dataset.ready){header.dataset.ready='1';header.innerHTML='<button type="button" aria-label="뒤로">‹</button><b>운동 세션</b><button type="button" class="g5-workout-end">종료</button>';header.querySelector('.g5-workout-end')?.addEventListener('click',()=>document.getElementById('finishWorkoutSession')?.click());}
  const exerciseName=selectedExercise(m);let title=qs(m,':scope > .g5-workout-title');if(!title){title=document.createElement('h1');title.className='g5-workout-title';header.insertAdjacentElement('afterend',title);}title.textContent=exerciseName;reveal(title,'block');
  let tags=qs(m,':scope > .g5-workout-tags');if(!tags){tags=document.createElement('div');tags.className='g5-workout-tags';title.insertAdjacentElement('afterend',tags);}const target=text(qs(m,'#muscleTargetLabel'))||'근력',implement=/바벨/.test(exerciseName)?'바벨':/덤벨/.test(exerciseName)?'덤벨':'근력';tags.innerHTML=`<span>${esc(target)}</span><span>${implement}</span>`;
  const session=qs(m,'.workout-session-bar');const live=!!session?.classList.contains('is-live');if(!live)return true;
  hide(session);hideLiveSetup(m,qs(m,'.workout-execution-v2'));
  const execution=qs(m,'.workout-execution-v2'),host=execution?.parentElement||m;let meta=qs(host,':scope > .g5-live-meta');if(!meta){meta=document.createElement('div');meta.className='g5-live-meta';host.insertBefore(meta,execution||host.firstChild);}const elapsed=text(document.getElementById('workoutExecutionElapsed'))||'00:00';meta.innerHTML=`<span>LIVE · 기록 중</span><b>${esc(elapsed)}</b>`;reveal(meta,'flex');
  let media=qs(host,':scope > .g5-workout-media');if(!media){media=document.createElement('section');media.className='g5-workout-media';host.insertBefore(media,execution||host.firstChild);}reveal(media,'block');
  let progress=qs(host,':scope > .g5-set-progress');if(!progress){progress=document.createElement('div');progress.className='g5-set-progress';host.insertBefore(progress,execution||null);}const set=currentSetLabel(m);progress.innerHTML=`<span>←</span><b>세트 <strong>${set.index} / ${set.total}</strong></b><span>→</span>`;reveal(progress,'flex');
  const completed=completedCount(m),recordMode=completed>=2&&!document.getElementById('workoutExecutionRest')?.classList.contains('active');m.classList.toggle('g5-record-list-mode',recordMode);
  let tabs=qs(m,':scope > .g5-exercise-tabs');if(!tabs){tabs=document.createElement('div');tabs.className='g5-exercise-tabs';tabs.innerHTML='<button class="active">기록</button><button>분석</button><button>가이드</button>';tags.insertAdjacentElement('afterend',tabs);}reveal(tabs,recordMode?'grid':'none');
  if(recordMode){styleRecordRows(m);let memo=qs(host,':scope > .g5-record-memo');if(!memo){memo=document.createElement('div');memo.className='g5-record-memo';host.appendChild(memo);}memo.textContent='운동 메모 · 오늘 컨디션과 다음 세션에 남길 내용을 기록할 수 있습니다.';reveal(memo,'block');let finish=qs(host,':scope > .g5-session-finish');if(!finish){finish=document.createElement('button');finish.type='button';finish.className='g5-session-finish';finish.textContent='세션 완료';finish.addEventListener('click',()=>document.getElementById('finishWorkoutSession')?.click());host.appendChild(finish);}reveal(finish,'block');}else{const finish=qs(host,':scope > .g5-session-finish'),memo=qs(host,':scope > .g5-record-memo');hide(finish);hide(memo);}
  let next=qs(host,':scope > .g5-next-set');if(!next){next=document.createElement('div');next.className='g5-next-set';host.appendChild(next);}const nextRow=qs(m,'#workoutSetDetails .execution-set-row.current-set + .execution-set-row');next.textContent=nextRow?`다음 세트 · ${text(nextRow).slice(0,80)}`:'다음 세트 · 현재 목표를 유지하세요';reveal(next,recordMode?'none':'block');
  const rest=document.getElementById('workoutExecutionRest');if(rest&&app()&&!app().hidden&&screen()==='workout'){rest.classList.add('g4-rest-portal');if(rest.parentElement!==document.body)document.body.appendChild(rest);if(!rest.hidden)decorateRest(rest,m);}
  if(m.dataset.g5LiveTop!=='1'){m.dataset.g5LiveTop='1';requestAnimationFrame(()=>window.scrollTo?.(0,0));}
  return true;
}
function nutrition(m){const scan=qs(m,'.meal-scan-card');if(!scan)return true;const head=qs(m,':scope > .page-head'),shell=ensure('section','g4-nutrition-shell',m,head?.nextSibling||m.firstChild);move(shell,scan);return true;}
function ensureBodyPair(hero){const anatomy=qs(hero,'.body-hero-anatomy');if(!anatomy)return false;let pair=qs(anatomy,':scope > .g4-body-anatomy-pair');if(!pair){pair=document.createElement('div');pair.className='g4-body-anatomy-pair';for(const side of ['front','back']){const img=document.createElement('img');img.src=`./05_assets/body-model-v6/${gender()}-${side}.svg`;img.alt='';img.setAttribute('aria-hidden','true');img.draggable=false;pair.appendChild(img);}anatomy.appendChild(pair);}[...anatomy.children].forEach(child=>{if(child!==pair)hide(child);});reveal(pair,'grid');imp(pair,'grid-template-columns','1fr 1fr');imp(pair,'gap','6px');qsa(pair,'img').forEach(img=>{imp(img,'width','100%');imp(img,'height','auto');});return true;}
function body(m){const hero=qs(m,'.body-hero');if(!hero)return true;const head=qs(m,':scope > .page-head'),shell=ensure('section','g4-body-shell',m,head?.nextSibling||m.firstChild);move(shell,hero,qs(m,'.body-trend-card'));ensureBodyPair(hero);const metrics=qs(hero,'.body-hero-metrics');if(metrics)[...metrics.children].forEach((child,index)=>imp(child,'display',index<3?'grid':'none'));return true;}
function coach(m){const shell=qs(m,'.garang-coach-v2')||qs(m,'.coach-app-shell');if(shell)shell.classList.add('g4-coach-shell');return true;}
function cleanupRest(){const rest=document.getElementById('workoutExecutionRest');if(!rest||screen()==='workout')return;rest.classList.remove('g4-rest-portal');}
function apply(){ensureRuntimeStyle();const m=main(),name=screen();if(!m||!name)return false;mark(m,name);chrome();cleanupRest();if(name==='today')return today(m);if(name==='workout')return workout(m);if(name==='nutrition')return nutrition(m);if(name==='body')return body(m);if(name==='coach')return coach(m);return true;}
let queued=false,timer=0;function schedule(delay=0){clearTimeout(timer);timer=setTimeout(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply();});},delay);}
for(const event of ['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:state-hydrated','garang:workout-session-started','garang:workout-set-rows-rendered','pageshow'])window.addEventListener(event,()=>schedule(20));
document.addEventListener('click',event=>{if(event.target?.closest?.('[data-execution-set-complete],#skipWorkoutRest,#finishWorkoutSession,#startWorkoutSession,.g5-session-finish')){schedule(60);setTimeout(()=>schedule(0),220);}},true);
document.addEventListener('DOMContentLoaded',()=>schedule(0),{once:true});schedule(0);
const api=Object.freeze({version:VERSION,apply,schedule});window.GarangFounderTargetV5=api;window.GarangPresentationV4=api;
})();
