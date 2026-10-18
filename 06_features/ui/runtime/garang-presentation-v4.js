/* GARANG Presentation v4
   Structural adapter only. Moves canonical nodes into stable visual composition without cloning state/action owners.
*/
(() => {
'use strict';
if (window.GarangPresentationV4) return;
const VERSION='garang-presentation-v4.0.4';
const main=()=>document.getElementById('main');
const app=()=>document.getElementById('appView');
const qs=(root,sel)=>root?.querySelector?.(sel)||null;
const isNode=node=>node&&node.nodeType===1;
const screen=()=>String(main()?.dataset?.garangScreen||'').trim();
function ensure(tag,cls,parent,before=null){
  let el=qs(parent,':scope > .'+cls);
  if(el)return el;
  el=document.createElement(tag);el.className=cls;
  if(before)parent.insertBefore(el,before);else parent.appendChild(el);
  return el;
}
function move(parent,...nodes){nodes.flat().forEach(node=>{if(isNode(node)&&node!==parent&&node.parentElement!==parent)parent.appendChild(node);});}
function important(el,name,value){el?.style?.setProperty?.(name,value,'important');}
function markScreen(m,name){
  [...m.classList].filter(c=>c.startsWith('g4-screen-')).forEach(c=>m.classList.remove(c));
  m.classList.add('g4-screen','g4-screen-'+name);
  m.dataset.garangPresentation='v4';
}
function chrome(){
  document.documentElement.dataset.garangPresentation='v4';
  document.body.classList.add('garang-presentation-v4');
}
function directChildren(m,deny=[]){
  const blocked=new Set(deny.filter(Boolean));
  return [...m.children].filter(node=>!blocked.has(node)&&!node.classList.contains('g4-preserve-outside'));
}
function readState(){try{return window.GarangRepositories?.StateRepository?.read?.()||null;}catch{return null;}}
function readHistory(domain){try{return window.GarangRepositories?.HistoryRepository?.read?.(domain)||[];}catch{return [];}}
function inferGender(root){
  const node=qs(root,'[data-gender],[data-garang-gender]');
  const value=String(node?.dataset?.gender||node?.dataset?.garangGender||'').toLowerCase();
  if(value==='female')return 'female';
  if(/WOMEN|여성/.test(String(root?.textContent||'')))return 'female';
  return 'male';
}
function ensureTodayPresentationAnatomy(flow,visual){
  let img=qs(flow,':scope > .g4-today-anatomy');
  const gender=inferGender(visual||flow);
  if(!img){
    img=document.createElement('img');img.className='g4-today-anatomy';img.alt='';img.setAttribute('aria-hidden','true');img.draggable=false;img.loading='eager';img.decoding='async';flow.appendChild(img);
  }
  img.src=`./05_assets/body-model-v6/${gender}-front.svg`;
  important(img,'position','absolute');important(img,'right','-12px');important(img,'top','20px');important(img,'width','48%');important(img,'height','224px');important(img,'object-fit','contain');important(img,'object-position','center top');important(img,'opacity','.86');important(img,'z-index','0');important(img,'pointer-events','none');important(img,'filter','drop-shadow(0 24px 30px rgba(0,0,0,.58)) saturate(.88) contrast(1.06)');
  important(img,'-webkit-mask-image','linear-gradient(to bottom,#000 0%,#000 76%,transparent 100%)');important(img,'mask-image','linear-gradient(to bottom,#000 0%,#000 76%,transparent 100%)');
  const title=qs(flow,'.gtf-decision h2'),copy=qs(flow,'.gtf-decision p'),context=qs(flow,'.gtf-context');
  important(title,'max-width','58%');important(copy,'max-width','58%');important(context,'max-width','60%');
}
function today(m){
  const head=qs(m,':scope > .page-head');
  const flow=qs(m,'#garangTodayFlow');
  if(!flow)return false;
  const visual=qs(m,'.visual-today-hero');
  const shell=ensure('section','g4-today-shell',m,head?.nextSibling||m.firstChild);
  move(shell,flow);
  if(visual){visual.classList.add('g4-today-visual');move(shell,visual);}
  ensureTodayPresentationAnatomy(flow,visual);
  const support=ensure('section','g4-today-support',shell);
  for(const child of directChildren(m,[head,shell]))move(support,child);
  return true;
}
function workout(m){
  m.classList.add('g4-workout-shell');
  const session=qs(m,'.workout-session-bar');if(session)session.classList.add('g4-live-session');
  const hero=qs(m,'.workout-visual-hero');if(hero)hero.classList.add('g4-exercise-visual');
  const execution=qs(m,'.workout-execution-v2');if(execution)execution.classList.add('g4-execution');
  const tabs=qs(m,'.gws-tabs');if(tabs)tabs.classList.add('g4-workout-tabs');
  const overview=qs(m,'.gws-panel[data-garang-workout-surface="overview"]');if(overview)overview.classList.add('g4-workout-overview');
  const exercise=qs(m,'.gws-panel[data-garang-workout-surface="exercise"]');if(exercise)exercise.classList.add('g4-workout-exercise');
  const draft=qs(m,'#workoutDraftArea');if(draft)draft.classList.add('g4-workout-draft');
  const rest=document.getElementById('workoutExecutionRest');
  if(rest&&app()&&!app().hidden&&screen()==='workout'){
    rest.classList.add('g4-rest-portal');
    if(rest.parentElement!==document.body)document.body.appendChild(rest);
  }
  return true;
}
function nutrition(m){
  const head=qs(m,':scope > .page-head');
  const scan=qs(m,'.meal-scan-card');
  if(!scan)return false;
  const shell=ensure('section','g4-nutrition-shell',m,head?.nextSibling||m.firstChild);
  move(shell,scan);
  const support=ensure('section','g4-nutrition-support',shell);
  for(const child of directChildren(m,[head,shell]))move(support,child);
  return true;
}
function ensureBodyPresentationAnatomy(hero){
  const anatomy=qs(hero,'.body-hero-anatomy');
  if(!anatomy)return false;
  let pair=qs(anatomy,':scope > .g4-body-anatomy-pair');
  const gender=inferGender(anatomy);
  if(!pair){
    pair=document.createElement('div');pair.className='muscle-map-wrap g4-body-anatomy-pair';pair.dataset.garangPresentationAnatomy='v4';
    const map=document.createElement('div');map.className='muscle-map anatomical-pro';map.dataset.gender=gender;map.dataset.muscle='full';
    for(const side of ['front','back']){
      const view=document.createElement('div');view.className='body-view';
      const caption=document.createElement('span');caption.textContent=`${side.toUpperCase()} · ${gender==='female'?'WOMEN':'MEN'}`;
      const img=document.createElement('img');img.src=`./05_assets/body-model-v6/${gender}-${side}.svg`;img.alt=`${gender==='female'?'여성':'남성'} ${side==='front'?'전면':'후면'} 근육 해부 모델`;img.loading='eager';img.decoding='async';img.draggable=false;
      view.append(caption,img);map.appendChild(view);
    }
    pair.appendChild(map);anatomy.appendChild(pair);
  }
  [...anatomy.children].forEach(child=>{
    if(child===pair)return;
    child.hidden=true;child.setAttribute('aria-hidden','true');child.dataset.garangPresentationSuperseded='v4';important(child,'display','none');
  });
  important(pair,'display','flex');important(pair,'width','100%');important(pair,'min-height','420px');

  const visual=qs(hero,'.body-hero-visual'),metrics=qs(hero,'.body-hero-metrics');
  const latest=visual?[...visual.children].find(child=>child!==anatomy):null;
  if(latest&&metrics){latest.classList.add('g4-body-weight-metric');metrics.prepend(latest);}
  if(metrics){
    metrics.classList.add('g4-body-metrics');important(metrics,'grid-template-columns','repeat(3,minmax(0,1fr))');important(metrics,'gap','7px');
    [...metrics.children].forEach((child,index)=>{child.hidden=index>=3;important(child,'display',index<3?'grid':'none');if(index<3){important(child,'min-height','68px');important(child,'place-items','center');important(child,'text-align','center');}});
  }
  if(latest){
    const eyebrow=qs(latest,'.eyebrow'),small=qs(latest,'small'),strong=qs(latest,'strong');
    if(eyebrow)eyebrow.textContent='체중';if(small)small.hidden=true;
    important(latest,'padding','10px 6px');important(latest,'background','rgba(15,20,29,.94)');important(latest,'border','1px solid rgba(255,255,255,.07)');important(latest,'border-radius','14px');important(strong,'font-size','18px');important(strong,'line-height','1.2');
  }
  return true;
}
function body(m){
  const head=qs(m,':scope > .page-head');
  const hero=qs(m,'.body-hero');
  if(!hero)return false;
  const shell=ensure('section','g4-body-shell',m,head?.nextSibling||m.firstChild);
  move(shell,hero,qs(m,'.body-trend-card'));
  ensureBodyPresentationAnatomy(hero);
  for(const child of directChildren(m,[head,shell]))move(shell,child);
  return true;
}
function coach(m){
  const shell=qs(m,'.garang-coach-v2')||qs(m,'.coach-app-shell');
  if(!shell)return false;
  shell.classList.add('g4-coach-shell');
  return true;
}
function recordDate(record){return String(record?.date||record?.completedAt||record?.createdAt||'').slice(0,10);}
function historyLabel(domain){return ({workouts:'운동',meals:'식단',body:'신체',runs:'러닝'})[domain]||domain;}
function historyRecordLine(domain,record){
  if(domain==='workouts')return `${record?.name||'운동'} · ${record?.sets||record?.setDetails?.length||0}세트`;
  if(domain==='meals')return `${record?.name||'식사'}${record?.kcal?` · ${Math.round(Number(record.kcal)||0)} kcal`:''}`;
  if(domain==='body')return `체중 ${record?.weight??'—'}kg · 체지방 ${record?.fatPercent??'—'}%`;
  if(domain==='runs')return `러닝 ${Number(record?.distance||0).toFixed(1)}km${record?.duration?` · ${Math.round(Number(record.duration)||0)}분`:''}`;
  return '기록';
}
function buildHistoryModel(domain,year,month){
  const all=readHistory(domain),monthKey=`${year}-${String(month+1).padStart(2,'0')}`;
  const monthRecords=all.filter(record=>recordDate(record).startsWith(monthKey));
  const byDay=new Map();
  for(const record of monthRecords){const date=recordDate(record);if(!date)continue;if(!byDay.has(date))byDay.set(date,[]);byDay.get(date).push(record);}
  return {all,monthRecords,byDay};
}
function renderHistoryBoard(board){
  const now=new Date(),year=Number(board.dataset.year||now.getFullYear()),month=Number(board.dataset.month??now.getMonth()),domain=board.dataset.domain||'workouts';
  const model=buildHistoryModel(domain,year,month),days=new Date(year,month+1,0).getDate(),firstDay=new Date(year,month,1).getDay();
  const latestInMonth=[...model.monthRecords].sort((a,b)=>recordDate(b).localeCompare(recordDate(a)))[0];
  const selected=board.dataset.selected||recordDate(latestInMonth)||`${year}-${String(month+1).padStart(2,'0')}-${String(Math.min(now.getDate(),days)).padStart(2,'0')}`;
  board.dataset.selected=selected;
  const uniqueDays=new Set(model.monthRecords.map(recordDate).filter(Boolean)).size;
  let thirdLabel='기록일',thirdValue=`${uniqueDays}일`;
  if(domain==='workouts'){thirdLabel='총 운동 시간';thirdValue=`${Math.round(model.monthRecords.reduce((sum,r)=>sum+(Number(r.duration)||0),0))}분`;}
  else if(domain==='meals'){thirdLabel='총 섭취';thirdValue=`${Math.round(model.monthRecords.reduce((sum,r)=>sum+(Number(r.kcal)||0),0)).toLocaleString()} kcal`;}
  else if(domain==='runs'){thirdLabel='총 거리';thirdValue=`${model.monthRecords.reduce((sum,r)=>sum+(Number(r.distance)||0),0).toFixed(1)} km`;}
  else if(domain==='body'){const last=[...model.monthRecords].sort((a,b)=>recordDate(b).localeCompare(recordDate(a)))[0];thirdLabel='최근 체중';thirdValue=last?.weight?`${last.weight} kg`:'—';}
  const selectedRecords=model.byDay.get(selected)||[];
  const tabs=['workouts','meals','body','runs'].map(key=>`<button type="button" data-g4-history-domain="${key}" class="${key===domain?'active':''}">${historyLabel(key)}</button>`).join('');
  const cells=[];for(let i=0;i<firstDay;i++)cells.push('<span class="g4-cal-blank"></span>');
  for(let day=1;day<=days;day++){
    const date=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,count=model.byDay.get(date)?.length||0,isSelected=date===selected;
    cells.push(`<button type="button" data-g4-history-date="${date}" class="${isSelected?'selected':''}"><b>${day}</b>${count?`<i>${count}</i>`:''}</button>`);
  }
  board.innerHTML=`<div class="g4-history-tabs">${tabs}</div><div class="g4-history-month-head"><button type="button" data-g4-month="-1" aria-label="이전 달">‹</button><strong>${year}년 ${month+1}월</strong><button type="button" data-g4-month="1" aria-label="다음 달">›</button></div><div class="g4-history-week"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div><div class="g4-history-calendar">${cells.join('')}</div><div class="g4-history-day"><span>${selected}</span>${selectedRecords.length?selectedRecords.slice(0,3).map(record=>`<strong>${historyRecordLine(domain,record)}</strong>`).join(''):'<strong>이 날의 기록이 없습니다.</strong>'}</div><div class="g4-history-summary"><div><span>이번 달 기록</span><b>${model.monthRecords.length}</b></div><div><span>기록한 날</span><b>${uniqueDays}</b></div><div><span>${thirdLabel}</span><b>${thirdValue}</b></div></div>`;
  important(board,'padding','14px');important(board,'border-radius','22px');important(board,'background','linear-gradient(160deg,#111722,#0b0f16)');important(board,'border','1px solid rgba(255,255,255,.075)');
  const tabsEl=qs(board,'.g4-history-tabs');important(tabsEl,'display','grid');important(tabsEl,'grid-template-columns','repeat(4,1fr)');important(tabsEl,'gap','6px');important(tabsEl,'margin-bottom','14px');
  board.querySelectorAll('.g4-history-tabs button').forEach(button=>{important(button,'min-height','38px');important(button,'border-radius','11px');important(button,'font-size','10px');important(button,'background',button.classList.contains('active')?'rgba(111,114,255,.20)':'#0d1219');important(button,'color',button.classList.contains('active')?'#c8cbff':'#7d8694');important(button,'border','1px solid rgba(255,255,255,.065)');});
  const monthHead=qs(board,'.g4-history-month-head');important(monthHead,'display','grid');important(monthHead,'grid-template-columns','44px 1fr 44px');important(monthHead,'align-items','center');important(monthHead,'text-align','center');important(monthHead,'margin-bottom','10px');
  board.querySelectorAll('.g4-history-month-head button').forEach(button=>{important(button,'min-height','38px');important(button,'background','transparent');important(button,'border','0');important(button,'color','#c7cbd5');important(button,'font-size','22px');});
  const week=qs(board,'.g4-history-week');important(week,'display','grid');important(week,'grid-template-columns','repeat(7,1fr)');important(week,'text-align','center');important(week,'color','#68717f');important(week,'font-size','9px');important(week,'margin-bottom','5px');
  const cal=qs(board,'.g4-history-calendar');important(cal,'display','grid');important(cal,'grid-template-columns','repeat(7,1fr)');important(cal,'gap','4px');
  board.querySelectorAll('.g4-history-calendar button').forEach(button=>{important(button,'position','relative');important(button,'min-height','38px');important(button,'padding','0');important(button,'border-radius','10px');important(button,'border',button.classList.contains('selected')?'1px solid rgba(121,126,255,.7)':'1px solid transparent');important(button,'background',button.classList.contains('selected')?'rgba(98,101,255,.22)':'transparent');important(button,'color','#e8eaf0');important(button,'font-size','10px');});
  board.querySelectorAll('.g4-history-calendar i').forEach(dot=>{important(dot,'position','absolute');important(dot,'right','4px');important(dot,'bottom','3px');important(dot,'font-style','normal');important(dot,'font-size','7px');important(dot,'color','#7f86ff');});
  const day=qs(board,'.g4-history-day');important(day,'display','grid');important(day,'gap','5px');important(day,'margin-top','12px');important(day,'padding','11px');important(day,'border-radius','13px');important(day,'background','#0d1219');important(day,'font-size','10px');important(day,'color','#c7ccd6');
  const summary=qs(board,'.g4-history-summary');important(summary,'display','grid');important(summary,'grid-template-columns','repeat(3,minmax(0,1fr))');important(summary,'gap','7px');important(summary,'margin-top','10px');
  summary?.querySelectorAll('div').forEach(cell=>{important(cell,'display','grid');important(cell,'gap','4px');important(cell,'padding','10px 7px');important(cell,'border-radius','12px');important(cell,'background','#0d1219');important(cell,'text-align','center');});summary?.querySelectorAll('span').forEach(x=>important(x,'font-size','8px'));summary?.querySelectorAll('b').forEach(x=>{important(x,'font-size','15px');important(x,'color','#70d9bb');});
}
function progress(m){
  const head=qs(m,':scope > .page-head');if(head)important(head,'display','none');
  let board=qs(m,':scope > .g4-history-board');
  if(!board){board=document.createElement('section');board.className='g4-history-board';board.dataset.domain='workouts';const now=new Date();board.dataset.year=String(now.getFullYear());board.dataset.month=String(now.getMonth());m.prepend(board);}
  renderHistoryBoard(board);
  if(!board.dataset.bound){
    board.dataset.bound='1';board.addEventListener('click',event=>{
      const domain=event.target.closest?.('[data-g4-history-domain]');if(domain){board.dataset.domain=domain.dataset.g4HistoryDomain;delete board.dataset.selected;renderHistoryBoard(board);return;}
      const date=event.target.closest?.('[data-g4-history-date]');if(date){board.dataset.selected=date.dataset.g4HistoryDate;renderHistoryBoard(board);return;}
      const monthBtn=event.target.closest?.('[data-g4-month]');if(monthBtn){let y=Number(board.dataset.year),mo=Number(board.dataset.month)+Number(monthBtn.dataset.g4Month);if(mo<0){mo=11;y--;}if(mo>11){mo=0;y++;}board.dataset.year=String(y);board.dataset.month=String(mo);delete board.dataset.selected;renderHistoryBoard(board);}
    });
  }
  return true;
}
function settings(m){
  const head=qs(m,':scope > .page-head');if(head)important(head,'display','none');
  const stack=qs(m,'.settings-stack');if(!stack)return true;
  const state=readState(),profile=state?.profile||{},goal=profile.goal||state?.onboarding?.goal||'목표 설정';
  let profileCard=qs(m,':scope > .g4-settings-profile');
  if(!profileCard){profileCard=document.createElement('section');profileCard.className='g4-settings-profile';m.insertBefore(profileCard,stack);profileCard.addEventListener('click',event=>{if(event.target.closest?.('[data-g4-profile]'))window.GarangRouter?.navigate?.('profile',{source:'presentation-v4-settings',force:true});});}
  const initial=String(profile.name||'G').trim().slice(0,1).toUpperCase();
  profileCard.innerHTML=`<span>${initial}</span><div><strong>${profile.name||'GARANG 사용자'}</strong><small>${goal}</small></div><button type="button" data-g4-profile="1">프로필 관리 ›</button>`;
  important(profileCard,'display','grid');important(profileCard,'grid-template-columns','44px minmax(0,1fr) auto');important(profileCard,'align-items','center');important(profileCard,'gap','10px');important(profileCard,'padding','13px');important(profileCard,'border-radius','17px');important(profileCard,'background','#0f141c');important(profileCard,'border','1px solid rgba(255,255,255,.07)');
  const avatar=profileCard.firstElementChild;important(avatar,'display','grid');important(avatar,'place-items','center');important(avatar,'width','42px');important(avatar,'height','42px');important(avatar,'border-radius','50%');important(avatar,'background','linear-gradient(145deg,#6670ff,#2b3348)');important(avatar,'font-weight','800');
  const info=profileCard.children[1];important(info,'display','grid');important(info,'gap','3px');important(info.querySelector('strong'),'font-size','13px');important(info.querySelector('small'),'font-size','9px');important(info.querySelector('small'),'color','#798291');
  const button=profileCard.querySelector('button');important(button,'min-height','38px');important(button,'padding','0 8px');important(button,'border','0');important(button,'background','transparent');important(button,'color','#a8adff');important(button,'font-size','10px');
  important(stack,'display','grid');important(stack,'gap','8px');
  stack.querySelectorAll(':scope > .card').forEach(card=>{important(card,'margin','0');important(card,'border-radius','15px');important(card,'background','#0d1219');important(card,'box-shadow','none');});
  stack.querySelectorAll('.settings-row').forEach(row=>{important(row,'min-height','54px');important(row,'padding','10px 12px');important(row,'border-bottom','1px solid rgba(255,255,255,.055)');});
  stack.querySelectorAll('.settings-title').forEach(title=>{important(title,'padding','12px 12px 6px');});
  return true;
}
function cleanupRest(){
  const rest=document.getElementById('workoutExecutionRest');
  if(!rest||screen()==='workout')return;
  rest.classList.remove('g4-rest-portal');
}
function apply(){
  chrome();
  const m=main(),name=screen();
  if(!m||!name)return false;
  cleanupRest();markScreen(m,name);
  if(name==='today')return today(m);
  if(name==='workout')return workout(m);
  if(name==='nutrition')return nutrition(m);
  if(name==='body')return body(m);
  if(name==='coach')return coach(m);
  if(name==='progress')return progress(m);
  if(name==='settings')return settings(m);
  return true;
}
let queued=false;
function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{
    queued=false;
    apply();
    setTimeout(apply,80);
  });
}
for(const event of ['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:state-hydrated','garang:coach-mounted','garang:coach-message-rendered','garang:daily-workout-plan-ready','garang:workout-set-rows-rendered','garang:workout-session-started'])window.addEventListener(event,schedule,{passive:true});
new MutationObserver(mutations=>{
  if(mutations.some(m=>m.type==='attributes'&&m.target===document.documentElement&&m.attributeName==='lang'))schedule();
}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
document.addEventListener('DOMContentLoaded',schedule,{once:true});
schedule();
window.GarangPresentationV4=Object.freeze({version:VERSION,apply,schedule});
})();
